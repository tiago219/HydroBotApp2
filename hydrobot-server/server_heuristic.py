import cv2, time, threading, numpy as np
from typing import Optional, List
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

CAMERA_IP = "192.168.4.1"
STREAM_URL_FMT = "http://{}:81/stream"
SCORE_THRESHOLD = 0.60

app = FastAPI(title="HydroBot Fire (Heuristic)", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class CameraReader:
    def __init__(self, ip: str):
        self.ip = ip; self._cap=None; self._lock=threading.Lock()
        self._last=None; self._fps=0.0; self._run=False; self._th=None
    def start(self):
        if self._run: return
        self._run=True; self._th=threading.Thread(target=self._loop,daemon=True); self._th.start()
    def stop(self):
        self._run=False
        if self._th: self._th.join(timeout=2.0)
        if self._cap: self._cap.release(); self._cap=None
    def set_ip(self, ip:str):
        if ip==self.ip: return
        self.ip=ip; self.stop(); self.start()
    def _open(self):
        cap=cv2.VideoCapture(STREAM_URL_FMT.format(self.ip)); cap.set(cv2.CAP_PROP_BUFFERSIZE,1); return cap
    def _loop(self):
        self._cap=self._open()
        for _ in range(10):
            if self._cap and self._cap.isOpened(): break
            time.sleep(0.6); self._cap=self._open()
        frames=0; last=time.time()
        while self._run:
            if not self._cap or not self._cap.isOpened(): time.sleep(0.3); continue
            ok,frame=self._cap.read()
            if not ok or frame is None: time.sleep(0.03); continue
            with self._lock: self._last=frame
            frames+=1; now=time.time()
            if now-last>=1.0: self._fps=frames/(now-last); frames=0; last=now
    def get_latest(self): 
        with self._lock: return None if self._last is None else self._last.copy()
    def get_fps(self): return self._fps

reader=CameraReader(CAMERA_IP); reader.start()

class ConfigIn(BaseModel): camera_ip: str

def fire_score(frame):
    hsv=cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask=cv2.inRange(hsv,(5,80,120),(40,255,255))
    ratio=float(np.count_nonzero(mask))/float(mask.size)
    v_mean=float(np.mean(hsv[...,2]))/255.0
    return min(1.0, ratio*4.0 + v_mean*0.2)

def fire_boxes(frame):
    h,w=frame.shape[:2]; scl=min(640,w)
    rs=cv2.resize(frame,(scl,int(h*scl/w))); hsv=cv2.cvtColor(rs, cv2.COLOR_BGR2HSV)
    mask=cv2.inRange(hsv,(5,80,120),(40,255,255))
    k=np.ones((5,5),np.uint8)
    mask=cv2.morphologyEx(mask, cv2.MORPH_OPEN, k,1); mask=cv2.morphologyEx(mask, cv2.MORPH_DILATE, k,1)
    cnts,_=cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rx=w/float(scl); ry=h/float(rs.shape[0]); boxes=[]
    for c in cnts:
        x,y,bw,bh=cv2.boundingRect(c)
        if bw*bh<600: continue
        boxes.append([int(x*rx),int(y*ry),int(bw*rx),int(bh*ry)])
    return boxes

@app.get("/status")
def status(): 
    return {"ok":True,"camera_ip":reader.ip,"fps":round(reader.get_fps(),2),"has_frame":reader.get_latest() is not None,"model":"heuristic","ts":int(time.time()*1000)}

@app.post("/config")
def set_config(cfg:ConfigIn):
    reader.set_ip(cfg.camera_ip); return {"ok":True,"camera_ip":reader.ip}

@app.get("/snapshot")
def snapshot():
    f=reader.get_latest()
    if f is None: return {"ok":False,"error":"no frame"}
    ok,buf=cv2.imencode(".jpg",f,[int(cv2.IMWRITE_JPEG_QUALITY),85])
    if not ok: return {"ok":False,"error":"encode failed"}
    return Response(content=buf.tobytes(),media_type="image/jpeg")

@app.get("/detect")
def detect():
    f=reader.get_latest()
    if f is None: return {"ok":False,"error":"no frame"}
    s=fire_score(f); is_fire=bool(s>=SCORE_THRESHOLD)
    return {"ok":True,"isFire":is_fire,"score":round(float(s),3),"boxes":(fire_boxes(f) if is_fire else []),"threshold":SCORE_THRESHOLD,"ts":int(time.time()*1000)}

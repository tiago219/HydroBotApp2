import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { WebView } from "react-native-webview";

const PALETTE = { bg: "#000000", card: "#0d0d0d", border: "#1a1a1a", red: "#E53B2F", white: "#ffffff" };

// ajuste estes padrões se quiser
const DEFAULT_IP = "192.168.4.1";            // ESP32-CAM (AP)
const DEFAULT_SERVER = "http://192.168.4.2:8000"; // Servidor IA (PC no mesmo AP)

export default function CameraScreen() {
  // conexões
  const [ip, setIp] = useState(DEFAULT_IP);
  const [server, setServer] = useState(DEFAULT_SERVER);

  // estados ESP
  const [isChecking, setIsChecking] = useState(false);
  const [statusText, setStatusText] = useState<string>("—");
  const [ledOn, setLedOn] = useState<boolean>(false);
  const [pumpOn, setPumpOn] = useState<boolean>(false);

  // detecção
  const [detectOn, setDetectOn] = useState<boolean>(false);
  const [isFire, setIsFire] = useState<boolean>(false);
  const [fireScore, setFireScore] = useState<number>(0);

  // joystick (UI)
  const [joy, setJoy] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const webref = useRef<WebView>(null);

  // URLs do ESP
  const streamUrl = useMemo(() => `http://${ip}:81/stream`, [ip]);
  const statusUrl = useMemo(() => `http://${ip}/status`, [ip]);
  const ledUrl = useMemo(() => (on: boolean) => `http://${ip}/led?on=${on ? "1" : "0"}`, [ip]);
  const pumpUrl = useMemo(() => (on: boolean) => `http://${ip}/pump?on=${on ? "1" : "0"}`, [ip]);

  // consulta /status do ESP
  async function pingStatus() {
    try {
      setIsChecking(true);
      const r = await fetch(statusUrl, { method: "GET" });
      const j = await r.json();
      setLedOn(!!j.led);
      setPumpOn(!!j.pump);
      setStatusText(
        `OK • ip:${j.ip} • mode:${j.mode} • led:${j.led ? "on" : "off"} • pump:${j.pump ? "on" : "off"}`
      );
    } catch {
      setStatusText("Falha ao conectar. Confira o Wi-Fi HYDROBOT-CAM e o IP.");
    } finally {
      setIsChecking(false);
    }
  }

  async function toggleLed() {
    try {
      const t = !ledOn;
      await fetch(ledUrl(t));
      setLedOn(t);
    } catch {
      setStatusText("Erro ao alternar LED.");
    }
  }

  async function togglePump() {
    try {
      const t = !pumpOn;
      await fetch(pumpUrl(t));
      setPumpOn(t);
    } catch {
      setStatusText("Erro ao alternar bomba.");
    }
  }

  // ping periódico de status do ESP
  useEffect(() => {
    pingStatus();
    const id = setInterval(pingStatus, 5000);
    return () => clearInterval(id);
  }, [statusUrl]);

  // HTML simples para tocar MJPEG dentro da WebView
  const html = `
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
        <img src="${streamUrl}" style="width:100%;height:100%;object-fit:contain;" />
      </body>
    </html>
  `;

  // polling de /detect do servidor de IA
  useEffect(() => {
    if (!detectOn) return;
    let stop = false;
    const loop = async () => {
      try {
        const r = await fetch(`${server}/detect`, { method: "GET" });
        const j = await r.json();
        if (!stop && j && j.ok) {
          setIsFire(!!j.isFire);
          setFireScore(Number(j.score || 0));
        }
      } catch {
        if (!stop) {
          setIsFire(false);
          setFireScore(0);
        }
      } finally {
        if (!stop) setTimeout(loop, 500); // ~2 Hz
      }
    };
    loop();
    return () => {
      stop = true;
    };
  }, [detectOn, server]);

  // joystick (UI)
  const RADIUS = 64;
  const KNOB_R = 22;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        let nx = g.dx / RADIUS;
        let ny = g.dy / RADIUS;
        const len = Math.hypot(nx, ny);
        if (len > 1) {
          nx /= len;
          ny /= len;
        }
        setJoy({ x: nx, y: -ny }); // y positivo para cima
      },
      onPanResponderRelease: () => {
        setDragging(false);
        setJoy({ x: 0, y: 0 });
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        setJoy({ x: 0, y: 0 });
      },
    })
  ).current;

  const knobLeft = joy.x * RADIUS;
  const knobTop = -joy.y * RADIUS;

  return (
    <View style={styles.container}>
      {/* Linha: ESP + LED + BOMBA */}
      <View style={styles.topbar}>
        <Text style={styles.label}>ESP IP:</Text>
        <TextInput
          value={ip}
          onChangeText={setIp}
          placeholder="192.168.4.1"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          keyboardType="numeric"
        />
        <Pressable onPress={pingStatus} style={styles.btn}>
          <Text style={styles.btnText}>{isChecking ? "..." : "Testar"}</Text>
        </Pressable>

        <Pressable onPress={toggleLed} style={[styles.btn, ledOn ? styles.btnOn : styles.btnOff]}>
          <Text style={styles.btnText}>{ledOn ? "LED ON" : "LED OFF"}</Text>
        </Pressable>

        <Pressable onPress={togglePump} style={[styles.btn, pumpOn ? styles.btnOn : styles.btnOff]}>
          <Text style={styles.btnText}>{pumpOn ? "BOMBA ON" : "BOMBA OFF"}</Text>
        </Pressable>
      </View>

      {/* Linha: Servidor IA + Detectar */}
      <View style={styles.statusRow}>
        <Text style={styles.label}>Servidor:</Text>
        <TextInput
          value={server}
          onChangeText={setServer}
          placeholder="http://192.168.4.2:8000"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable onPress={() => setDetectOn((v) => !v)} style={[styles.btn, detectOn ? styles.btnOn : styles.btnOff]}>
          <Text style={styles.btnText}>{detectOn ? "Detectando" : "Detectar"}</Text>
        </Pressable>
      </View>

      {/* Status curto + recarregar stream */}
      <View style={[styles.statusRow, { paddingTop: 4, paddingBottom: 8 }]}>
        <Text numberOfLines={2} style={styles.status}>
          {statusText}
        </Text>
        <Pressable onPress={() => webref.current?.reload()} style={[styles.btn, { marginLeft: 8 }]}>
          <Text style={styles.btnText}>Recarregar</Text>
        </Pressable>
      </View>

      {/* Banner de fogo */}
      {detectOn && (
        <View style={[styles.fireBanner, isFire ? styles.fireOn : styles.fireOff]}>
          <Text style={styles.fireText}>
            {isFire ? `🔥 FOGO • score ${fireScore.toFixed(2)}` : `Sem fogo • score ${fireScore.toFixed(2)}`}
          </Text>
        </View>
      )}

      {/* Vídeo MJPEG */}
      <WebView
        ref={webref}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        allowFileAccess
        allowingReadAccessToURL={"*"}
        javaScriptEnabled
        domStorageEnabled
        allowUniversalAccessFromFileURLs
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />

      {/* Joystick overlay (UI) */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={[styles.joyWrap, { width: RADIUS * 2 + 24, height: RADIUS * 2 + 24 }]} {...pan.panHandlers}>
          <View style={[styles.joyBase, { width: RADIUS * 2, height: RADIUS * 2, borderRadius: RADIUS }]} />
          <View
            style={[
              styles.joyKnob,
              {
                width: KNOB_R * 2,
                height: KNOB_R * 2,
                borderRadius: KNOB_R,
                transform: [{ translateX: knobLeft }, { translateY: knobTop }],
                opacity: dragging ? 1 : 0.9,
              },
            ]}
          />
          <Text style={styles.joyText}>
            x: {joy.x.toFixed(2)}   y: {joy.y.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: PALETTE.card,
  },
  label: { color: "#cfd3d8", fontSize: 12 },
  input: {
    backgroundColor: PALETTE.bg,
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2a4d",
    minWidth: 110,
  },
  btn: {
    backgroundColor: "#2b48ff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnOn: { backgroundColor: "#17a34a" },
  btnOff: { backgroundColor: "#374151" },
  btnText: { color: "white", fontWeight: "600" },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#0f1730",
  },
  status: { color: "#cbd5ff", flex: 1, fontSize: 12 },

  fireBanner: { alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  fireOn: { backgroundColor: "#8b0000" },
  fireOff: { backgroundColor: "#223" },
  fireText: { color: "white", fontWeight: "800" },

  web: { flex: 1, backgroundColor: "black" },

  // Joystick
  joyWrap: { position: "absolute", bottom: 24, left: 24, alignItems: "center", justifyContent: "center" },
  joyBase: { position: "absolute", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 2, borderColor: "rgba(255,255,255,0.14)" },
  joyKnob: { position: "absolute", backgroundColor: "rgba(43,72,255,0.9)", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" },
  joyText: { position: "absolute", bottom: -22, color: "#cbd5ff", fontSize: 12 },
});
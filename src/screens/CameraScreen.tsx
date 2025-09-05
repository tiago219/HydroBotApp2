import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { WebView } from "react-native-webview";

const DEFAULT_IP = "192.168.4.1"; // IP padrão do AP do ESP32-CAM

export default function CameraScreen() {
  const [ip, setIp] = useState(DEFAULT_IP);
  const [isChecking, setIsChecking] = useState(false);
  const [statusText, setStatusText] = useState<string>("—");
  const [ledOn, setLedOn] = useState<boolean>(false);

  // Joystick state (apenas UI por enquanto)
  const [joy, setJoy] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const webref = useRef<WebView>(null);

  const streamUrl = useMemo(() => `http://${ip}:81/stream`, [ip]);
  const statusUrl = useMemo(() => `http://${ip}/status`, [ip]);
  const ledUrl = useMemo(
    () => (on: boolean) => `http://${ip}/led?on=${on ? "1" : "0"}`,
    [ip]
  );

  async function pingStatus() {
    try {
      setIsChecking(true);
      const r = await fetch(statusUrl, { method: "GET" });
      const j = await r.json();
      setLedOn(!!j.led);
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
      const target = !ledOn;
      await fetch(ledUrl(target));
      setLedOn(target);
      setStatusText((s) => `LED ${target ? "ligado" : "desligado"} • ` + s.replace(/^LED .* • /, ""));
    } catch {
      // mantém estado anterior se falhar
      setStatusText("Erro ao alternar LED.");
    }
  }

  useEffect(() => {
    pingStatus();
    const id = setInterval(pingStatus, 5000);
    return () => clearInterval(id);
  }, [statusUrl]);

  // HTML simples p/ MJPEG
  const html = `
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
        <img src="${streamUrl}" style="width:100%;height:100%;object-fit:contain;" />
      </body>
    </html>
  `;

  // ===== Joystick (UI) =====
  const RADIUS = 64; // raio visual do círculo base
  const KNOB_R = 22; // raio do knob

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        // normaliza para [-1,1]
        let nx = g.dx / RADIUS;
        let ny = g.dy / RADIUS;
        // limita ao círculo
        const len = Math.hypot(nx, ny);
        if (len > 1) {
          nx /= len;
          ny /= len;
        }
        // y invertido (para cima positivo)
        setJoy({ x: nx, y: -ny });
      },
      onPanResponderRelease: () => {
        setDragging(false);
        setJoy({ x: 0, y: 0 }); // volta para centro
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        setJoy({ x: 0, y: 0 });
      },
    })
  ).current;

  // posição do knob em px (UI)
  const knobLeft = joy.x * RADIUS;
  const knobTop = -joy.y * RADIUS;

  return (
    <View style={styles.container}>
      {/* Barra de controle */}
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

        <Pressable
          onPress={toggleLed}
          style={[styles.btn, ledOn ? styles.btnOn : styles.btnOff]}
        >
          <Text style={styles.btnText}>{ledOn ? "LED ON" : "LED OFF"}</Text>
        </Pressable>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        {isChecking ? <ActivityIndicator /> : null}
        <Text numberOfLines={2} style={styles.status}>{statusText}</Text>
        <Pressable onPress={() => webref.current?.reload()} style={[styles.btn, { marginLeft: 8 }]}>
          <Text style={styles.btnText}>Recarregar</Text>
        </Pressable>
      </View>

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

      {/* Joystick overlay (UI apenas) */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View
          style={[styles.joyWrap, { width: RADIUS * 2 + 24, height: RADIUS * 2 + 24 }]}
          {...pan.panHandlers}
        >
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
  container: { flex: 1, backgroundColor: "#0b1220" },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#111a33",
  },
  label: { color: "#9fb3ff", fontSize: 12 },
  input: {
    flex: 1,
    backgroundColor: "#0b1220",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2a4d",
  },
  btn: {
    backgroundColor: "#2b48ff",
    paddingHorizontal: 12,
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
  web: { flex: 1, backgroundColor: "black" },

  // Joystick
  joyWrap: {
    position: "absolute",
    bottom: 24,
    left: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  joyBase: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.14)",
  },
  joyKnob: {
    position: "absolute",
    backgroundColor: "rgba(43,72,255,0.9)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  joyText: {
    position: "absolute",
    bottom: -22,
    color: "#cbd5ff",
    fontSize: 12,
  },
});
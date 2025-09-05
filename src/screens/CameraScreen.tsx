import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

const DEFAULT_IP = "192.168.4.1"; // IP do AP do ESP32-CAM

export default function CameraScreen() {
  const [ip, setIp] = useState(DEFAULT_IP);
  const [isChecking, setIsChecking] = useState(false);
  const [statusText, setStatusText] = useState<string>("—");
  const webref = useRef<WebView>(null);

  const streamUrl = useMemo(() => `http://${ip}:81/stream`, [ip]);
  const statusUrl = useMemo(() => `http://${ip}/status`, [ip]);

  async function pingStatus() {
    try {
      setIsChecking(true);
      const r = await fetch(statusUrl, { method: "GET" });
      const j = await r.json();
      setStatusText(
        `OK • ip:${j.ip} • mode:${j.mode} • led:${j.led ? "on" : "off"} • pump:${j.pump ? "on" : "off"}`
      );
    } catch (e: any) {
      setStatusText("Falha ao conectar. Confira o Wi-Fi HYDROBOT-CAM e o IP.");
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    // tenta pingar ao entrar
    pingStatus();
    // repete a cada 5s (leve)
    const id = setInterval(pingStatus, 5000);
    return () => clearInterval(id);
  }, [statusUrl]);

  // HTML simples para exibir MJPEG ocupando a tela
  const html = `
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
        <img src="${streamUrl}" style="width:100%;height:100%;object-fit:contain;" />
      </body>
    </html>
  `;

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
          <Text style={styles.btnText}>Testar</Text>
        </Pressable>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        {isChecking ? <ActivityIndicator /> : null}
        <Text numberOfLines={2} style={styles.status}>
          {statusText}
        </Text>
        <Pressable
          onPress={() => webref.current?.reload()}
          style={[styles.btn, { marginLeft: 8 }]}
        >
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
});

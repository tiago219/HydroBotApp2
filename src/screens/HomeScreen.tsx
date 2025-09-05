import { View, Text, StyleSheet, Pressable, Dimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../../App";

type Nav = BottomTabNavigationProp<TabParamList>;

const W = Dimensions.get("window").width;
const CARD = W / 2 - 28;

const PALETTE = {
  bg: "#000000",
  card: "#0d0d0d",
  border: "#1a1a1a",
  red: "#E53B2F",
  redSoft: "#FF5A4D",
  white: "#FFFFFF",
  textSoft: "#E6E6E6",
};

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const tiles = [
    { key: "Camera" as const, label: "Câmera", icon: "videocam" as const, color: PALETTE.red },
    { key: "Dashboard" as const, label: "Dashboard", icon: "pulse" as const, color: PALETTE.redSoft },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>HydroBot</Text>
        <Text style={styles.sub}>Monitoramento e Controle</Text>
      </View>

      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => navigation.navigate(t.key)}
            style={({ pressed }) => [
              styles.tile,
              { width: CARD, height: CARD, borderColor: t.color },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={[styles.tileInner, { backgroundColor: t.color }]}>
              <Ionicons name={t.icon} size={42} color={PALETTE.white} />
            </View>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>Use o rodapé para navegar entre as seções</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg, padding: 18 },
  hero: { alignItems: "center", marginTop: 6, marginBottom: 16 },
  logo: { width: 120, height: 120, marginBottom: 6 },
  title: { color: PALETTE.white, fontSize: 24, fontWeight: "800" },
  sub: { color: PALETTE.textSoft, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 },
  tile: { borderRadius: 18, borderWidth: 2, backgroundColor: PALETTE.card, overflow: "hidden" },
  tileInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  tileLabel: {
    position: "absolute",
    bottom: 8,
    width: "100%",
    textAlign: "center",
    color: PALETTE.white,
    fontWeight: "700",
    fontSize: 16,
  },
  hint: { textAlign: "center", color: "#9c9c9c", marginTop: 12, fontSize: 12 },
});

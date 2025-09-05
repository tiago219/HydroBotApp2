import { View, Text, StyleSheet } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>
      <Text style={styles.sub}>Preferências do app e conexões.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  title: { color: "white", fontSize: 22, fontWeight: "700" },
  sub: { color: "#9fb3ff", marginTop: 6 },
});
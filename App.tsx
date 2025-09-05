import { NavigationContainer, DefaultTheme, Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./src/screens/HomeScreen";
import CameraScreen from "./src/screens/CameraScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

export type TabParamList = {
  Home: undefined;
  Camera: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const PALETTE = {
  bg: "#000000",
  card: "#0d0d0d",
  border: "#1a1a1a",
  red: "#E53B2F",
  redSoft: "#FF5A4D",
  white: "#FFFFFF",
};

const DarkThemeHB: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: PALETTE.bg,
    primary: PALETTE.red,
    card: PALETTE.card,
    text: PALETTE.white,
    border: PALETTE.border,
    notification: PALETTE.red,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={DarkThemeHB}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: PALETTE.card },
          headerTintColor: PALETTE.white,
          tabBarStyle: { backgroundColor: PALETTE.bg, borderTopColor: PALETTE.border },
          tabBarActiveTintColor: PALETTE.red,
          tabBarInactiveTintColor: "#9c9c9c",
          tabBarIcon: ({ color, size }) => {
            const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
              Home: "home",
              Camera: "videocam",
              Dashboard: "pulse",
              Settings: "settings",
            };
            return <Ionicons name={icons[route.name as keyof TabParamList]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Início" }} />
        <Tab.Screen name="Camera" component={CameraScreen} options={{ title: "Câmera" }} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Ajustes" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
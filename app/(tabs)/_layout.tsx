import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === "ios" ? 28 : 12);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#FF6B35",
                tabBarInactiveTintColor: "#6E6E85",
                tabBarStyle: {
                    position: "absolute",
                    borderTopWidth: 0,
                    elevation: 0,
                    backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(10, 10, 15, 0.95)",
                    height: 60 + bottomPadding,
                    paddingBottom: bottomPadding,
                    paddingTop: 8,
                },
                tabBarBackground: () =>
                    Platform.OS === "ios" ? (
                        <BlurView
                            intensity={80}
                            tint="dark"
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderTopWidth: 0.5,
                                borderTopColor: "rgba(255, 255, 255, 0.08)",
                            }}
                        />
                    ) : (
                        <View
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(10, 10, 15, 0.97)",
                                borderTopWidth: 0.5,
                                borderTopColor: "rgba(255, 255, 255, 0.06)",
                            }}
                        />
                    ),
                tabBarLabelStyle: {
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Recipes",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="book-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="collections"
                options={{
                    title: "Collections",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="folder-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

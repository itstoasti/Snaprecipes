import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { isDark, colors } = useTheme();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === "ios" ? 28 : 12);

    const hairline = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(28, 25, 20, 0.08)";

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#FF6B35",
                tabBarInactiveTintColor: colors.textFaint,
                tabBarStyle: {
                    position: "absolute",
                    borderTopWidth: 0,
                    elevation: 0,
                    backgroundColor: Platform.OS === "ios" ? "transparent" : colors.tabBarBg,
                    height: 60 + bottomPadding,
                    paddingBottom: bottomPadding,
                    paddingTop: 8,
                },
                tabBarBackground: () =>
                    Platform.OS === "ios" ? (
                        <BlurView
                            intensity={80}
                            tint={isDark ? "dark" : "light"}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderTopWidth: 0.5,
                                borderTopColor: hairline,
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
                                backgroundColor: colors.tabBarBg,
                                borderTopWidth: 0.5,
                                borderTopColor: hairline,
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
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="recipes"
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
                    title: "Hub",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
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

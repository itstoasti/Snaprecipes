import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import * as SecureStore from "expo-secure-store";
import {
    DarkTheme,
    DefaultTheme,
    type Theme as NavigationTheme,
} from "@react-navigation/native";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCE_STORE = "user_theme_preference_v1";

export interface ThemePalette {
    bg: string;
    card: string;
    elevated: string;
    border: string;
    hairline: string;
    text: string;
    textSecondary: string;
    textFaint: string;
    textOnAccent: string;
    accent: string;
    success: string;
    danger: string;
    inputBg: string;
    placeholder: string;
    overlay: string;
    tabBarBg: string;
    headerBg: string;
    statusBar: "light" | "dark";
}

const darkPalette: ThemePalette = {
    bg: "#0A0A0F",
    card: "#0F0F18",
    elevated: "#1A1A26",
    border: "#2D2D3D",
    hairline: "rgba(255, 255, 255, 0.06)",
    text: "#FFFFFF",
    textSecondary: "#9D9DB0",
    textFaint: "#6E6E85",
    textOnAccent: "#FFFFFF",
    accent: "#FF6B35",
    success: "#34D399",
    danger: "#FF6B6B",
    inputBg: "#0A0A0F",
    placeholder: "#6E6E85",
    overlay: "rgba(0, 0, 0, 0.6)",
    tabBarBg: "rgba(10, 10, 15, 0.95)",
    headerBg: "#0A0A0F",
    statusBar: "light",
};

const lightPalette: ThemePalette = {
    bg: "#FDFBF7",
    card: "#F7F4EB",
    elevated: "#EFEBE0",
    border: "#E2DDD0",
    hairline: "rgba(28, 25, 20, 0.08)",
    text: "#1C1914",
    textSecondary: "#5C584E",
    textFaint: "#8E8A79",
    textOnAccent: "#FFFFFF",
    accent: "#FF6B35",
    success: "#10B981",
    danger: "#EF4444",
    inputBg: "#FDFBF7",
    placeholder: "#8E8A79",
    overlay: "rgba(28, 25, 20, 0.4)",
    tabBarBg: "rgba(253, 251, 247, 0.95)",
    headerBg: "#FDFBF7",
    statusBar: "dark",
};

interface ThemeContextValue {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
    isDark: boolean;
    colors: ThemePalette;
    navTheme: NavigationTheme;
}

const ThemeContext = createContext<ThemeContextValue>({
    preference: "system",
    setPreference: () => {},
    isDark: true,
    colors: darkPalette,
    navTheme: DarkTheme,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>("system");
    const systemScheme = useSystemColorScheme();
    const { setColorScheme } = useNativeWindColorScheme();

    useEffect(() => {
        SecureStore.getItemAsync(THEME_PREFERENCE_STORE)
            .then((value) => {
                if (value === "light" || value === "dark" || value === "system") {
                    setPreferenceState(value);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        try {
            setColorScheme(preference);
        } catch {
            // CSS not processed yet (e.g. tests); safe to ignore
        }
    }, [preference, setColorScheme]);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        SecureStore.setItemAsync(THEME_PREFERENCE_STORE, next).catch(() => {});
    }, []);

    const isDark =
        preference === "dark" ||
        (preference === "system" && (systemScheme ?? "light") === "dark");

    const colors = isDark ? darkPalette : lightPalette;

    const navTheme = useMemo<NavigationTheme>(() => {
        const base = isDark ? DarkTheme : DefaultTheme;
        return {
            ...base,
            colors: {
                ...base.colors,
                primary: colors.accent,
                background: colors.bg,
                card: colors.card,
                text: colors.text,
                border: colors.border,
            },
        };
    }, [isDark, colors]);

    const value = useMemo(
        () => ({ preference, setPreference, isDark, colors, navTheme }),
        [preference, setPreference, isDark, colors, navTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    return useContext(ThemeContext);
}

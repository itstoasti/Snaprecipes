import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useColorScheme as useSystemColorScheme, AppState, AppStateStatus, Appearance } from "react-native";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import * as SecureStore from "expo-secure-store";
import { Paths, File } from "expo-file-system";
import * as SystemUI from "expo-system-ui";
import {
    DarkTheme,
    DefaultTheme,
    type Theme as NavigationTheme,
} from "@react-navigation/native";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCE_STORE = "user_theme_preference_v1";

const themeFile = new File(Paths.document, "theme_preference_v2.json");

// In-memory module-level cache for instantaneous access across screens & tab switches
let memoryThemeCache: ThemePreference | null = null;

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

async function readStoredTheme(): Promise<ThemePreference> {
    if (memoryThemeCache) return memoryThemeCache;

    // 1. Check local FileSystem storage (100% reliable persistent file)
    try {
        if (themeFile.exists) {
            const content = await themeFile.text();
            const parsed = JSON.parse(content);
            if (parsed?.preference === "light" || parsed?.preference === "dark" || parsed?.preference === "system") {
                memoryThemeCache = parsed.preference;
                return parsed.preference;
            }
        }
    } catch (e) {
        console.warn("FileSystem theme read warning:", e);
    }

    // 2. Check SecureStore as secondary
    try {
        const value = await SecureStore.getItemAsync(THEME_PREFERENCE_STORE);
        if (value === "light" || value === "dark" || value === "system") {
            memoryThemeCache = value;
            return value;
        }
    } catch (e) {
        console.warn("SecureStore theme read warning:", e);
    }

    return "system";
}

async function writeStoredTheme(next: ThemePreference): Promise<void> {
    memoryThemeCache = next;

    // 1. Write to FileSystem
    try {
        await themeFile.write(JSON.stringify({ preference: next, timestamp: Date.now() }));
    } catch (e) {
        console.warn("FileSystem theme write error:", e);
    }

    // 2. Write to SecureStore
    try {
        await SecureStore.setItemAsync(THEME_PREFERENCE_STORE, next);
    } catch (e) {
        console.warn("SecureStore theme write error:", e);
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(memoryThemeCache || "system");
    const systemScheme = useSystemColorScheme();
    const { setColorScheme } = useNativeWindColorScheme();

    // 1. Initial load from persistent storage
    useEffect(() => {
        readStoredTheme().then((val) => {
            setPreferenceState(val);
        });
    }, []);

    // 2. React Native Appearance Listener for System Mode
    const [liveSystemScheme, setLiveSystemScheme] = useState<"light" | "dark">(
        systemScheme === "dark" ? "dark" : "light"
    );

    useEffect(() => {
        if (systemScheme) {
            setLiveSystemScheme(systemScheme === "dark" ? "dark" : "light");
        }
    }, [systemScheme]);

    useEffect(() => {
        const listener = Appearance.addChangeListener(({ colorScheme }) => {
            if (colorScheme) {
                setLiveSystemScheme(colorScheme === "dark" ? "dark" : "light");
            }
        });
        return () => listener.remove();
    }, []);

    // Compute active dark mode state
    const isDark =
        preference === "dark" ||
        (preference === "system" && liveSystemScheme === "dark");

    const colors = isDark ? darkPalette : lightPalette;

    // 3. Keep NativeWind and SystemUI strictly synchronized with isDark & preference
    useEffect(() => {
        try {
            // Set explicit light/dark to NativeWind so classes like dark:bg-surface-950 stay 100% in sync
            setColorScheme(isDark ? "dark" : "light");
        } catch (e) {
            // NativeWind setup fallback
        }
        try {
            SystemUI.setBackgroundColorAsync(colors.bg);
        } catch (e) {
            // SystemUI fallback
        }
    }, [isDark, preference, colors.bg, setColorScheme]);

    // 4. AppState listener: re-verify stored state on app resume
    useEffect(() => {
        const handleAppStateChange = async (nextState: AppStateStatus) => {
            if (nextState === "active") {
                const stored = await readStoredTheme();
                if (stored !== preference) {
                    setPreferenceState(stored);
                }
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);
        return () => sub.remove();
    }, [preference]);

    // 5. Setter function
    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        writeStoredTheme(next);
    }, []);

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

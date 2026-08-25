import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { View, useColorScheme as useSystemColorScheme, AppState, AppStateStatus, Appearance } from "react-native";
import { vars, colorScheme as nwColorScheme } from "nativewind";
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

// CSS variable tokens consumed by NativeWind classes (bg-surface-*, text-white/ink).
// These mirror global.css but are driven by React state (isDark) so every mounted
// screen re-resolves deterministically on theme change — no reliance on
// NativeWind's Appearance-based dark toggle, which is unreliable on native.
const lightCssVars = {
    "--surface-950": "253 251 247",
    "--surface-900": "247 244 235",
    "--surface-800": "239 235 224",
    "--surface-700": "226 221 208",
    "--surface-600": "178 175 161",
    "--surface-500": "142 138 121",
    "--surface-400": "92 88 78",
    "--surface-300": "42 38 32",
    "--surface-200": "28 25 20",
    "--surface-100": "19 17 9",
    "--surface-50": "12 11 7",
    "--color-ink": "28 25 20",
};

const darkCssVars = {
    "--surface-950": "10 10 15",
    "--surface-900": "15 15 24",
    "--surface-800": "26 26 38",
    "--surface-700": "45 45 61",
    "--surface-600": "74 74 94",
    "--surface-500": "110 110 133",
    "--surface-400": "157 157 176",
    "--surface-300": "200 200 212",
    "--surface-200": "225 225 234",
    "--surface-100": "240 240 245",
    "--surface-50": "248 248 252",
    "--color-ink": "255 255 255",
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

function isValidPreference(value: unknown): value is ThemePreference {
    return value === "light" || value === "dark" || value === "system";
}

// Synchronous read: memory cache -> durable file -> SecureStore.
// Returns null when nothing is stored or reads fail (caller must not treat
// failure as "system", or a user's choice silently reverts).
function readStoredThemeSync(): ThemePreference | null {
    if (memoryThemeCache) return memoryThemeCache;

    try {
        if (themeFile.exists) {
            const parsed = JSON.parse(themeFile.textSync());
            if (isValidPreference(parsed?.preference)) {
                memoryThemeCache = parsed.preference;
                return parsed.preference;
            }
        }
    } catch (e) {
        console.warn("FileSystem theme read warning:", e);
    }

    try {
        const value = SecureStore.getItem(THEME_PREFERENCE_STORE);
        if (isValidPreference(value)) {
            memoryThemeCache = value;
            return value;
        }
    } catch (e) {
        console.warn("SecureStore theme read warning:", e);
    }

    return null;
}

// Synchronous primary write (durable file) + SecureStore mirror.
function writeStoredTheme(next: ThemePreference): void {
    memoryThemeCache = next;

    try {
        themeFile.write(JSON.stringify({ preference: next, timestamp: Date.now() }));
    } catch (e) {
        console.warn("FileSystem theme write error:", e);
    }

    try {
        SecureStore.setItem(THEME_PREFERENCE_STORE, next);
    } catch (e) {
        console.warn("SecureStore theme write error:", e);
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(
        () => readStoredThemeSync() ?? "system"
    );
    const systemScheme = useSystemColorScheme();
    const [liveSystemScheme, setLiveSystemScheme] = useState<"light" | "dark">(
        systemScheme === "dark" ? "dark" : "light"
    );

    // Asynchronous initial check from SecureStore in case synchronous read was not ready
    useEffect(() => {
        SecureStore.getItemAsync(THEME_PREFERENCE_STORE).then((stored) => {
            if (isValidPreference(stored) && stored !== preference) {
                setPreferenceState(stored);
            }
        }).catch(() => {});
    }, []);

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

    // Synchronize NativeWind's global stylesheet class with the resolved dark mode state.
    // This ensures that all components across all stack screens and native boundaries
    // correctly evaluate .dark:root vs :root tokens without relying on React tree context.
    useEffect(() => {
        try {
            nwColorScheme.set(isDark ? "dark" : "light");
        } catch (e) {
            console.warn("NativeWind colorScheme sync warning:", e);
        }
    }, [isDark]);

    // Keep native app-level appearance (system chrome, alerts, keyboards) and
    // the OS window background in sync with the resolved theme.
    useEffect(() => {
        try {
            Appearance.setColorScheme(preference === "system" ? null : preference);
        } catch (e) {
            // Older OS versions may not support overriding the scheme
        }
        try {
            SystemUI.setBackgroundColorAsync(colors.bg);
        } catch (e) {
            // SystemUI fallback
        }
    }, [preference, colors.bg]);

    // Re-verify stored state on app resume (covers separate processes such as
    // the iOS share extension). Never revert on a failed read.
    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState !== "active") return;
            memoryThemeCache = null;
            const stored = readStoredThemeSync();
            if (stored && stored !== preference) {
                setPreferenceState(stored);
            } else {
                SecureStore.getItemAsync(THEME_PREFERENCE_STORE).then((val) => {
                    if (isValidPreference(val) && val !== preference) {
                        setPreferenceState(val);
                    }
                }).catch(() => {});
            }
        };

        const sub = AppState.addEventListener("change", handleAppStateChange);
        return () => sub.remove();
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        writeStoredTheme(next);
        try {
            const nextDark = next === "dark" || (next === "system" && liveSystemScheme === "dark");
            nwColorScheme.set(nextDark ? "dark" : "light");
        } catch (e) {
            // non-blocking
        }
    }, [liveSystemScheme]);

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

    // Single source of truth for every NativeWind surface/ink class in the app:
    // CSS variables are supplied from React state, so a theme change re-renders
    // all mounted screens atomically (no frozen dark/light mixture).
    const themeVars = useMemo(() => vars(isDark ? darkCssVars : lightCssVars), [isDark]);

    return (
        <ThemeContext.Provider value={value}>
            <View style={[{ flex: 1 }, themeVars]}>{children}</View>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

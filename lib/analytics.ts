import * as Amplitude from "@amplitude/analytics-react-native";
import { supabase } from "@/lib/supabase";

const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || "";

let isInitialized = false;

/**
 * Initialize Amplitude analytics.
 * Call once in the root layout on mount.
 * If the API key is missing, events are logged to the console instead.
 */
export function initAnalytics(): void {
    if (isInitialized) return;

    if (AMPLITUDE_API_KEY) {
        Amplitude.init(AMPLITUDE_API_KEY, undefined, {
            flushQueueSize: 10,
            flushIntervalMillis: 15000,
        });
        console.log("[Analytics] Amplitude initialized");
    } else {
        console.log("[Analytics] No API key found – events will be logged to console only");
    }

    // Identify user when auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            identifyUser(session.user.id, { email: session.user.email || undefined });
        }
    });

    // Also attempt to identify immediately if a session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            identifyUser(session.user.id, { email: session.user.email || undefined });
        }
    });

    isInitialized = true;
}

/**
 * Associate the current device with a known user ID.
 */
export function identifyUser(userId: string, properties?: Record<string, any>): void {
    if (AMPLITUDE_API_KEY) {
        Amplitude.setUserId(userId);
        if (properties) {
            const identify = new Amplitude.Identify();
            Object.entries(properties).forEach(([key, value]) => {
                if (value !== undefined) {
                    identify.set(key, value);
                }
            });
            Amplitude.identify(identify);
        }
    }
    if (__DEV__) {
        console.log(`[Analytics] Identify user: ${userId}`, properties);
    }
}

/**
 * Track a custom event.
 * In development, events are always logged to the console for debugging.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (AMPLITUDE_API_KEY) {
        Amplitude.track(eventName, properties);
    }
    if (__DEV__) {
        console.log(`[Analytics] Event: ${eventName}`, properties || "");
    }
}

/**
 * Track a screen view event. Called automatically by the root layout
 * when navigation segments change.
 */
export function trackScreenView(screenName: string): void {
    trackEvent("screen_view", { screen_name: screenName });
}

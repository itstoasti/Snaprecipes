import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';
import { initialSync } from '@/lib/sync';
import Constants from 'expo-constants';

const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "";
const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";

interface RevenueCatContextState {
    isPro: boolean;
    hasActiveEntitlements: boolean;
    customerInfo: CustomerInfo | null;
    currentOffering: PurchasesOffering | null;
    isReady: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextState>({
    isPro: false,
    hasActiveEntitlements: false,
    customerInfo: null,
    currentOffering: null,
    isReady: false,
});

export const useRevenueCat = () => useContext(RevenueCatContext);

// Flag to track if we've already configured to prevent hot-reload/strict mode double calls
let isConfigured = false;

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [session, setSession] = useState<any>(null);

    // 1. Initial configuration & Auth Tracking
    useEffect(() => {
        // Track Supabase session for Expo Go "Virtual Pro" mode
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        const init = async () => {
            // Check if we are in Expo Go
            const isExpoGo = Constants.appOwnership === 'expo';

            if (isExpoGo) {
                console.log("Expo Go app detected. RevenueCat native features unavailable.");
                // We do NOT provide mock offerings here to preserve production integrity.
                // The paywall will correctly show its "Loading..." state.
                setIsReady(true);
                return;
            }

            try {
                if (!isConfigured) {
                    if (Platform.OS === 'android') {
                        Purchases.configure({ apiKey: API_KEY_ANDROID });
                    } else if (Platform.OS === 'ios') {
                        Purchases.configure({ apiKey: API_KEY_IOS });
                    }
                    isConfigured = true;
                }

                // Fetch initial data
                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);

                const offerings = await Purchases.getOfferings();
                if (offerings.current !== null) {
                    setCurrentOffering(offerings.current);
                }
            } catch (e) {
                console.warn("Failed to initialize RevenueCat", e);
            } finally {
                setIsReady(true);
            }
        };

        init();
        return () => authSub.unsubscribe();
    }, []);

    // 2. Auth state synchronization (Native only)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const isExpoGo = Constants.appOwnership === 'expo';
            if (isExpoGo) return; // Skip RevenueCat sync in Expo Go

            if (session?.user?.id) {
                try {
                    const { customerInfo } = await Purchases.logIn(session.user.id);
                    setCustomerInfo(customerInfo);
                } catch (e) {
                    console.error("RevenueCat login error:", e);
                }
            } else if (event === 'SIGNED_OUT') {
                try {
                    const customerInfo = await Purchases.logOut();
                    setCustomerInfo(customerInfo);
                } catch (e) {
                    console.error("RevenueCat logout error:", e);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // 3. Customer Info Updates (Native only)
    useEffect(() => {
        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) return;

        const purchaseListener = (info: CustomerInfo) => {
            setCustomerInfo(info);
        };
        Purchases.addCustomerInfoUpdateListener(purchaseListener);

        return () => {
            Purchases.removeCustomerInfoUpdateListener(purchaseListener);
        };
    }, []);

    // Derived Pro Status
    // CRITICAL: We ONLY trust RevenueCat entitlements when the SDK has been
    // identified with a real Supabase user ID (via Purchases.logIn()).
    // Anonymous RevenueCat users can have phantom entitlements from previous
    // test purchases, sandbox data, or device-level purchase restoration.
    // This means: no Supabase login = always free tier, period.
    const activeEntitlements = customerInfo?.entitlements?.active;
    const activeKeys = activeEntitlements ? Object.keys(activeEntitlements) : [];
    const hasActiveEntitlements = activeKeys.length > 0;

    // Only trust entitlements if the user is logged into Supabase
    // (which means Purchases.logIn() was called with their Supabase user ID)
    const isIdentified = !!session?.user?.id;
    const isActuallyPro = isIdentified && hasActiveEntitlements;

    // Gate on isReady: default to NOT Pro until RevenueCat has fully loaded and confirmed.
    const isPro = isReady
        ? (Constants.appOwnership === 'expo' ? isIdentified : isActuallyPro)
        : false;

    // Log what RevenueCat is reporting (console.warn visible in logcat for production debugging)
    if (isReady) {
        console.warn('[RevenueCat] customerInfo exists:', !!customerInfo);
        console.warn('[RevenueCat] active entitlements:', JSON.stringify(activeKeys));
        console.warn('[RevenueCat] isIdentified (Supabase):', isIdentified);
        console.warn('[RevenueCat] isPro:', isPro);
    }

    // Sign out of Supabase when Pro lapses; trigger initial sync when user becomes Pro
    const wasProRef = useRef<boolean | null>(null);
    useEffect(() => {
        if (!isReady) return;

        // Only trigger wipe logic on native devices where we have real subscriber info
        const isNative = Constants.appOwnership !== 'expo';

        if (isNative && wasProRef.current === true && !isPro) {
            supabase.auth.signOut().then(async () => {
                const { clearDatabase } = require('@/db/client');
                await clearDatabase();
            }).catch(console.error);
        }

        // Trigger sync when user becomes Pro
        if (wasProRef.current === false && isPro) {
            initialSync().catch(console.error);
        }
        wasProRef.current = isPro;
    }, [isPro, isReady]);

    return (
        <RevenueCatContext.Provider value={{ isPro, hasActiveEntitlements, customerInfo, currentOffering, isReady }}>
            {children}
        </RevenueCatContext.Provider>
    );
};

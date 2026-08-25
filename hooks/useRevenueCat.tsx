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
    entitlementsReady: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextState>({
    isPro: false,
    hasActiveEntitlements: false,
    customerInfo: null,
    currentOffering: null,
    isReady: false,
    entitlementsReady: false,
});

export const useRevenueCat = () => useContext(RevenueCatContext);

// Flag to track if we've already configured to prevent hot-reload/strict mode double calls
let isConfigured = false;

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
    const [rcEntitlementsResolved, setRcEntitlementsResolved] = useState(false);
    const [rcOfferingsResolved, setRcOfferingsResolved] = useState(false);
    const [sessionResolved, setSessionResolved] = useState(false);
    const [session, setSession] = useState<any>(null);

    // 1. Initial configuration & Auth Tracking
    useEffect(() => {
        // Track Supabase session for Expo Go "Virtual Pro" mode
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setSessionResolved(true);
        }).catch(() => setSessionResolved(true));
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setSessionResolved(true);
        });

        const init = async () => {
            // Check if we are in Expo Go
            const isExpoGo = Constants.appOwnership === 'expo';

            if (isExpoGo) {
                console.log("Expo Go app detected. RevenueCat native features unavailable.");
                // We do NOT provide mock offerings here to preserve production integrity.
                // The paywall will correctly show its "Loading..." state.
                setRcEntitlementsResolved(true);
                setRcOfferingsResolved(true);
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

                // Identify RevenueCat with the Supabase user BEFORE reading customer
                // info, so entitlements reflect the real user by the time we flip
                // ready. Otherwise fast SDK init can report anonymous customer info
                // and Pro users briefly (or permanently in the share extension) look
                // like free users.
                try {
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    if (currentSession?.user?.id) {
                        const { customerInfo: identifiedInfo } = await Purchases.logIn(currentSession.user.id);
                        setCustomerInfo(identifiedInfo);
                    }
                } catch (identifyErr) {
                    console.warn("RevenueCat pre-identify failed:", identifyErr);
                }

                // Fetch initial data
                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
            } catch (e) {
                console.warn("Failed to initialize RevenueCat", e);
            } finally {
                // Entitlements (Pro status) are usable as soon as customer info
                // resolves — don't block them on the slower offerings fetch.
                setRcEntitlementsResolved(true);
            }

            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current !== null) {
                    setCurrentOffering(offerings.current);
                }
            } catch (e) {
                console.warn("Failed to load RevenueCat offerings", e);
            } finally {
                setRcOfferingsResolved(true);
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

    // Only report entitlements ready once BOTH RevenueCat customer info and the
    // Supabase session lookup have settled, so consumers never see a stale
    // "free" state. Full readiness additionally waits for offerings (paywall).
    const entitlementsReady = rcEntitlementsResolved && sessionResolved;
    const isReady = entitlementsReady && rcOfferingsResolved;

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

    // Gate on entitlementsReady: default to NOT Pro until RevenueCat customer
    // info has fully loaded and confirmed. Pro status must not wait on the
    // slower offerings fetch, or shared-link extraction stalls on cold start.
    const isPro = entitlementsReady
        ? (Constants.appOwnership === 'expo' ? isIdentified : isActuallyPro)
        : false;

    // Log what RevenueCat is reporting (console.warn visible in logcat for production debugging)
    if (entitlementsReady) {
        console.warn('[RevenueCat] customerInfo exists:', !!customerInfo);
        console.warn('[RevenueCat] active entitlements:', JSON.stringify(activeKeys));
        console.warn('[RevenueCat] isIdentified (Supabase):', isIdentified);
        console.warn('[RevenueCat] isPro:', isPro);
    }

    // Sign out of Supabase when Pro lapses; trigger initial sync when user becomes Pro
    const wasProRef = useRef<boolean | null>(null);
    useEffect(() => {
        if (!entitlementsReady) return;

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
    }, [isPro, entitlementsReady]);

    return (
        <RevenueCatContext.Provider value={{ isPro, hasActiveEntitlements, customerInfo, currentOffering, isReady, entitlementsReady }}>
            {children}
        </RevenueCatContext.Provider>
    );
};

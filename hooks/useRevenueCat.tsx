import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, LOG_LEVEL } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

// Use the API key provided by the user
const API_KEY_ANDROID = "test_JErGprpfNOFecUlssjboixbQYKB";
// (Assuming the same key for iOS testing for now, or user can swap later)
const API_KEY_IOS = "test_JErGprpfNOFecUlssjboixbQYKB";

interface RevenueCatContextState {
    isPro: boolean;
    customerInfo: CustomerInfo | null;
    currentOffering: PurchasesOffering | null;
    isReady: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextState>({
    isPro: false,
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

    // 1. Initial configuration
    useEffect(() => {
        const init = async () => {
            try {
                if (!isConfigured) {
                    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
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
    }, []);

    // 2. Auth state synchronization
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

    // 3. Customer Info Updates (purchases made outside the app or on another device)
    useEffect(() => {
        const purchaseListener = (info: CustomerInfo) => {
            setCustomerInfo(info);
        };
        Purchases.addCustomerInfoUpdateListener(purchaseListener);

        return () => {
            Purchases.removeCustomerInfoUpdateListener(purchaseListener);
        };
    }, []);

    // Check if user has the active pro entitlement (default name is often 'pro' or 'premium')
    // We'll check for any active entitlement for the MVP safety.
    const isPro = typeof customerInfo?.entitlements.active !== 'undefined' &&
        Object.keys(customerInfo.entitlements.active).length > 0;

    // Sign out of Supabase when Pro lapses so canceled users can't keep syncing
    const wasProRef = useRef<boolean | null>(null);
    useEffect(() => {
        if (!isReady) return;
        if (wasProRef.current === true && !isPro) {
            supabase.auth.signOut().catch(console.error);
        }
        wasProRef.current = isPro;
    }, [isPro, isReady]);

    return (
        <RevenueCatContext.Provider value={{ isPro, customerInfo, currentOffering, isReady }}>
            {children}
        </RevenueCatContext.Provider>
    );
};

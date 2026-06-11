import React from "react";
import { View, Text, Pressable, Platform, StatusBar, Image, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Fallback packages for Expo Go / local testing where RevenueCat is unavailable
const MOCK_PACKAGES: PurchasesPackage[] = [
    {
        identifier: "$rc_annual",
        packageType: "ANNUAL" as any,
        product: {
            identifier: "rc_annual_product",
            description: "Unlock all premium kitchen features",
            title: "Annual Pro",
            price: 19.99,
            priceString: "$19.99",
            currencyCode: "USD",
            introPrice: {
                price: 0,
                priceString: "$0.00",
                period: "P7D",
                periodUnit: "DAY",
                periodNumberOfUnits: 7,
                cycles: 1,
            } as any,
        } as any,
    } as any,
    {
        identifier: "$rc_monthly",
        packageType: "MONTHLY" as any,
        product: {
            identifier: "rc_monthly_product",
            description: "Flexible monthly kitchen features",
            title: "Monthly Pro",
            price: 2.99,
            priceString: "$2.99",
            currencyCode: "USD",
            introPrice: null,
        } as any,
    } as any
];

export default function PaywallScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isPro, currentOffering, isReady } = useRevenueCat();
    const [loading, setLoading] = React.useState(false);
    const [selectedPkgId, setSelectedPkgId] = React.useState<string | null>(null);
    const [footerHeight, setFooterHeight] = React.useState(340);

    // Redirect to main tabs if the user is already Pro
    React.useEffect(() => {
        if (isPro) {
            router.replace("/(tabs)/");
        }
    }, [isPro]);

    // Track when paywall is shown for RevenueCat analytics
    React.useEffect(() => {
        if (currentOffering && typeof (Purchases as any).logPaywallPresented === 'function') {
            try {
                (Purchases as any).logPaywallPresented(currentOffering);
            } catch (e) {
                // Silently ignore
            }
        }
    }, [currentOffering]);

    // Use live offerings if available, otherwise fallback to mocks for development/Expo Go previewing
    const packages = (currentOffering && currentOffering.availablePackages.length > 0)
        ? currentOffering.availablePackages
        : MOCK_PACKAGES;

    // Set default package selection to ANNUAL
    React.useEffect(() => {
        if (packages && packages.length > 0 && !selectedPkgId) {
            const annual = packages.find(p => p.packageType === "ANNUAL");
            setSelectedPkgId(annual ? annual.identifier : packages[0].identifier);
        }
    }, [packages]);

    const activePackage = packages.find(p => p.identifier === selectedPkgId) || packages[0];

    // pricing math calculations
    const monthlyPackage = packages.find(p => p.packageType === "MONTHLY");
    const baseMonthlyPrice = monthlyPackage ? monthlyPackage.product.price : 2.99;

    const handleSelectPackage = (pkgId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPkgId(pkgId);
    };

    const handlePurchase = async () => {
        if (!activePackage) return;
        
        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const Constants = require('expo-constants').default;
            if (Constants.appOwnership === 'expo') {
                // Simulate success in development sandbox
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                alert("Simulating successful premium upgrade in Expo Go! Redirecting to setup your account...");
                router.replace("/auth");
                return;
            }

            await Purchases.purchasePackage(activePackage);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/auth");
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error("Purchase error", e);
                alert("An error occurred during purchase. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            const Constants = require('expo-constants').default;
            if (Constants.appOwnership === 'expo') {
                alert("Restoring purchases is disabled in Expo Go.");
                return;
            }

            const customerInfo = await Purchases.restorePurchases();
            const activeEntitlements = customerInfo?.entitlements?.active;
            const activeKeys = activeEntitlements ? Object.keys(activeEntitlements) : [];
            
            if (activeKeys.length > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                alert("Success! Your premium access has been restored.");
                router.replace("/(tabs)/");
            } else {
                alert("No active subscription found to restore.");
            }
        } catch (e: any) {
            console.error("Restore error", e);
            alert("Failed to restore purchases: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Render timeline steps helper based on package types
    const renderTimeline = () => {
        const isAnnualSelected = activePackage?.packageType === "ANNUAL";
        
        return (
            <Animated.View entering={FadeIn.delay(450)} className="bg-surface-900/60 border border-surface-800 p-4 rounded-2xl mb-4">
                <Text className="text-accent font-sans-bold text-base tracking-widest text-center mb-1 uppercase">
                    {isAnnualSelected ? "How your 7-day free trial works" : "How your subscription works"}
                </Text>
                {isAnnualSelected && (
                    <Text className="text-surface-400 font-sans-medium text-xs text-center mb-4">
                        Included with the Annual Plan
                    </Text>
                )}
                {!isAnnualSelected && <View style={{ height: 12 }} />}

                {isAnnualSelected ? (
                    <View>
                        {/* Step 1 */}
                        <View className="flex-row items-start" style={{ marginBottom: 16 }}>
                            <View style={{ width: 40, alignItems: 'center', marginRight: 16 }}>
                                <View className="w-10 h-10 rounded-full bg-[#0F312D] border border-emerald-500/50 items-center justify-center">
                                    <Ionicons name="lock-open" size={18} color="#10B981" />
                                </View>
                            </View>
                            <View style={{ flex: 1, paddingBottom: 4 }}>
                                <Text className="text-white font-sans-bold text-lg leading-7">Today</Text>
                                <Text className="text-surface-200 font-sans text-base leading-6">
                                    Unlock full access to Pro. Billed: $0.00.
                                </Text>
                            </View>
                        </View>

                        {/* Step 2 */}
                        <View className="flex-row items-start" style={{ marginBottom: 16 }}>
                            <View style={{ width: 40, alignItems: 'center', marginRight: 16 }}>
                                <View className="w-10 h-10 rounded-full bg-[#172644] border border-blue-500/50 items-center justify-center">
                                    <Ionicons name="notifications" size={18} color="#3B82F6" />
                                </View>
                            </View>
                            <View style={{ flex: 1, paddingBottom: 4 }}>
                                <Text className="text-white font-sans-bold text-lg leading-7">Day 5</Text>
                                <Text className="text-surface-200 font-sans text-base leading-6">
                                    Get an alert from us before your trial ends.
                                </Text>
                            </View>
                        </View>

                        {/* Step 3 */}
                        <View className="flex-row items-start">
                            <View style={{ width: 40, alignItems: 'center', marginRight: 16 }}>
                                <View className="w-10 h-10 rounded-full bg-[#3F211E] border border-accent/50 items-center justify-center">
                                    <Ionicons name="card" size={18} color="#FF6B35" />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="text-white font-sans-bold text-lg leading-7">Day 7</Text>
                                <Text className="text-surface-200 font-sans text-base leading-6">
                                    Yearly plan starts at {activePackage.product.priceString}/year. Cancel anytime.
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View>
                        {/* Monthly flow */}
                        <View className="flex-row items-start" style={{ marginBottom: 16 }}>
                            <View style={{ width: 40, alignItems: 'center', marginRight: 16 }}>
                                <View className="w-10 h-10 rounded-full bg-[#3F211E] border border-accent/50 items-center justify-center">
                                    <Ionicons name="lock-open" size={18} color="#FF6B35" />
                                </View>
                            </View>
                            <View style={{ flex: 1, paddingBottom: 4 }}>
                                <Text className="text-white font-sans-bold text-lg leading-7">Today</Text>
                                <Text className="text-surface-200 font-sans text-base leading-6">
                                    Unlock full access immediately. Billed {activePackage.product.priceString}/month.
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-start">
                            <View style={{ width: 40, alignItems: 'center', marginRight: 16 }}>
                                <View className="w-10 h-10 rounded-full bg-surface-800 border border-surface-700 items-center justify-center">
                                    <Ionicons name="refresh" size={18} color="#9D9DB0" />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="text-white font-sans-bold text-lg leading-7">Flexible Control</Text>
                                <Text className="text-surface-200 font-sans text-base leading-6">
                                    Renews automatically. Cancel anytime.
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </Animated.View>
        );
    };

    return (
        <View 
            className="bg-surface-950"
            style={{ 
                flex: 1,
                paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 4 
            }}
        >
            {/* Header controls pinned to top */}
            <View className="flex-row justify-between items-center px-6 h-10 z-20">
                <Pressable 
                    onPress={handleRestore}
                    disabled={loading}
                    className="py-1 active:opacity-60"
                >
                    <Text className="text-surface-400 font-sans-medium text-xs">Restore</Text>
                </Pressable>

                <Pressable 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace("/(tabs)/");
                        }
                    }} 
                    className="w-7 h-7 items-center justify-center rounded-full bg-surface-900 border border-surface-800"
                >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                </Pressable>
            </View>

            {/* Scrollable middle section */}
            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ 
                    paddingHorizontal: 20, 
                    paddingTop: 8,
                    paddingBottom: footerHeight + 16 
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Headline Section */}
                <Animated.View entering={FadeIn.delay(100)} style={{ alignItems: 'center', marginBottom: 16, marginTop: 4 }}>
                    <View className="w-14 h-14 rounded-2xl bg-surface-900 border border-surface-800 items-center justify-center mb-3 overflow-hidden shadow-lg shadow-black/50">
                        <Image source={require("../assets/icon.png")} style={{ width: 56, height: 56 }} resizeMode="cover" />
                    </View>
                    <Text className="text-white font-sans-bold text-3xl text-center mb-1.5 leading-9">
                        Save Recipes & Track Nutrition
                    </Text>
                    <Text className="text-surface-200 font-sans text-center text-base px-2 leading-6">
                        Unlock your complete kitchen companion. Get full access with a risk-free trial.
                    </Text>
                </Animated.View>

                {/* Core Features list in a single card */}
                <Animated.View entering={SlideInDown.delay(200)} style={{ backgroundColor: 'rgba(15,15,24,0.6)', borderWidth: 1, borderColor: '#1A1A26', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Ionicons name="sparkles" size={20} color="#FF6B35" style={{ marginRight: 8 }} />
                        <Text className="text-accent font-sans-bold text-lg uppercase tracking-wider">What you get with Pro</Text>
                    </View>
                    
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                            <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginTop: 2, marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text className="text-white font-sans-bold text-lg leading-6">Recipe Importing & Management</Text>
                                <Text className="text-surface-200 font-sans text-sm leading-5">Save recipes from any website, Instagram, or TikTok.</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                            <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginTop: 2, marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text className="text-white font-sans-bold text-lg leading-6">Sleek Meal Planning</Text>
                                <Text className="text-surface-200 font-sans text-sm leading-5">Schedule meals, create custom books, and plan dinners.</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                            <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginTop: 2, marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text className="text-white font-sans-bold text-lg leading-6">Smart Shopping Lists</Text>
                                <Text className="text-surface-200 font-sans text-sm leading-5">Lists auto-sorted by grocery aisle directly from plans.</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name="checkmark-sharp" size={20} color="#10B981" style={{ marginTop: 2, marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text className="text-white font-sans-bold text-lg leading-6">Calorie & Macro Tracker</Text>
                                <Text className="text-surface-200 font-sans text-sm leading-5">Log food and use AI to estimate macros instantly.</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Vertical Timeline Graphic */}
                {renderTimeline()}
            </ScrollView>

            {/* Pinned Bottom Footer Section */}
            <Animated.View 
                entering={FadeIn.delay(300)}
                onLayout={(e) => {
                    const { height } = e.nativeEvent.layout;
                    if (height && height !== footerHeight) {
                        setFooterHeight(height);
                    }
                }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#07070B', // Solid matching dark background
                    borderTopWidth: 1,
                    borderTopColor: '#1A1A26',
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: Math.max(insets.bottom || 0, Platform.OS === 'android' ? 28 : 24) + 16,
                }}
            >
                <View style={{ marginBottom: 12 }}>
                    <Text className="text-surface-200 font-sans-bold text-base uppercase tracking-wider text-left" style={{ marginBottom: 8 }}>
                        Choose your plan
                    </Text>

                    {isReady ? (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {packages.map((pkg) => {
                                const isSelected = selectedPkgId === pkg.identifier;
                                const isAnnual = pkg.packageType === "ANNUAL";
                                
                                let mathPriceString = pkg.product.priceString;
                                let detailsText = `Billed monthly`;
                                let savingsText = "";

                                if (isAnnual) {
                                    const monthlyEquivalent = (pkg.product.price / 12).toFixed(2);
                                    mathPriceString = `$${monthlyEquivalent}`;
                                    detailsText = `$${pkg.product.price} billed yearly`;
                                    
                                    const fullMonthlyCost = baseMonthlyPrice * 12;
                                    const annualCost = pkg.product.price;
                                    if (fullMonthlyCost > annualCost) {
                                        const savingsPercent = Math.round(((fullMonthlyCost - annualCost) / fullMonthlyCost) * 100);
                                        savingsText = `SAVE ${savingsPercent}%`;
                                    }
                                } else {
                                    // Monthly plan price contrast
                                    detailsText = `$${(pkg.product.price * 12).toFixed(2)}/yr equivalent`;
                                }

                                return (
                                    <Pressable
                                        key={pkg.identifier}
                                        onPress={() => handleSelectPackage(pkg.identifier)}
                                        style={{
                                            flex: 1,
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isSelected ? '#FF6B35' : '#1A1A26',
                                            backgroundColor: isSelected ? '#0F0F18' : 'rgba(15,15,24,0.4)',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            minHeight: 100,
                                        }}
                                    >
                                        {savingsText !== "" && (
                                            <View style={{ position: 'absolute', top: -10, zIndex: 20, backgroundColor: '#FF6B35', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 }}>
                                                <Text className="text-white font-sans-bold text-[10px] tracking-wider uppercase">
                                                    {savingsText}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                            <Text className="text-white font-sans-bold text-sm uppercase tracking-wider">
                                                {isAnnual ? "Annual" : "Monthly"}
                                            </Text>
                                            <View style={{
                                                width: 18, height: 18, borderRadius: 9,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#FF6B35' : '#4A4A5E',
                                                backgroundColor: isSelected ? '#FF6B35' : 'transparent',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {isSelected && (
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
                                                )}
                                            </View>
                                        </View>

                                        <View style={{ alignItems: 'center', marginVertical: 1 }}>
                                            <Text className="text-white font-sans-bold text-2xl leading-8">
                                                {mathPriceString}
                                            </Text>
                                            <Text className="text-surface-200 font-sans text-xs" style={{ marginTop: 1 }}>
                                                / month
                                            </Text>
                                        </View>

                                        <Text className="text-surface-300 font-sans-medium text-[11px] text-center">
                                            {detailsText}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
                            <Text className="text-surface-200 font-sans text-base">Loading plans...</Text>
                        </View>
                    )}
                </View>

                {/* CTA Button */}
                <Pressable
                    onPress={handlePurchase}
                    disabled={loading}
                    style={{ borderRadius: 12, overflow: 'hidden' }}
                >
                    <LinearGradient
                        colors={['#FF6B35', '#E05520']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Text className="text-white font-sans-bold text-lg">
                            {activePackage?.packageType === "ANNUAL" 
                                ? "Start 7-Day Free Trial & Subscribe" 
                                : "Unlock Pro Access"
                            }
                        </Text>
                    </LinearGradient>
                </Pressable>

                {/* Login Option */}
                <Pressable 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push("/auth");
                    }}
                    style={{ marginTop: 6, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 16 }}
                >
                    <Text className="text-accent font-sans-semibold text-sm">Already have an account? Log In</Text>
                </Pressable>

                <Text className="text-surface-400 font-sans text-[11px] text-center leading-4" style={{ marginTop: 6, paddingHorizontal: 12 }}>
                    Cancel anytime in settings. Subscriptions renew automatically unless turned off at least 24 hours before the current period ends.
                </Text>

                {/* Legal Links */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 6, marginBottom: 0, gap: 12 }}>
                    <Pressable 
                        onPress={() => Linking.openURL("https://snaprecipes.app/terms.html").catch(() => {})}
                        style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                    >
                        <Text className="text-accent font-sans-semibold text-xs">Terms of Use</Text>
                    </Pressable>
                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#2D2D3D' }} />
                    <Pressable 
                        onPress={() => Linking.openURL("https://snaprecipes.app/privacy.html").catch(() => {})}
                        style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                    >
                        <Text className="text-accent font-sans-semibold text-xs">Privacy Policy</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
}

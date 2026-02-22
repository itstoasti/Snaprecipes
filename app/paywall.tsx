import React from "react";
import { View, Text, Pressable, Platform, StatusBar, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useRevenueCat } from "@/hooks/useRevenueCat";

export default function PaywallScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { currentOffering, isReady } = useRevenueCat();
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (currentOffering) {
            Purchases.logPaywallPresented(currentOffering);
        }
    }, [currentOffering]);

    const handlePurchase = async (pkg: PurchasesPackage) => {
        try {
            setLoading(true);
            await Purchases.purchasePackage(pkg);
            // Purchase successful
            router.replace("/(tabs)/");
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error("Purchase error", e);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View
            className="flex-1 bg-surface-950 px-6"
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 20 }}
        >
            <Pressable onPress={() => {
                if (router.canGoBack()) {
                    router.back()
                } else {
                    router.replace("/(tabs)/");
                }
            }} className="w-10 h-10 items-center justify-center rounded-full bg-surface-900 mb-8 self-end">
                <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            <Animated.View entering={FadeIn.delay(200)} className="items-center mb-10">
                <View className="w-20 h-20 rounded-2xl bg-surface-900 border border-surface-800 items-center justify-center mb-6 overflow-hidden shadow-lg shadow-black/50">
                    <Image source={require("../assets/icon.png")} style={{ width: 80, height: 80 }} resizeMode="cover" />
                </View>
                <Text className="text-white font-sans-bold text-3xl text-center mb-2">SnapRecipes Pro</Text>
                <Text className="text-surface-400 font-sans text-center px-4">Unlock the full power of your kitchen. Never lose a recipe again.</Text>
            </Animated.View>

            <View className="space-y-6 mb-12 flex-1">
                <Animated.View entering={SlideInDown.delay(400).springify()} className="flex-row items-center bg-surface-900 p-4 rounded-2xl border border-surface-800">
                    <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mr-4">
                        <Ionicons name="infinite" size={20} color="#FF6B35" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-sans-bold text-lg">Unlimited Saves</Text>
                        <Text className="text-surface-400 font-sans text-sm">Save as many recipes as you want. Extract from anywhere.</Text>
                    </View>
                </Animated.View>

                <Animated.View entering={SlideInDown.delay(500).springify()} className="flex-row items-center bg-surface-900 p-4 rounded-2xl border border-surface-800">
                    <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center mr-4">
                        <Ionicons name="cloud-done" size={20} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-sans-bold text-lg">Cloud Sync</Text>
                        <Text className="text-surface-400 font-sans text-sm">Create an account to securely backup and sync your collections.</Text>
                    </View>
                </Animated.View>

                <Animated.View entering={SlideInDown.delay(600).springify()} className="flex-row items-center bg-surface-900 p-4 rounded-2xl border border-surface-800">
                    <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center mr-4">
                        <Ionicons name="flame" size={20} color="#10B981" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-sans-bold text-lg">Cook Mode</Text>
                        <Text className="text-surface-400 font-sans text-sm">Keeps your screen on while cooking. Interactive ingredient lists.</Text>
                    </View>
                </Animated.View>
            </View>

            <Animated.View entering={SlideInDown.delay(800).springify()} className="pb-10">
                {isReady && currentOffering ? (
                    currentOffering.availablePackages.map((pkg, idx) => (
                        <Pressable
                            key={pkg.identifier}
                            onPress={() => handlePurchase(pkg)}
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl items-center flex-row justify-center mb-4 ${idx === 0 ? 'bg-accent shadow-lg shadow-accent/30' : 'border border-surface-700 bg-surface-900'}`}
                        >
                            <Text className="text-white font-sans-bold text-lg">
                                {pkg.packageType === 'LIFETIME' ? 'Unlock Forever for ' : 'Subscribe for '}
                                {pkg.product.priceString} {pkg.packageType === 'MONTHLY' ? '/ mo' : ''}
                            </Text>
                        </Pressable>
                    ))
                ) : (
                    <View className="py-8 items-center justify-center">
                        <Text className="text-surface-400 font-sans text-sm">Loading Premium Access...</Text>
                    </View>
                )}

                <Pressable onPress={() => router.push("/auth")} className="w-full py-3 mb-6 items-center">
                    <Text className="text-accent font-sans-semibold text-sm">Already a Pro? Log in to sync.</Text>
                </Pressable>

                <Text className="text-surface-500 font-sans text-xs text-center px-4">
                    Subscriptions will automatically renew until cancelled. You can cancel at any time in your device settings.
                </Text>
            </Animated.View>
        </View>
    );
}

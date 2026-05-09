import React, { useState, useEffect } from "react";
import { useRouter, Stack } from "expo-router";
import { View, Text, Pressable, Platform, TextInput, Alert, KeyboardAvoidingView, ScrollView, Linking, Image, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import GlassContainer from "@/components/GlassContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight, FadeIn, FadeOut } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { pushPendingChanges, pullRemoteChanges } from "@/lib/sync";
import { clearDatabase } from "@/db/client";
import type { Session } from "@supabase/supabase-js";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useRecipes } from "@/hooks/useRecipes";
import { AI_PROVIDER_STORE, USER_GOALS_STORE } from "@/lib/constants";
import StatusModal from "@/components/StatusModal";
import { BlurView } from "expo-blur";

function SettingRow({
    icon,
    label,
    value,
    onPress,
}: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            className="flex-row items-center py-4 border-b border-surface-800"
        >
            <View className="w-10 h-10 rounded-xl bg-surface-800 items-center justify-center mr-4">
                <Ionicons name={icon as any} size={20} color="#9D9DB0" />
            </View>
            <Text className="text-white font-sans text-base flex-1">{label}</Text>
            {value && (
                <Text className="text-surface-400 font-sans text-sm">{value}</Text>
            )}
            {onPress && (
                <Ionicons name="chevron-forward" size={16} color="#6E6E85" />
            )}
        </Pressable>
    );
}

export default function SettingsScreen() {
    const appVersion = Constants.expoConfig?.version || "1.0.0";
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { isPro, hasActiveEntitlements, isReady } = useRevenueCat();
    const { repairBrokenImages } = useRecipes();

    // Supabase Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");
    const [syncing, setSyncing] = useState(false);
    const [modal, setModal] = useState<{
        visible: boolean;
        type: "success" | "error";
        title: string;
        message: string;
    }>({
        visible: false,
        type: "success",
        title: "",
        message: "",
    });

    // Health & Goals State
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [healthData, setHealthData] = useState({
        weight: "",
        height: "", // cm
        heightFt: "",
        heightIn: "",
        age: "",
        gender: "male",
        activity: "moderate", // sedentary, light, moderate, active, very_active
        goal: "maintain", // lose, maintain, gain
        unitSystem: "imperial", // imperial, metric
    });
    const [currentGoals, setCurrentGoals] = useState<any>(null);

    useEffect(() => {
        SecureStore.getItemAsync(AI_PROVIDER_STORE).then(val => {
            if (val === "openai") setAiProvider("openai");
        });

        // Load existing goals
        SecureStore.getItemAsync(USER_GOALS_STORE).then(val => {
            if (val) {
                const parsed = JSON.parse(val);
                setHealthData(parsed.healthData || healthData);
                setCurrentGoals(parsed.goals);
            }
        });

        // Fetch session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setModal({
                visible: true,
                type: "error",
                title: "Sign Out Failed",
                message: error.message
            });
        } else {
            await clearDatabase();
            router.replace("/");
        }
    };

    const calculateGoals = () => {
        let weightKg = 0;
        let heightCm = 0;

        if (healthData.unitSystem === "imperial") {
            const lbs = parseFloat(healthData.weight);
            const ft = parseFloat(healthData.heightFt);
            const inch = parseFloat(healthData.heightIn) || 0;

            if (!lbs || !ft) {
                Alert.alert("Missing Info", "Please fill in weight and height (feet) to calculate your goals.");
                return;
            }
            weightKg = lbs * 0.453592;
            heightCm = (ft * 30.48) + (inch * 2.54);
        } else {
            const kg = parseFloat(healthData.weight);
            const cm = parseFloat(healthData.height);

            if (!kg || !cm) {
                Alert.alert("Missing Info", "Please fill in weight and height to calculate your goals.");
                return;
            }
            weightKg = kg;
            heightCm = cm;
        }

        const a = parseInt(healthData.age);

        if (!a) {
            Alert.alert("Missing Info", "Please fill in your age to calculate your goals.");
            return;
        }

        // BMR (Mifflin-St Jeor)
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * a);
        if (healthData.gender === "male") bmr += 5;
        else bmr -= 161;

        // Activity Multiplier
        const multipliers: any = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        let tdee = bmr * (multipliers[healthData.activity] || 1.55);

        // Goal Adjustment
        if (healthData.goal === "lose") tdee -= 500;
        if (healthData.goal === "gain") tdee += 300;

        const newGoals = {
            calories: Math.round(tdee),
            protein: Math.round(weightKg * 1.8), // Standard active protein goal (1.8g/kg)
            fat: Math.round((tdee * 0.25) / 9), // 25% calories from fat
            carbs: Math.round((tdee - (weightKg * 1.8 * 4) - ((tdee * 0.25))) / 4) // Remaining calories from carbs
        };

        const payload = {
            healthData,
            goals: newGoals,
            updated_at: new Date().toISOString()
        };

        SecureStore.setItemAsync(USER_GOALS_STORE, JSON.stringify(payload));
        setCurrentGoals(newGoals);
        setShowGoalModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setModal({
            visible: true,
            type: "success",
            title: "Goals Updated!",
            message: `Your new daily target is ${newGoals.calories} kcal. The calorie counter has been updated.`
        });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-surface-950"
        >
            <Stack.Screen options={{ 
                headerShown: true, 
                title: "Settings",
                headerStyle: { backgroundColor: "#0A0A0F" },
                headerTintColor: "#FFF",
                headerTitleStyle: { fontFamily: "Inter_700Bold" }
            }} />

            <ScrollView 
                className="flex-1 px-5 pt-4"
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* SnapRecipes Pro */}
                {isReady && isPro ? (
                    <View className="flex-row items-center bg-surface-900 border border-emerald-500/30 p-4 rounded-2xl mb-8">
                        <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center mr-4">
                            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-sans-bold text-lg">SnapRecipes Pro Active</Text>
                            <Text className="text-surface-400 font-sans text-sm">Thank you for your support!</Text>
                        </View>
                    </View>
                ) : (
                    <Pressable
                        onPress={() => router.push("/paywall")}
                        className="flex-row items-center bg-surface-900 border border-accent/30 p-4 rounded-2xl mb-8"
                    >
                        <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center mr-4">
                            <Ionicons name="star" size={24} color="#FF6B35" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-sans-bold text-lg">SnapRecipes Pro</Text>
                            <Text className="text-surface-400 font-sans text-sm">Unlimited saves & cook mode</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6E6E85" />
                    </Pressable>
                )}



                {/* Account & Sync */}
                <Text className="text-white font-sans-semibold text-lg mb-3">Account & Cloud Sync</Text>
                <GlassContainer style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24, padding: 0 }}>
                    <View className="p-5">
                        {!isPro ? (
                            <View className="items-center py-4">
                                <View className="w-16 h-16 rounded-full bg-surface-800 items-center justify-center mb-4 border border-surface-700">
                                    <Ionicons name="lock-closed" size={28} color="#9D9DB0" />
                                </View>
                                <Text className="text-white font-sans-bold text-lg mb-2">Pro Feature</Text>
                                <Text className="text-surface-300 font-sans text-sm text-center mb-4 leading-5">
                                    Upgrade to SnapRecipes Pro to create an account and unlock premium features:
                                </Text>
                                <View className="w-full px-2 mb-6 space-y-3 gap-3">
                                    <View className="flex-row items-center">
                                        <Ionicons name="infinite" size={18} color="#FF6B35" />
                                        <Text className="text-surface-300 font-sans text-sm ml-3 flex-1">Unlimited recipe saves</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Ionicons name="cloud-done" size={18} color="#3b82f6" />
                                        <Text className="text-surface-300 font-sans text-sm ml-3 flex-1">Secure, automatic cloud syncing</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Ionicons name="restaurant" size={18} color="#10b981" />
                                        <Text className="text-surface-300 font-sans text-sm ml-3 flex-1">Ad-free Cook Mode</Text>
                                    </View>
                                </View>
                                <Pressable
                                    onPress={() => router.push("/paywall")}
                                    className="w-full py-4 rounded-xl items-center bg-surface-800 border-surface-700 border"
                                >
                                    <Text className="text-white font-sans-bold text-base">Unlock Cloud Sync</Text>
                                </Pressable>
                            </View>
                        ) : session && session.user ? (
                            <View>
                                <View className="flex-row items-center mb-6">
                                    <View className="w-12 h-12 rounded-full bg-surface-800 items-center justify-center mr-4">
                                        <Text className="text-white font-sans-bold text-lg">
                                            {session.user.email?.charAt(0).toUpperCase() || "U"}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-sans-bold text-base">Signed In</Text>
                                        <Text className="text-surface-400 font-sans text-sm">{session.user.email}</Text>
                                    </View>
                                </View>

                                <View className="flex-row justify-between mb-4">
                                    <Pressable
                                        onPress={async () => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setSyncing(true);
                                            try {
                                                await pushPendingChanges();
                                                await pullRemoteChanges();
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                setModal({
                                                    visible: true,
                                                    type: "success",
                                                    title: "Sync Complete",
                                                    message: "Your recipes are securely backed up and up-to-date across all devices."
                                                });
                                            } catch (e: any) {
                                                setModal({
                                                    visible: true,
                                                    type: "error",
                                                    title: "Sync Failed",
                                                    message: e.message || "An error occurred during sync."
                                                });
                                            } finally {
                                                setSyncing(false);
                                            }
                                        }}
                                        disabled={syncing}
                                        className={`flex-1 mr-2 bg-surface-800 py-3 rounded-lg flex-row items-center justify-center ${syncing ? 'opacity-50' : ''}`}
                                    >
                                        <Ionicons name="sync" size={16} color="#34D399" className="mr-2" />
                                        <Text className="text-white font-sans-semibold text-sm">{syncing ? "Syncing..." : "Sync Now"}</Text>
                                    </Pressable>
                                    <Pressable onPress={signOut} className="flex-1 ml-2 border border-surface-700 py-3 rounded-lg items-center justify-center">
                                        <Text className="text-surface-400 font-sans-semibold text-sm">Sign Out</Text>
                                    </Pressable>
                                </View>

                                <View className="mt-2 pt-2 border-t border-surface-800">
                                    <SettingRow
                                        icon="card"
                                        label="Manage Subscription"
                                        onPress={() => {
                                            const url = Platform.OS === 'ios'
                                                ? 'https://apps.apple.com/account/subscriptions'
                                                : 'https://play.google.com/store/account/subscriptions?package=com.deanfieldz.yummy';
                                            Linking.openURL(url);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    />
                                </View>

                                <Text className="text-surface-500 font-sans text-xs text-center mt-4">
                                    Your recipes securely sync across all your devices.
                                </Text>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-surface-300 font-sans text-sm mb-5 leading-5">
                                    You are a Pro user! Create your free account to securely sync your collections to the cloud and access them across devices.
                                </Text>

                                <Pressable
                                    onPress={() => router.push("/auth")}
                                    className="w-full py-4 rounded-xl items-center bg-accent shadow-lg shadow-accent/20"
                                >
                                    <Text className="text-white font-sans-bold text-base">Log In / Sign Up</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </GlassContainer>

                {/* Health & Goals */}
                <Text className="text-white font-sans-semibold text-lg mb-3">Health & Goals</Text>
                <GlassContainer style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24, padding: 0 }}>
                    <View className="p-5">
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-1 mr-4">
                                <Text className="text-white font-sans-bold text-base mb-1">
                                    {currentGoals ? `${currentGoals.calories} kcal` : "Standard 2000 kcal"}
                                </Text>
                                <Text className="text-surface-400 font-sans text-xs leading-4">
                                    {currentGoals ? "Based on your personalized health profile." : "Using a generic daily baseline. Personalize it for better results."}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setShowGoalModal(true)}
                                className="bg-accent px-4 py-2 rounded-xl"
                            >
                                <Text className="text-white font-sans-bold text-xs">Customize</Text>
                            </Pressable>
                        </View>

                        {currentGoals && (
                            <View className="flex-row justify-between bg-surface-950/50 p-3 rounded-xl border border-surface-800/50">
                                <View className="items-center">
                                    <Text className="text-blue-400 font-sans-bold text-xs">{currentGoals.protein}g</Text>
                                    <Text className="text-surface-500 font-sans text-[9px]">Protein</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-amber-400 font-sans-bold text-xs">{currentGoals.carbs}g</Text>
                                    <Text className="text-surface-500 font-sans text-[9px]">Carbs</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-pink-400 font-sans-bold text-xs">{currentGoals.fat}g</Text>
                                    <Text className="text-surface-500 font-sans text-[9px]">Fat</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </GlassContainer>

                {/* AI Engine Section */}
                <Text className="text-white font-sans-semibold text-lg mb-3">AI Extraction Engine</Text>
                <GlassContainer style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
                    <View className="p-5">
                        <Text className="text-surface-400 font-sans text-sm mb-4 leading-5">
                            Choose the underlying AI model used to extract recipes from websites and photos.
                        </Text>
                        <View className="flex-row bg-surface-950 p-1 rounded-xl">
                            <Pressable
                                onPress={() => {
                                    setAiProvider("gemini");
                                    SecureStore.setItemAsync(AI_PROVIDER_STORE, "gemini");
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                                className={`flex-1 py-3 rounded-lg items-center ${aiProvider === "gemini" ? "bg-surface-800" : ""}`}
                            >
                                <Text className={`font-sans-semibold ${aiProvider === "gemini" ? "text-white" : "text-surface-500"}`}>Gemini Flash</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setAiProvider("openai");
                                    SecureStore.setItemAsync(AI_PROVIDER_STORE, "openai");
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                                className={`flex-1 py-3 rounded-lg items-center ${aiProvider === "openai" ? "bg-surface-800" : ""}`}
                            >
                                <Text className={`font-sans-semibold ${aiProvider === "openai" ? "text-white" : "text-surface-500"}`}>GPT-4o</Text>
                            </Pressable>
                        </View>
                    </View>
                </GlassContainer>



                {/* App Info */}
                <Text className="text-white font-sans-semibold text-lg mb-3">About</Text>
                <View className="bg-surface-900 rounded-2xl px-5 mb-6">
                    <SettingRow icon="information-circle" label="Version" value={appVersion} />
                </View>

                {/* Contact */}
                <View className="bg-surface-900 rounded-2xl px-5 mb-10">
                    <SettingRow
                        icon="mail"
                        label="Contact"
                        onPress={() => Linking.openURL("mailto:singlesourcedigitalmarketing@gmail.com")}
                    />
                </View>

                {/* Branding */}
                <View className="items-center mb-6">
                    <View className="w-16 h-16 rounded-2xl bg-surface-900 border border-surface-800 items-center justify-center mb-3 overflow-hidden shadow-lg shadow-black/50">
                        <Image source={require("../../assets/icon.png")} style={{ width: 64, height: 64 }} resizeMode="cover" />
                    </View>
                    <Text className="text-white font-sans-bold text-lg">SnapRecipes</Text>
                    <Text className="text-surface-500 font-sans text-xs mt-1">
                        Save any recipe, instantly.
                    </Text>
                </View>
            </ScrollView>

            <StatusModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onClose={() => setModal(prev => ({ ...prev, visible: false }))}
            />

            {/* Health & Goals Modal */}
            <Modal
                visible={showGoalModal}
                transparent
                animationType="none"
                statusBarTranslucent
            >
                <View className="flex-1">
                    <Animated.View 
                        entering={FadeIn} 
                        exiting={FadeOut}
                        className="absolute inset-0 bg-black/60"
                    />
                    <BlurView intensity={30} tint="dark" className="flex-1 justify-center px-6">
                        <Animated.View 
                            entering={FadeInDown}
                            className="w-full"
                        >
                            <GlassContainer className="p-6 rounded-[32px] border border-white/10">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-white font-sans-bold text-xl">Health Profile</Text>
                                    <Pressable 
                                        onPress={() => setShowGoalModal(false)}
                                        className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
                                    >
                                        <Ionicons name="close" size={20} color="white" />
                                    </Pressable>
                                </View>

                                <ScrollView className="max-h-[450px]" showsVerticalScrollIndicator={false}>
                                    <View className="mb-4">
                                        <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Unit System</Text>
                                        <View className="flex-row bg-surface-950 p-1 rounded-2xl border border-surface-800">
                                            {[
                                                { id: 'imperial', label: 'Imperial (lbs, ft)' },
                                                { id: 'metric', label: 'Metric (kg, cm)' }
                                            ].map(u => (
                                                <Pressable
                                                    key={u.id}
                                                    onPress={() => setHealthData(p => ({ ...p, unitSystem: u.id as any }))}
                                                    className={`flex-1 py-2.5 rounded-xl items-center ${healthData.unitSystem === u.id ? 'bg-surface-800' : ''}`}
                                                >
                                                    <Text className={`font-sans-semibold text-xs ${healthData.unitSystem === u.id ? 'text-white' : 'text-surface-500'}`}>{u.label}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>

                                    <View className="flex-row gap-3 mb-4">
                                        <View className="flex-[1.2]">
                                            <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">
                                                Weight ({healthData.unitSystem === 'imperial' ? 'lbs' : 'kg'})
                                            </Text>
                                            <TextInput
                                                value={healthData.weight}
                                                onChangeText={v => setHealthData(p => ({ ...p, weight: v }))}
                                                placeholder={healthData.unitSystem === 'imperial' ? "165" : "75"}
                                                placeholderTextColor="#4A4A5E"
                                                keyboardType="numeric"
                                                className="bg-surface-950 border border-surface-800 text-white p-4 rounded-2xl font-sans"
                                            />
                                        </View>
                                        
                                        {healthData.unitSystem === 'imperial' ? (
                                            <View className="flex-[2] flex-row gap-2">
                                                <View className="flex-1">
                                                    <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Ft</Text>
                                                    <TextInput
                                                        value={healthData.heightFt}
                                                        onChangeText={v => setHealthData(p => ({ ...p, heightFt: v }))}
                                                        placeholder="5"
                                                        placeholderTextColor="#4A4A5E"
                                                        keyboardType="numeric"
                                                        className="bg-surface-950 border border-surface-800 text-white p-4 rounded-2xl font-sans"
                                                    />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">In</Text>
                                                    <TextInput
                                                        value={healthData.heightIn}
                                                        onChangeText={v => setHealthData(p => ({ ...p, heightIn: v }))}
                                                        placeholder="10"
                                                        placeholderTextColor="#4A4A5E"
                                                        keyboardType="numeric"
                                                        className="bg-surface-950 border border-surface-800 text-white p-4 rounded-2xl font-sans"
                                                    />
                                                </View>
                                            </View>
                                        ) : (
                                            <View className="flex-1">
                                                <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Height (cm)</Text>
                                                <TextInput
                                                    value={healthData.height}
                                                    onChangeText={v => setHealthData(p => ({ ...p, height: v }))}
                                                    placeholder="180"
                                                    placeholderTextColor="#4A4A5E"
                                                    keyboardType="numeric"
                                                    className="bg-surface-950 border border-surface-800 text-white p-4 rounded-2xl font-sans"
                                                />
                                            </View>
                                        )}
                                    </View>

                                    <View className="mb-4">
                                        <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Age</Text>
                                        <TextInput
                                            value={healthData.age}
                                            onChangeText={v => setHealthData(p => ({ ...p, age: v }))}
                                            placeholder="28"
                                            placeholderTextColor="#4A4A5E"
                                            keyboardType="numeric"
                                            className="bg-surface-950 border border-surface-800 text-white p-4 rounded-2xl font-sans"
                                        />
                                    </View>

                                    <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Gender</Text>
                                    <View className="flex-row bg-surface-950 p-1 rounded-2xl mb-4 border border-surface-800">
                                        {['male', 'female'].map(g => (
                                            <Pressable
                                                key={g}
                                                onPress={() => setHealthData(p => ({ ...p, gender: g }))}
                                                className={`flex-1 py-3 rounded-xl items-center ${healthData.gender === g ? 'bg-surface-800' : ''}`}
                                            >
                                                <Text className={`font-sans-semibold capitalize ${healthData.gender === g ? 'text-white' : 'text-surface-500'}`}>{g}</Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Activity Level</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                                        <View className="flex-row bg-surface-950 p-1 rounded-2xl border border-surface-800" style={{ gap: 4 }}>
                                            {['sedentary', 'light', 'moderate', 'active', 'very_active'].map(a => (
                                                <Pressable
                                                    key={a}
                                                    onPress={() => setHealthData(p => ({ ...p, activity: a }))}
                                                    className={`px-4 py-3 rounded-xl items-center ${healthData.activity === a ? 'bg-surface-800' : ''}`}
                                                >
                                                    <Text className={`font-sans-semibold capitalize ${healthData.activity === a ? 'text-white' : 'text-surface-500'}`}>{a.replace('_', ' ')}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </ScrollView>

                                    <Text className="text-surface-400 font-sans-bold text-[10px] uppercase mb-1.5 ml-1">Your Goal</Text>
                                    <View className="flex-row bg-surface-950 p-1 rounded-2xl mb-6 border border-surface-800">
                                        {['lose', 'maintain', 'gain'].map(g => (
                                            <Pressable
                                                key={g}
                                                onPress={() => setHealthData(p => ({ ...p, goal: g }))}
                                                className={`flex-1 py-3 rounded-xl items-center ${healthData.goal === g ? 'bg-surface-800' : ''}`}
                                            >
                                                <Text className={`font-sans-semibold capitalize ${healthData.goal === g ? 'text-white' : 'text-surface-500'}`}>{g}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>

                                <Pressable
                                    onPress={calculateGoals}
                                    className="bg-accent py-4 rounded-2xl items-center shadow-lg shadow-accent/20"
                                >
                                    <Text className="text-white font-sans-bold text-base">Calculate & Save Goals</Text>
                                </Pressable>
                            </GlassContainer>
                        </Animated.View>
                    </BlurView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

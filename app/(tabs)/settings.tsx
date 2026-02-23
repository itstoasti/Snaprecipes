import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { View, Text, Pressable, Platform, TextInput, Alert, KeyboardAvoidingView, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import GlassContainer from "@/components/GlassContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useRevenueCat } from "@/hooks/useRevenueCat";


export const AI_PROVIDER_STORE = "user_ai_provider";

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
    const { isPro } = useRevenueCat();

    // Supabase Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");

    useEffect(() => {
        SecureStore.getItemAsync(AI_PROVIDER_STORE).then(val => {
            if (val === "openai") setAiProvider("openai");
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
        if (error) Alert.alert("Error signing out", error.message);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-surface-950"
            style={{ paddingTop: Math.max(insets.top, 20) + 10 }}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                <Text className="text-surface-400 font-sans text-xs uppercase tracking-widest">
                    App
                </Text>
                <Text className="text-white font-sans-bold text-3xl mt-0.5 mb-6">
                    Settings
                </Text>

                {/* SnapRecipes Pro Upgrade Banner */}
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

                {/* AI Engine Preference */}
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
                                <Text className="text-surface-400 font-sans text-sm text-center mb-6 leading-5">
                                    Upgrade to SnapRecipes Pro to create an account and unlock secure, automatic cloud syncing across all your devices.
                                </Text>
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
                                    <Pressable className="flex-1 mr-2 bg-surface-800 py-3 rounded-lg flex-row items-center justify-center">
                                        <Ionicons name="sync" size={16} color="#34D399" className="mr-2" />
                                        <Text className="text-white font-sans-semibold text-sm">Sync Now</Text>
                                    </Pressable>
                                    <Pressable onPress={signOut} className="flex-1 ml-2 border border-surface-700 py-3 rounded-lg items-center justify-center">
                                        <Text className="text-surface-400 font-sans-semibold text-sm">Sign Out</Text>
                                    </Pressable>
                                </View>
                                <Text className="text-surface-500 font-sans text-xs text-center">
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

                {/* App Info */}
                <Text className="text-white font-sans-semibold text-lg mb-3">About</Text>
                <View className="bg-surface-900 rounded-2xl px-5 mb-6">
                    <SettingRow icon="information-circle" label="Version" value={appVersion} />
                    <SettingRow icon="hardware-chip" label="SDK" value="Expo 54" />
                    <SettingRow icon="server" label="Storage" value="Local SQLite" />
                </View>

                {/* Contact */}
                <View className="bg-surface-900 rounded-2xl px-5 mb-10">
                    <SettingRow
                        icon="logo-github"
                        label="Source Code"
                        onPress={() => Linking.openURL("https://github.com")}
                    />
                    <SettingRow
                        icon="mail"
                        label="Contact"
                        onPress={() => Linking.openURL("mailto:hello@snaprecipes.app")}
                    />
                </View>

                {/* Branding */}
                <View className="items-center mb-6">
                    <Text className="text-3xl mb-2">🍳</Text>
                    <Text className="text-white font-sans-bold text-lg">SnapRecipes</Text>
                    <Text className="text-surface-500 font-sans text-xs mt-1">
                        Save any recipe, instantly.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

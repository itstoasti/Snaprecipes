import React, { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { supabase } from "@/lib/supabase";
import { initialSync } from "@/lib/sync";

export default function AuthScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleEmailSignUp = async () => {
        if (!email || !password) return Alert.alert("Error", "Please enter an email and password.");
        if (password.length < 8) return Alert.alert("Weak Password", "Password must be at least 8 characters.");
        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            setLoading(false);
            Alert.alert("Sign Up Failed", error.message);
        } else {
            await initialSync();
            setLoading(false);
            Alert.alert("Welcome!", "Your account has been created and your recipes are syncing.");
            router.back();
        }
    };

    const handleEmailSignIn = async () => {
        if (!email || !password) return Alert.alert("Error", "Please enter an email and password.");
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setLoading(false);
            Alert.alert("Sign In Failed", error.message);
        } else {
            await initialSync();
            setLoading(false);
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-surface-950 px-6"
            style={{ paddingTop: Math.max(insets.top, 20) + 10 }}
        >
            <View className="flex-row items-center justify-between mb-8">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-surface-900"
                >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
                <Text className="text-white font-sans-bold text-lg">Sign In</Text>
                <View className="w-10" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1, justifyContent: "center" }}>
                <Animated.View entering={FadeIn.delay(200)} className="items-center mb-8">
                    <View className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center mb-6">
                        <Ionicons name="cloud-outline" size={36} color="#FF6B35" />
                    </View>
                    <Text className="text-white font-sans-bold text-3xl text-center mb-2">Cloud Sync</Text>
                    <Text className="text-surface-400 font-sans text-center px-4 leading-6">
                        Create an account or sign in to seamlessly sync your recipe library across all your devices.
                    </Text>
                </Animated.View>

                <Animated.View entering={SlideInDown.delay(300).springify()} className="bg-surface-900 rounded-3xl p-6 border border-surface-800">
                    <View className="flex-row items-center bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 mb-4">
                        <Ionicons name="mail" size={20} color="#9D9DB0" className="mr-3" />
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email address"
                            placeholderTextColor="#6E6E85"
                            className="flex-1 text-white font-sans text-base py-3"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />
                    </View>

                    <View className="flex-row items-center bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 mb-8">
                        <Ionicons name="lock-closed" size={20} color="#9D9DB0" className="mr-3" />
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor="#6E6E85"
                            className="flex-1 text-white font-sans text-base py-3"
                            secureTextEntry
                        />
                    </View>

                    <Pressable
                        onPress={handleEmailSignIn}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl items-center mb-4 ${loading ? 'bg-accent/50' : 'bg-accent'} shadow-lg shadow-accent/20`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text className="text-white font-sans-bold text-lg">Sign In</Text>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={handleEmailSignUp}
                        disabled={loading}
                        className="w-full py-4 rounded-xl items-center border border-surface-700 bg-surface-950"
                    >
                        <Text className="text-surface-300 font-sans-semibold text-lg">Create New Account</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

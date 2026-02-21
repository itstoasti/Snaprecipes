import React, { useRef, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { extractFromImage } from "@/lib/extract";
import { useRecipes } from "@/hooks/useRecipes";

export default function CameraScanner() {
    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const router = useRouter();
    const { insertRecipe } = useRecipes();

    const handleCapture = async () => {
        if (!cameraRef.current) return;

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
            });

            if (!photo?.base64) {
                throw new Error("Failed to capture photo");
            }

            const recipe = await extractFromImage(photo.base64);
            const recipeId = await insertRecipe(recipe, undefined, "camera");

            if (recipeId) {
                router.replace(`/recipe/${recipeId}`);
            } else {
                if (router.canGoBack()) {
                    router.back()
                } else {
                    router.replace("/(tabs)/");
                }
            }
        } catch (error: any) {
            Alert.alert("Scan Failed", error.message || "Could not extract recipe from this photo");
            setLoading(false);
        }
    };

    if (!permission) {
        return (
            <View className="flex-1 bg-surface-950 items-center justify-center">
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 bg-surface-950 items-center justify-center px-8">
                <Ionicons name="camera-outline" size={64} color="#6E6E85" />
                <Text className="text-white font-sans-bold text-xl mt-4 mb-2 text-center">
                    Camera Access Needed
                </Text>
                <Text className="text-surface-400 font-sans text-sm text-center mb-6">
                    Allow SnapRecipes to use your camera to scan physical recipes and handwritten cards.
                </Text>
                <Pressable
                    onPress={requestPermission}
                    className="bg-accent px-8 py-3 rounded-2xl"
                >
                    <Text className="text-white font-sans-semibold text-base">
                        Grant Permission
                    </Text>
                </Pressable>
                <Pressable onPress={() => {
                    if (router.canGoBack()) {
                        router.back()
                    } else {
                        router.replace("/(tabs)/");
                    }
                }} className="mt-4 p-2">
                    <Text className="text-surface-400 font-sans text-sm">Cancel</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
            >
                {/* Top bar */}
                <View
                    className="flex-row items-center justify-between px-6"
                    style={{ paddingTop: Platform.OS === "ios" ? 60 : 40 }}
                >
                    <Pressable
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back()
                            } else {
                                router.replace("/(tabs)/");
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                    >
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </Pressable>
                    <Text className="text-white font-sans-semibold text-base">
                        Scan Recipe
                    </Text>
                    <View className="w-10" />
                </View>

                {/* Center guide */}
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-full aspect-[3/4] rounded-3xl border-2 border-white/30">
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-white/60 font-sans text-sm text-center">
                                Position recipe within frame
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Capture button */}
                <View className="items-center pb-12">
                    {loading ? (
                        <View className="w-20 h-20 rounded-full bg-accent/80 items-center justify-center">
                            <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                    ) : (
                        <Pressable
                            onPress={handleCapture}
                            className="w-20 h-20 rounded-full bg-white items-center justify-center"
                            style={{
                                shadowColor: "#FF6B35",
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.5,
                                shadowRadius: 20,
                            }}
                        >
                            <View className="w-16 h-16 rounded-full bg-white border-4 border-surface-950" />
                        </Pressable>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

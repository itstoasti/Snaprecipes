import React, { useRef, useState, useCallback } from "react";
import {
    View, Text, Pressable, Alert, ActivityIndicator, Platform, ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFoodLog } from "@/hooks/useFoodLog";
import { supabase } from "@/lib/supabase";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

interface ScannedFood {
    food_name: string;
    serving_size: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar?: number | null;
    fiber?: number | null;
    sodium?: number | null;
}

export default function ScanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const params = useLocalSearchParams<{ date: string; mealType: string; mode: string }>();
    const logDate = params.date || new Date().toISOString().split("T")[0];
    const mealType = (params.mealType || "snack") as "breakfast" | "lunch" | "dinner" | "snack";
    const initialMode = (params.mode || "photo") as "photo" | "barcode";

    const { addFoodLog, saveCustomFood } = useFoodLog();

    const [mode, setMode] = useState<"photo" | "barcode">(initialMode);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ScannedFood[] | null>(null);
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [confidence, setConfidence] = useState<string>("");
    const [barcodeProcessing, setBarcodeProcessing] = useState(false);

    // ── Photo Capture → AI Analysis ──
    const analyzeBase64 = useCallback(async (base64: string) => {
        setLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || supabaseKey;

            const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "apikey": supabaseKey!,
                },
                body: JSON.stringify({ imageBase64: base64 }),
            });

            if (!response.ok) throw new Error("AI analysis failed");

            const data = await response.json();
            setResults(data.items || []);
            setConfidence(data.confidence || "medium");
        } catch (error: any) {
            Alert.alert("Scan Failed", error.message || "Could not analyze food photo");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
            });

            if (!photo?.base64) throw new Error("Failed to capture photo");
            await analyzeBase64(photo.base64);
        } catch (error: any) {
            Alert.alert("Capture Failed", error.message || "Could not take photo");
        }
    }, [loading, analyzeBase64]);

    // ── Pick from Gallery → AI Analysis ──
    const handlePickFromGallery = useCallback(async () => {
        if (loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                base64: true,
                quality: 0.7,
            });

            if (result.canceled || !result.assets?.[0]?.base64) return;
            await analyzeBase64(result.assets[0].base64);
        } catch (error: any) {
            Alert.alert("Gallery Failed", error.message || "Could not load image");
        }
    }, [loading, analyzeBase64]);

    // ── Barcode Scanned ──
    const handleBarcodeScanned = useCallback(async ({ data: barcode }: { data: string }) => {
        if (barcodeProcessing || scannedBarcode === barcode) return;
        setBarcodeProcessing(true);
        setScannedBarcode(barcode);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            // Step 1: Check local custom_foods for this barcode
            // (handled by the hook — we skip here for speed and go to Open Food Facts)

            // Step 2: Query Open Food Facts API (free, no API key needed)
            const offResp = await fetch(
                `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
            );

            if (offResp.ok) {
                const offData = await offResp.json();
                if (offData.status === 1 && offData.product) {
                    const p = offData.product;
                    const n = p.nutriments || {};
                    const item: ScannedFood = {
                        food_name: p.product_name || p.generic_name || "Unknown Product",
                        serving_size: p.serving_size || p.quantity || "1 serving",
                        calories: Math.round(n["energy-kcal_serving"] || n["energy-kcal_100g"] || 0),
                        protein: Math.round((n.proteins_serving || n.proteins_100g || 0) * 10) / 10,
                        fat: Math.round((n.fat_serving || n.fat_100g || 0) * 10) / 10,
                        carbs: Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10,
                        sugar: n.sugars_serving || n.sugars_100g || null,
                        fiber: n.fiber_serving || n.fiber_100g || null,
                        sodium: n.sodium_serving ? Math.round(n.sodium_serving * 1000) : null,
                    };
                    setResults([item]);
                    setConfidence("high");
                    setBarcodeProcessing(false);
                    return;
                }
            }

            // Step 3: Not found in Open Food Facts — try AI with text description
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || supabaseKey;

            const aiResp = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "apikey": supabaseKey!,
                },
                body: JSON.stringify({ textDescription: `Product with barcode ${barcode}` }),
            });

            if (aiResp.ok) {
                const aiData = await aiResp.json();
                setResults(aiData.items || []);
                setConfidence(aiData.confidence || "low");
            } else {
                Alert.alert("Not Found", `Barcode ${barcode} not found in our database. Try scanning the nutrition label with the photo scanner instead.`);
            }
        } catch (e: any) {
            Alert.alert("Lookup Failed", e.message || "Could not look up barcode");
        } finally {
            setBarcodeProcessing(false);
        }
    }, [barcodeProcessing, scannedBarcode]);

    // ── Log a scanned result ──
    const handleLogScannedFood = useCallback(async (food: ScannedFood) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Save to local custom_foods for future lookups
        await saveCustomFood({
            food_name: food.food_name,
            brand: null,
            serving_size: food.serving_size,
            barcode: scannedBarcode || null,
            calories: food.calories,
            protein: food.protein,
            fat: food.fat,
            carbs: food.carbs,
            sugar: food.sugar || null,
            fiber: food.fiber || null,
            sodium: food.sodium || null,
            image_url: null,
        });

        await addFoodLog({
            food_name: food.food_name,
            brand: null,
            serving_size: food.serving_size,
            serving_qty: 1,
            calories: food.calories,
            protein: food.protein,
            fat: food.fat,
            carbs: food.carbs,
            sugar: food.sugar || null,
            fiber: food.fiber || null,
            sodium: food.sodium || null,
            meal_type: mealType,
            log_date: logDate,
            source_type: mode === "barcode" ? "barcode" : "photo",
            source_recipe_id: null,
            image_url: null,
            barcode: scannedBarcode || null,
        });

        // Go back two screens (scan → add-food → dashboard)
        router.back();
        setTimeout(() => router.back(), 100);
    }, [addFoodLog, saveCustomFood, mealType, logDate, mode, scannedBarcode, router]);

    // ── Reset to camera ──
    const handleRetake = useCallback(() => {
        setResults(null);
        setScannedBarcode(null);
        setConfidence("");
    }, []);

    // ── Permission states ──
    if (!permission) {
        return <View className="flex-1 bg-surface-950 items-center justify-center"><ActivityIndicator size="large" color="#EF4444" /></View>;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 bg-surface-950 items-center justify-center px-8">
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="camera-outline" size={64} color="#6E6E85" />
                <Text className="text-white font-sans-bold text-xl mt-4 mb-2 text-center">Camera Access Needed</Text>
                <Text className="text-surface-400 font-sans text-sm text-center mb-6">
                    Allow SnapRecipes to use your camera to scan food and barcodes.
                </Text>
                <Pressable onPress={requestPermission} style={{ backgroundColor: "#EF4444", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16 }}>
                    <Text className="text-white font-sans-bold text-base">Grant Permission</Text>
                </Pressable>
                <Pressable onPress={() => router.back()} className="mt-4 p-2">
                    <Text className="text-surface-400 font-sans text-sm">Cancel</Text>
                </Pressable>
            </View>
        );
    }

    // ── Results View ──
    if (results !== null) {
        return (
            <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View className="px-5 flex-row items-center justify-between mb-4">
                    <Pressable onPress={handleRetake} className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </Pressable>
                    <Text className="text-white font-sans-bold text-xl">Results</Text>
                    <View className="w-10" />
                </View>

                {confidence && (
                    <View className="flex-row items-center justify-center mb-3">
                        <View style={{
                            backgroundColor: confidence === "high" ? "rgba(52,211,153,0.15)" : confidence === "medium" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
                            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
                        }}>
                            <Text style={{
                                color: confidence === "high" ? "#34D399" : confidence === "medium" ? "#FBBF24" : "#EF4444",
                                fontFamily: "Inter_600SemiBold", fontSize: 11,
                            }}>
                                {confidence.toUpperCase()} CONFIDENCE
                            </Text>
                        </View>
                    </View>
                )}

                <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
                    {results.length === 0 ? (
                        <View className="items-center py-16 opacity-50">
                            <Ionicons name="alert-circle-outline" size={48} color="#FFF" />
                            <Text className="text-white font-sans mt-3 text-center">No food items identified. Try again with better lighting.</Text>
                        </View>
                    ) : (
                        results.map((item, idx) => (
                            <Animated.View key={idx} entering={FadeInDown.delay(idx * 80)}>
                                <GlassContainer style={{ borderRadius: 20, marginBottom: 12 }} className="p-4">
                                    <Text className="text-white font-sans-bold text-base mb-1">{item.food_name}</Text>
                                    <Text className="text-surface-400 font-sans text-xs mb-3">{item.serving_size}</Text>

                                    {/* Macro grid */}
                                    <View className="flex-row flex-wrap mb-3">
                                        {[
                                            { label: "Calories", value: `${Math.round(item.calories)}`, color: "#EF4444" },
                                            { label: "Protein", value: `${Math.round(item.protein)}g`, color: "#60A5FA" },
                                            { label: "Carbs", value: `${Math.round(item.carbs)}g`, color: "#FBBF24" },
                                            { label: "Fat", value: `${Math.round(item.fat)}g`, color: "#F472B6" },
                                        ].map((m) => (
                                            <View key={m.label} style={{ width: "25%", alignItems: "center", paddingVertical: 6 }}>
                                                <Text style={{ color: m.color, fontFamily: "Inter_700Bold", fontSize: 16 }}>{m.value}</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-1">{m.label}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Pressable
                                        onPress={() => handleLogScannedFood(item)}
                                        style={{ backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                                    >
                                        <Text className="text-white font-sans-bold text-sm">Add to Log</Text>
                                    </Pressable>
                                </GlassContainer>
                            </Animated.View>
                        ))
                    )}

                    <Pressable onPress={handleRetake} className="items-center mt-2">
                        <Text className="text-surface-400 font-sans text-sm">Scan Again</Text>
                    </Pressable>
                </ScrollView>
            </View>
        );
    }

    // ── Camera View ──
    return (
        <View className="flex-1 bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={mode === "barcode" ? { barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] } : undefined}
                onBarcodeScanned={mode === "barcode" ? handleBarcodeScanned : undefined}
            >
                {/* Top bar */}
                <View className="flex-row items-center justify-between px-6" style={{ paddingTop: Platform.OS === "ios" ? 60 : 40 }}>
                    <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-black/50 items-center justify-center">
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </Pressable>
                    <Text className="text-white font-sans-bold text-base">
                        {mode === "photo" ? "Scan Food" : "Scan Barcode"}
                    </Text>
                    <View className="w-10" />
                </View>

                {/* Mode toggle */}
                <View className="flex-row mx-auto mt-4 bg-black/40 rounded-full p-1">
                    <Pressable
                        onPress={() => setMode("photo")}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
                            backgroundColor: mode === "photo" ? "#EF4444" : "transparent",
                        }}
                    >
                        <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Photo</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => { setMode("barcode"); setScannedBarcode(null); }}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
                            backgroundColor: mode === "barcode" ? "#FBBF24" : "transparent",
                        }}
                    >
                        <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Barcode</Text>
                    </Pressable>
                </View>

                {/* Center guide */}
                <View className="flex-1 items-center justify-center px-10">
                    {mode === "photo" ? (
                        <View className="w-full aspect-square rounded-3xl border-2 border-white/30">
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-white/60 font-sans text-sm text-center">Position food within frame</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={{ width: "90%", height: 200, borderRadius: 20, borderWidth: 2, borderColor: "rgba(251,191,36,0.5)", alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="barcode-outline" size={64} color="rgba(251,191,36,0.5)" />
                            <Text className="text-white/60 font-sans text-sm text-center mt-2">
                                {barcodeProcessing ? "Looking up..." : "Align barcode in this area"}
                            </Text>
                            {barcodeProcessing && <ActivityIndicator size="small" color="#FBBF24" style={{ marginTop: 8 }} />}
                        </View>
                    )}
                </View>

                {/* Capture button (photo mode only) */}
                {mode === "photo" && (
                    <View className="flex-row items-center justify-center pb-12" style={{ gap: 28 }}>
                        {/* Gallery button */}
                        <Pressable
                            onPress={handlePickFromGallery}
                            style={{
                                width: 48, height: 48, borderRadius: 16,
                                backgroundColor: "rgba(255,255,255,0.15)",
                                alignItems: "center", justifyContent: "center",
                                borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
                            }}
                        >
                            <Ionicons name="images" size={24} color="#FFFFFF" />
                        </Pressable>

                        {/* Shutter button */}
                        {loading ? (
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(239,68,68,0.8)", alignItems: "center", justifyContent: "center" }}>
                                <ActivityIndicator size="large" color="#FFFFFF" />
                            </View>
                        ) : (
                            <Pressable
                                onPress={handleCapture}
                                style={{
                                    width: 80, height: 80, borderRadius: 40,
                                    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
                                    shadowColor: "#EF4444", shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.5, shadowRadius: 20,
                                }}
                            >
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF", borderWidth: 4, borderColor: "#0A0A0F" }} />
                            </Pressable>
                        )}

                        {/* Spacer to keep shutter centered */}
                        <View style={{ width: 48, height: 48 }} />
                    </View>
                )}

                {/* Barcode mode — no capture button, auto-scans */}
                {mode === "barcode" && (
                    <View className="items-center pb-12">
                        <Text className="text-white/40 font-sans text-xs">Auto-detects barcodes</Text>
                    </View>
                )}
            </CameraView>
        </View>
    );
}

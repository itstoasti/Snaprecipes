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
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { AI_PROVIDER_STORE } from "@/lib/constants";

interface ScannedFood {
    food_name: string;
    brand: string | null;
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
    const [qty, setQty] = useState(1);

    // ── Photo Capture → AI Analysis ──
    const analyzeBase64 = useCallback(async (base64: string) => {
        setLoading(true);
        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || supabaseKey;

            const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

            const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "apikey": supabaseKey!,
                },
                body: JSON.stringify({ imageBase64: base64, provider }),
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

    const handleBarcodeScanned = useCallback(async ({ data: barcode }: { data: string }) => {
        if (barcodeProcessing || scannedBarcode === barcode) return;
        setBarcodeProcessing(true);
        setScannedBarcode(barcode);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const offResp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
            if (offResp.ok) {
                const offData = await offResp.json();
                if (offData.status === 1 && offData.product) {
                    const p = offData.product;
                    const n = p.nutriments || {};

                    // Helper to get value per serving, with safe 100g -> serving calculation
                    const getNutrient = (servingKey: string, g100Key: string) => {
                        if (n[servingKey] !== undefined && n[servingKey] !== null) return n[servingKey];
                        if (n[g100Key] !== undefined && n[g100Key] !== null) {
                            // 1. Check if OFF provided a direct serving_quantity number (best)
                            if (p.serving_quantity) {
                                return (n[g100Key] * Number(p.serving_quantity)) / 100;
                            }
                            // 2. Try to parse serving weight from string like "32 g (2 tbsp)"
                            const servingStr = p.serving_size || "";
                            const weightMatch = servingStr.match(/(\d+(?:\.\d+)?)\s*g/i);
                            if (weightMatch) {
                                const weight = parseFloat(weightMatch[1]);
                                return (n[g100Key] * weight) / 100;
                            }
                            // 3. HARD FALLBACK for common dense foods if everything else fails
                            const name = (p.product_name || p.generic_name || "").toLowerCase();
                            if (name.includes("peanut butter")) return (n[g100Key] * 32) / 100;
                            if (name.includes("bread")) return (n[g100Key] * 38) / 100;
                            
                            return n[g100Key];
                        }
                        return 0;
                    };

                    const rawCalories = getNutrient("energy-kcal_serving", "energy-kcal_100g");
                    // Detect if we're forced to use 100g values without scaling
                    const isUnscaled100g = n["energy-kcal_serving"] === undefined && !p.serving_size?.match(/(\d+(?:\.\d+)?)\s*g/i);

                    const item: ScannedFood = {
                        food_name: p.product_name || p.generic_name || "Unknown Product",
                        brand: p.brands || null,
                        serving_size: isUnscaled100g ? "100g serving" : (p.serving_size || "1 serving"),
                        calories: Math.round(rawCalories),
                        protein: Math.round(getNutrient("proteins_serving", "proteins_100g") * 10) / 10,
                        fat: Math.round(getNutrient("fat_serving", "fat_100g") * 10) / 10,
                        carbs: Math.round(getNutrient("carbohydrates_serving", "carbohydrates_100g") * 10) / 10,
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

            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || supabaseKey;

            const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

            const aiResp = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "apikey": supabaseKey!,
                },
                body: JSON.stringify({ 
                    textDescription: `Product with barcode ${barcode}`,
                    provider
                }),
            });

            if (aiResp.ok) {
                const aiData = await aiResp.json();
                setResults(aiData.items || []);
                setConfidence(aiData.confidence || "low");
            } else {
                Alert.alert("Not Found", `Barcode ${barcode} not found. Try scanning the nutrition label with the photo scanner instead.`);
            }
        } catch (e: any) {
            Alert.alert("Lookup Failed", e.message || "Could not look up barcode");
        } finally {
            setBarcodeProcessing(false);
        }
    }, [barcodeProcessing, scannedBarcode]);

    const handleLogScannedFood = useCallback(async (food: ScannedFood) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await saveCustomFood({
            food_name: food.food_name,
            brand: food.brand,
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
            brand: food.brand,
            serving_size: food.serving_size,
            serving_qty: qty,
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
        router.back();
        setTimeout(() => router.back(), 100);
    }, [addFoodLog, saveCustomFood, mealType, logDate, mode, scannedBarcode, router, qty]);

    const handleRetake = useCallback(() => {
        setResults(null);
        setScannedBarcode(null);
        setConfidence("");
        setQty(1);
    }, []);

    if (!permission) return <View className="flex-1 bg-surface-950 items-center justify-center"><ActivityIndicator size="large" color="#EF4444" /></View>;
    if (!permission.granted) {
        return (
            <View className="flex-1 bg-surface-950 items-center justify-center px-8">
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="camera-outline" size={64} color="#6E6E85" />
                <Text className="text-white font-sans-bold text-xl mt-4 mb-2 text-center">Camera Access Needed</Text>
                <Pressable onPress={requestPermission} style={{ backgroundColor: "#EF4444", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16 }}>
                    <Text className="text-white font-sans-bold text-base">Grant Permission</Text>
                </Pressable>
            </View>
        );
    }

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
                <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
                    {results.map((item, idx) => (
                        <Animated.View key={idx} entering={FadeInDown.delay(idx * 80)}>
                            <GlassContainer style={{ borderRadius: 20, marginBottom: 12 }} className="p-4">
                                <Text className="text-white font-sans-bold text-base mb-1">{item.food_name}</Text>
                                <Text className="text-surface-400 font-sans text-xs mb-3">{item.serving_size}</Text>
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

                                {/* Quantity Selector */}
                                <View className="flex-row items-center justify-between bg-white/5 rounded-2xl px-5 py-4 mb-4 border border-white/10">
                                    <View>
                                        <Text className="text-white font-sans-bold text-sm">Number of Servings</Text>
                                        <Text className="text-surface-500 font-sans text-[10px] mt-0.5">Total: {Math.round(item.calories * qty)} kcal</Text>
                                    </View>
                                    <View className="flex-row items-center" style={{ gap: 16 }}>
                                        <Pressable 
                                            onPress={() => setQty(Math.max(0.5, qty - 0.5))} 
                                            className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                        >
                                            <Ionicons name="remove" size={20} color="white" />
                                        </Pressable>
                                        <Text className="text-white font-sans-bold text-lg min-w-[24px] text-center">{qty}</Text>
                                        <Pressable 
                                            onPress={() => setQty(qty + 0.5)} 
                                            className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                        >
                                            <Ionicons name="add" size={20} color="white" />
                                        </Pressable>
                                    </View>
                                </View>

                                <Pressable onPress={() => handleLogScannedFood(item)} style={{ backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}>
                                    <Text className="text-white font-sans-bold text-sm">Add {qty} {qty === 1 ? "Serving" : "Servings"} to Log</Text>
                                </Pressable>
                            </GlassContainer>
                        </Animated.View>
                    ))}
                    <Pressable onPress={handleRetake} className="items-center mt-2">
                        <Text className="text-surface-400 font-sans text-sm">Scan Again</Text>
                    </Pressable>
                </ScrollView>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={mode === "barcode" ? { barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] } : undefined}
                onBarcodeScanned={mode === "barcode" ? handleBarcodeScanned : undefined}
            />
            <View className="absolute inset-0 pointer-events-box-none">
                <View className="flex-row items-center justify-between px-6" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
                    <Pressable onPress={() => router.back()} className="w-12 h-12 rounded-full bg-black/40 items-center justify-center" hitSlop={20}>
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </Pressable>
                    <View className="bg-black/40 px-4 py-2 rounded-full">
                        <Text className="text-white font-sans-bold text-xs uppercase tracking-widest">{mode === "barcode" ? "Barcode" : "AI Photo"}</Text>
                    </View>
                    <View className="w-12" />
                </View>
                <View className="flex-row mx-auto mt-4 bg-black/40 rounded-full p-1" style={{ pointerEvents: 'auto' }}>
                    <Pressable onPress={() => setMode("photo")} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: mode === "photo" ? "#EF4444" : "transparent" }}>
                        <Text className="text-white font-sans-bold text-xs">Photo</Text>
                    </Pressable>
                    <Pressable onPress={() => { setMode("barcode"); setScannedBarcode(null); }} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: mode === "barcode" ? "#FBBF24" : "transparent" }}>
                        <Text className="text-white font-sans-bold text-xs">Barcode</Text>
                    </Pressable>
                </View>
                <View className="flex-1 items-center justify-center px-10">
                    {mode === "photo" ? <View className="w-full aspect-square rounded-3xl border-2 border-white/30" /> : (
                        <View style={{ width: "90%", height: 200, borderRadius: 20, borderWidth: 2, borderColor: "rgba(251,191,36,0.5)", alignItems: "center", justifyContext: "center" }}>
                            <Ionicons name="barcode-outline" size={64} color="rgba(251,191,36,0.5)" />
                            <Text className="text-white/60 font-sans text-sm text-center mt-2">{barcodeProcessing ? "Looking up..." : "Align barcode in this area"}</Text>
                        </View>
                    )}
                </View>
                <View className="absolute bottom-0 left-0 right-0 p-8 pb-12" style={{ pointerEvents: 'auto' }}>
                    {mode === "photo" && (
                        <View className="flex-row items-center justify-center" style={{ gap: 28 }}>
                            <Pressable onPress={handlePickFromGallery} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
                                <Ionicons name="images" size={24} color="#FFFFFF" />
                            </Pressable>
                            {loading ? <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(239,68,68,0.8)", alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color="#FFFFFF" /></View> : (
                                <Pressable onPress={handleCapture} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF", borderWidth: 4, borderColor: "#0A0A0F" }} />
                                </Pressable>
                            )}
                            <View style={{ width: 48, height: 48 }} />
                        </View>
                    )}
                    {mode === "barcode" && <View className="items-center"><Text className="text-white/40 font-sans text-xs">Auto-detects barcodes</Text></View>}
                </View>
                {(loading || barcodeProcessing) && (
                    <View className="absolute inset-0 bg-black/60 items-center justify-center">
                        <ActivityIndicator size="large" color="#EF4444" />
                        <Text className="text-white font-sans-bold mt-4">{barcodeProcessing ? "Identifying Barcode..." : "AI is Analyzing..."}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

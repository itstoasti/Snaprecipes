import React, { useRef, useState, useCallback, useEffect } from "react";
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

const MEAL_TYPES = [
    { key: "breakfast", label: "Breakfast", icon: "sunny" },
    { key: "lunch", label: "Lunch", icon: "restaurant" },
    { key: "dinner", label: "Dinner", icon: "moon" },
    { key: "snack", label: "Snack", icon: "nutrition" },
] as const;

export default function ScanScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const params = useLocalSearchParams<{ date: string; mealType: string; mode: string }>();
    const logDate = params.date || new Date().toISOString().split("T")[0];
    const mealType = (params.mealType || "snack") as "breakfast" | "lunch" | "dinner" | "snack";
    const initialMode = (params.mode || "barcode") as "photo" | "barcode";
    const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(mealType);

    const { addFoodLog, saveCustomFood } = useFoodLog();

    const [mode, setMode] = useState<"photo" | "barcode">(initialMode);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ScannedFood[] | null>(null);
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [confidence, setConfidence] = useState<string>("");
    const [barcodeProcessing, setBarcodeProcessing] = useState(false);
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [cameraReady, setCameraReady] = useState(false);
    const [loggedIndexes, setLoggedIndexes] = useState<number[]>([]);

    // Automatically select all items and default quantities to 1 when results load
    useEffect(() => {
        if (results) {
            setSelectedIndexes(results.map((_, idx) => idx));
            const initialQuantities: Record<number, number> = {};
            results.forEach((_, idx) => {
                initialQuantities[idx] = 1;
            });
            setQuantities(initialQuantities);
        } else {
            setSelectedIndexes([]);
            setQuantities({});
        }
    }, [results]);

    // Delay camera mount to avoid crash during screen transition animation
    useEffect(() => {
        const timer = setTimeout(() => setCameraReady(true), 350);
        return () => clearTimeout(timer);
    }, []);

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
                mediaTypes: ['images'],
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

    const handleLogSelectedFoods = useCallback(async () => {
        if (!results || selectedIndexes.length === 0) return;
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            for (const idx of selectedIndexes) {
                const food = results[idx];
                const itemQty = quantities[idx] || 1;

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
                    serving_qty: itemQty,
                    calories: food.calories,
                    protein: food.protein,
                    fat: food.fat,
                    carbs: food.carbs,
                    sugar: food.sugar || null,
                    fiber: food.fiber || null,
                    sodium: food.sodium || null,
                    meal_type: selectedMealType,
                    log_date: logDate,
                    source_type: mode === "barcode" ? "barcode" : "photo",
                    source_recipe_id: null,
                    image_url: null,
                    barcode: scannedBarcode || null,
                });
            }

            // Move selected indexes to logged indexes
            setLoggedIndexes(prev => [...prev, ...selectedIndexes]);
            // Clear selections
            setSelectedIndexes([]);
        } catch (error: any) {
            Alert.alert("Log Failed", error.message || "Could not log foods");
        } finally {
            setLoading(false);
        }
    }, [results, selectedIndexes, quantities, scannedBarcode, saveCustomFood, addFoodLog, selectedMealType, logDate, mode]);

    const handleRetake = useCallback(() => {
        setResults(null);
        setScannedBarcode(null);
        setConfidence("");
        setLoggedIndexes([]);
        setSelectedIndexes([]);
        setQuantities({});
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
                {/* Header */}
                <View className="px-5 flex-row items-center justify-between mb-4">
                    <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center">
                        <Ionicons name="close" size={20} color="#FFFFFF" />
                    </Pressable>
                    <Text className="text-white font-sans-bold text-xl">Results</Text>
                    <Pressable onPress={handleRetake} className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center">
                        <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
                <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Global Meal Category Selection */}
                    <Animated.View entering={FadeInDown.delay(50)}>
                        <GlassContainer style={{ borderRadius: 20, marginBottom: 16 }} className="p-4">
                            <Text className="text-white font-sans-bold text-sm mb-3">Meal Category for this plate</Text>
                            <View className="flex-row bg-white/5 rounded-2xl p-1 border border-white/5">
                                {MEAL_TYPES.map((t) => {
                                    const isSelected = selectedMealType === t.key;
                                    return (
                                        <Pressable
                                            key={t.key}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedMealType(t.key);
                                            }}
                                            className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                                            style={isSelected ? { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)" } : undefined}
                                        >
                                            <Ionicons name={t.icon as any} size={14} color={isSelected ? "#EF4444" : "#6E6E85"} />
                                            <Text className="font-sans-bold text-[10px] ml-1" style={{ color: isSelected ? "#EF4444" : "#6E6E85" }}>
                                                {t.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </GlassContainer>
                    </Animated.View>

                    {/* Items List */}
                    {results.map((item, idx) => {
                        const isLogged = loggedIndexes.includes(idx);
                        const isSelected = selectedIndexes.includes(idx);
                        const itemQty = quantities[idx] || 1;

                        return (
                            <Animated.View key={idx} entering={FadeInDown.delay(idx * 80 + 100)}>
                                <GlassContainer style={{ borderRadius: 20, marginBottom: 12 }} className="p-4">
                                    <Pressable
                                        onPress={() => {
                                            if (isLogged) return;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedIndexes(prev =>
                                                prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                            );
                                        }}
                                        className="flex-row items-center mb-1"
                                    >
                                        {/* Checkbox */}
                                        {!isLogged && (
                                            <View className="mr-3">
                                                {isSelected ? (
                                                    <View className="w-6 h-6 rounded-full bg-red-500 items-center justify-center">
                                                        <Ionicons name="checkmark" size={16} color="white" />
                                                    </View>
                                                ) : (
                                                    <View className="w-6 h-6 rounded-full border-2 border-white/20 items-center justify-center bg-white/5" />
                                                )}
                                            </View>
                                        )}
                                        
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-bold text-base">{item.food_name}</Text>
                                            <Text className="text-surface-400 font-sans text-xs">{item.serving_size}</Text>
                                        </View>
                                        
                                        {isLogged && (
                                            <View style={{ backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)" }}>
                                                <Text style={{ color: "#10B981", fontSize: 11 }} className="font-sans-bold">Logged ✓</Text>
                                            </View>
                                        )}
                                    </Pressable>

                                    {/* Macro Breakdown (scaled in real-time) */}
                                    <View className="flex-row flex-wrap mb-2 mt-3">
                                        {[
                                            { label: "Calories", value: `${Math.round(item.calories * itemQty)}`, color: "#EF4444" },
                                            { label: "Protein", value: `${Math.round(item.protein * itemQty)}g`, color: "#60A5FA" },
                                            { label: "Carbs", value: `${Math.round(item.carbs * itemQty)}g`, color: "#FBBF24" },
                                            { label: "Fat", value: `${Math.round(item.fat * itemQty)}g`, color: "#F472B6" },
                                        ].map((m) => (
                                            <View key={m.label} style={{ width: "25%", alignItems: "center", paddingVertical: 4 }}>
                                                <Text style={{ color: m.color, fontFamily: "Inter_700Bold", fontSize: 16 }}>{m.value}</Text>
                                                <Text className="text-surface-500 font-sans text-[10px] mt-0.5">{m.label}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Quantity Stepper (specific to this item, visible only if selected & not logged) */}
                                    {!isLogged && isSelected && (
                                        <View className="flex-row items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5 mt-3">
                                            <View>
                                                <Text className="text-white font-sans-bold text-xs">Number of Servings</Text>
                                                <Text className="text-surface-500 font-sans text-[9px] mt-0.5">Total: {Math.round(item.calories * itemQty)} kcal</Text>
                                            </View>
                                            <View className="flex-row items-center" style={{ gap: 12 }}>
                                                <Pressable 
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setQuantities(prev => ({
                                                            ...prev,
                                                            [idx]: Math.max(0.5, (prev[idx] || 1) - 0.5)
                                                        }));
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                                >
                                                    <Ionicons name="remove" size={16} color="white" />
                                                </Pressable>
                                                <Text className="text-white font-sans-bold text-sm min-w-[20px] text-center">
                                                    {itemQty}
                                                </Text>
                                                <Pressable 
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setQuantities(prev => ({
                                                            ...prev,
                                                            [idx]: (prev[idx] || 1) + 0.5
                                                        }));
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                                >
                                                    <Ionicons name="add" size={16} color="white" />
                                                </Pressable>
                                            </View>
                                        </View>
                                    )}
                                </GlassContainer>
                            </Animated.View>
                        );
                    })}

                    {/* Batch Log Button */}
                    {selectedIndexes.length > 0 && (
                        <Pressable 
                            onPress={handleLogSelectedFoods} 
                            style={{ backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 }}
                        >
                            <Text className="text-white font-sans-bold text-base">
                                Log {selectedIndexes.length} Selected {selectedIndexes.length === 1 ? "Item" : "Items"}
                            </Text>
                        </Pressable>
                    )}

                    {/* Done Logging / Finish Button */}
                    {loggedIndexes.length > 0 && (
                        <Pressable 
                            onPress={() => router.replace("/library/calorie-counter")} 
                            style={{ backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8, marginBottom: 16 }}
                        >
                            <Text className="text-white font-sans-bold text-base">Done Logging</Text>
                        </Pressable>
                    )}

                    {/* Scan Another Photo */}
                    <Pressable onPress={handleRetake} className="items-center mt-4 mb-8">
                        <Text className="text-surface-400 font-sans text-sm">Scan Another Photo</Text>
                    </Pressable>
                </ScrollView>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            {cameraReady ? (
                <CameraView
                    ref={cameraRef}
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={mode === "barcode" ? { barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] } : undefined}
                    onBarcodeScanned={mode === "barcode" ? handleBarcodeScanned : undefined}
                />
            ) : (
                <View style={{ flex: 1, backgroundColor: '#000' }} />
            )}
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
                        <View style={{ width: "90%", height: 200, borderRadius: 20, borderWidth: 2, borderColor: "rgba(251,191,36,0.5)", alignItems: "center", justifyContent: "center" }}>
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

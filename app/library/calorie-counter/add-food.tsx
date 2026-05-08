import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    View, Text, Pressable, TextInput, FlatList, Alert,
    KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFoodLog } from "@/hooks/useFoodLog";
import { useRecipes } from "@/hooks/useRecipes";
import { supabase } from "@/lib/supabase";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type Tab = "search" | "scan" | "quick" | "recipe";

interface FoodResult {
    id?: number;
    food_name: string;
    brand?: string | null;
    serving_size?: string | null;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar?: number | null;
    fiber?: number | null;
    sodium?: number | null;
    sodium?: number | null;
    source: "local" | "ai" | "community";
}

interface QuickAddState {
    food_name: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    serving_size: string;
}

const EMPTY_QUICK: QuickAddState = {
    food_name: "", calories: "", protein: "", carbs: "", fat: "", serving_size: "",
};

export default function AddFoodScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ date: string; mealType: string }>();
    const logDate = params.date || new Date().toISOString().split("T")[0];
    const mealType = (params.mealType || "snack") as "breakfast" | "lunch" | "dinner" | "snack";

    const { addFoodLog, searchCustomFoods, saveCustomFood } = useFoodLog();
    const { recipes } = useRecipes();

    const [tab, setTab] = useState<Tab>("search");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [aiLookedUp, setAiLookedUp] = useState(false);
    const [quick, setQuick] = useState<QuickAddState>(EMPTY_QUICK);
    const [recipeSearch, setRecipeSearch] = useState("");

    // Debounce timer ref
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Smart Search: local DB first, then AI ──
    const performSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            // Show frequent items when empty
            try {
                const frequent = await searchCustomFoods("");
                setSearchResults(frequent.map((f: any) => ({ ...f, source: "local" as const })));
            } catch (e) {
                console.warn("Failed to load frequent foods:", e);
                setSearchResults([]);
            }
            setAiLookedUp(false);
            setSearching(false);
            return;
        }

        setSearching(true);
        setAiLookedUp(false);

        try {
            // Step 1: Search local custom_foods
            let localResults: any[] = [];
            try {
                localResults = await searchCustomFoods(q);
            } catch (e) {
                console.warn("Local food search failed (table may not exist yet):", e);
            }

            if (localResults.length > 0) {
                setSearchResults(localResults.map((f: any) => ({ ...f, source: "local" as const })));
                return;
            }

            // Step 2: Search community global_foods in Supabase
            try {
                const { data: globalData, error: globalError } = await supabase
                    .from("global_foods")
                    .select("*")
                    .ilike("food_name_lower", `%${q.toLowerCase()}%`)
                    .order("lookup_count", { ascending: false })
                    .limit(5);

                if (!globalError && globalData && globalData.length > 0) {
                    setSearchResults(globalData.map((f: any) => ({
                        ...f,
                        source: "community" as const,
                    })));
                    
                    // Increment lookup count asynchronously
                    const topMatch = globalData[0];
                    supabase.rpc('increment_lookup_count', { row_id: topMatch.id }).catch(() => {});
                    return;
                }
            } catch (e) {
                console.warn("Global food search failed:", e);
            }

            // Step 3: No local or global results — ask AI to estimate nutrition
            setSearchResults([]);
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.warn("Supabase env vars not set, cannot call AI");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || supabaseKey;

            const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "apikey": supabaseKey,
                },
                body: JSON.stringify({ textDescription: q }),
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => "unknown");
                console.warn("AI lookup failed:", response.status, errText);
                setAiLookedUp(true);
                return;
            }

            const data = await response.json();
            const items: FoodResult[] = (data.items || []).map((item: any) => ({
                food_name: item.food_name || q,
                serving_size: item.serving_size || "1 serving",
                calories: item.calories || 0,
                protein: item.protein || 0,
                fat: item.fat || 0,
                carbs: item.carbs || 0,
                sugar: item.sugar || null,
                fiber: item.fiber || null,
                sodium: item.sodium || null,
                source: "ai" as const,
            }));

            setSearchResults(items);
            setAiLookedUp(true);
        } catch (e) {
            console.warn("Food search failed:", e);
            setSearchResults([]);
            setAiLookedUp(true);
        } finally {
            setSearching(false);
        }
    }, [searchCustomFoods]);

    // Debounced search handler — shows loading immediately, fires AI after short pause
    const handleSearchInput = useCallback((q: string) => {
        setSearchQuery(q);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!q.trim()) {
            performSearch("");
            return;
        }
        // Show loading state immediately so user knows something is happening
        setSearching(true);
        // Fire search after 400ms pause in typing
        searchTimer.current = setTimeout(() => performSearch(q), 400);
    }, [performSearch]);

    // Load frequent foods on mount
    useEffect(() => {
        performSearch("");
    }, []);

    // ── Log a food result ──
    const handleLogFood = useCallback(async (food: FoodResult) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // If this came from AI, save to local custom_foods so it's cached for next time
        if (food.source === "ai") {
            await saveCustomFood({
                food_name: food.food_name,
                brand: food.brand || null,
                serving_size: food.serving_size || "1 serving",
                barcode: null,
                calories: food.calories,
                protein: food.protein,
                fat: food.fat,
                carbs: food.carbs,
                sugar: food.sugar || null,
                fiber: food.fiber || null,
                sodium: food.sodium || null,
                image_url: null,
            });
        }

        await addFoodLog({
            food_name: food.food_name,
            brand: food.brand || null,
            serving_size: food.serving_size || null,
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
            source_type: food.source === "ai" ? "search" : "search",
            source_recipe_id: null,
            image_url: null,
            barcode: null,
        });
        router.back();
    }, [addFoodLog, saveCustomFood, mealType, logDate, router]);

    // ── Quick Add ──
    const handleQuickAdd = useCallback(async () => {
        if (!quick.food_name.trim()) {
            Alert.alert("Name Required", "Please enter a food name.");
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const cal = parseFloat(quick.calories) || 0;
        const pro = parseFloat(quick.protein) || 0;
        const carb = parseFloat(quick.carbs) || 0;
        const fatVal = parseFloat(quick.fat) || 0;

        await saveCustomFood({
            food_name: quick.food_name.trim(),
            brand: null,
            serving_size: quick.serving_size.trim() || "1 serving",
            barcode: null,
            calories: cal, protein: pro, fat: fatVal, carbs: carb,
            sugar: null, fiber: null, sodium: null, image_url: null,
        });
        await addFoodLog({
            food_name: quick.food_name.trim(),
            brand: null,
            serving_size: quick.serving_size.trim() || "1 serving",
            serving_qty: 1,
            calories: cal, protein: pro, fat: fatVal, carbs: carb,
            sugar: null, fiber: null, sodium: null,
            meal_type: mealType, log_date: logDate,
            source_type: "manual", source_recipe_id: null,
            image_url: null, barcode: null,
        });
        router.back();
    }, [quick, addFoodLog, saveCustomFood, mealType, logDate, router]);

    // ── Log from Recipe ──
    const handleLogRecipe = useCallback(async (recipe: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await addFoodLog({
            food_name: recipe.title, brand: null,
            serving_size: `1/${recipe.servings} recipe`, serving_qty: 1,
            calories: recipe.calories || 0, protein: recipe.protein || 0,
            fat: recipe.fat || 0, carbs: recipe.carbs || 0,
            sugar: recipe.sugar || null, fiber: recipe.fiber || null,
            sodium: recipe.sodium || null, meal_type: mealType, log_date: logDate,
            source_type: "recipe", source_recipe_id: recipe.id,
            image_url: recipe.image_url || null, barcode: null,
        });
        router.back();
    }, [addFoodLog, mealType, logDate, router]);

    // ── Navigate to scanner ──
    const handleOpenScanner = useCallback((mode: "photo" | "barcode") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: "/library/calorie-counter/scan",
            params: { date: logDate, mealType, mode },
        });
    }, [router, logDate, mealType]);

    const filteredRecipes = useMemo(() => {
        if (!recipeSearch.trim()) return recipes.filter(r => r.calories);
        return recipes.filter(r => r.calories && r.title.toLowerCase().includes(recipeSearch.toLowerCase()));
    }, [recipes, recipeSearch]);

    const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: "search", label: "Search", icon: "search" },
        { key: "scan", label: "Scan", icon: "camera" },
        { key: "recipe", label: "Recipes", icon: "book" },
        { key: "quick", label: "Manual", icon: "create" },
    ];

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-surface-950"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ paddingTop: Math.max(insets.top, 20) + 10 }}
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                    <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center mr-3">
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </Pressable>
                    <View>
                        <Text className="text-white font-sans-bold text-xl">Add Food</Text>
                        <Text className="text-surface-400 font-sans text-xs capitalize">{mealType} • {logDate}</Text>
                    </View>
                </View>
            </View>

            {/* Tab Switcher */}
            <View className="flex-row mx-5 mb-4 bg-surface-900 rounded-2xl p-1">
                {TABS.map((t) => (
                    <Pressable
                        key={t.key}
                        onPress={() => setTab(t.key)}
                        className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                        style={tab === t.key ? { backgroundColor: "rgba(239,68,68,0.15)" } : undefined}
                    >
                        <Ionicons name={t.icon} size={14} color={tab === t.key ? "#EF4444" : "#6E6E85"} />
                        <Text className="font-sans-bold text-xs ml-1" style={{ color: tab === t.key ? "#EF4444" : "#6E6E85" }}>
                            {t.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* ══════════ SEARCH TAB ══════════ */}
            {tab === "search" && (
                <View className="flex-1 px-5">
                    <View className="flex-row items-center bg-surface-900 px-3 py-2.5 rounded-2xl mb-3">
                        <Ionicons name="search" size={18} color="#4A4A5E" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={handleSearchInput}
                            placeholder='Type any food... e.g. "apple" or "chicken breast"'
                            placeholderTextColor="#4A4A5E"
                            className="flex-1 text-white font-sans ml-2"
                            autoFocus
                            returnKeyType="search"
                            onSubmitEditing={() => performSearch(searchQuery)}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => handleSearchInput("")}>
                                <Ionicons name="close-circle" size={18} color="#4A4A5E" />
                            </Pressable>
                        )}
                    </View>

                    {/* AI status indicator */}
                    {searching && (
                        <Animated.View entering={FadeIn} className="flex-row items-center mb-3 px-1">
                            <ActivityIndicator size="small" color="#EF4444" />
                            <Text className="text-surface-400 font-sans text-xs ml-2">
                                Looking up nutrition info with AI...
                            </Text>
                        </Animated.View>
                    )}

                    {aiLookedUp && searchResults.length > 0 && searchResults[0].source === "ai" && (
                        <Animated.View entering={FadeIn} className="flex-row items-center mb-2 px-1">
                            <Ionicons name="sparkles" size={14} color="#FBBF24" />
                            <Text className="text-amber-400 font-sans text-xs ml-1.5">
                                AI-estimated nutrition — tap to log & save to your database
                            </Text>
                        </Animated.View>
                    )}

                    {aiLookedUp && searchResults.length > 0 && searchResults[0].source === "community" && (
                        <Animated.View entering={FadeIn} className="flex-row items-center mb-2 px-1">
                            <Ionicons name="globe" size={14} color="#34D399" />
                            <Text className="text-emerald-400 font-sans text-xs ml-1.5">
                                Community database — instant result
                            </Text>
                        </Animated.View>
                    )}

                    {!searching && searchQuery.trim().length > 0 && searchResults.length === 0 && aiLookedUp && (
                        <Animated.View entering={FadeIn} className="items-center py-10 opacity-50">
                            <Ionicons name="alert-circle-outline" size={40} color="#FFF" />
                            <Text className="text-white font-sans mt-3 text-center text-sm">
                                Couldn't identify "{searchQuery}".{"\n"}Try a more specific name or use Manual entry.
                            </Text>
                        </Animated.View>
                    )}

                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, idx) => `${item.food_name}-${idx}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListHeaderComponent={
                            !searchQuery.trim() && searchResults.length > 0 ? (
                                <Text className="text-surface-500 font-sans text-xs mb-2 px-1">FREQUENT</Text>
                            ) : null
                        }
                        ListEmptyComponent={
                            !searching && !searchQuery.trim() ? (
                                <View className="items-center justify-center py-16 opacity-40">
                                    <Ionicons name="nutrition" size={48} color="#FFFFFF" />
                                    <Text className="text-white font-sans mt-4 text-center text-sm">
                                        Type any food to search.{"\n"}AI will auto-fill nutrition if it's new!
                                    </Text>
                                </View>
                            ) : null
                        }
                        renderItem={({ item, index }) => (
                            <Animated.View entering={FadeInDown.delay(index * 30)}>
                                <Pressable onPress={() => handleLogFood(item)}>
                                    <GlassContainer className="flex-row items-center p-3.5 mb-2 rounded-2xl overflow-hidden"
                                        style={
                                            item.source === "ai" ? { borderColor: "rgba(251,191,36,0.2)" } :
                                            item.source === "community" ? { borderColor: "rgba(52,211,153,0.2)" } : undefined
                                        }
                                    >
                                        {item.source === "ai" && (
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(251,191,36,0.15)", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Ionicons name="sparkles" size={16} color="#FBBF24" />
                                            </View>
                                        )}
                                        {item.source === "community" && (
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(52,211,153,0.15)", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Ionicons name="globe" size={16} color="#34D399" />
                                            </View>
                                        )}
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-bold text-sm" numberOfLines={1}>{item.food_name}</Text>
                                            <Text className="text-surface-500 font-sans text-[10px] mt-0.5">
                                                {item.serving_size || "1 serving"} • {Math.round(item.protein)}g Protein • {Math.round(item.carbs)}g Carbs • {Math.round(item.fat)}g Fat
                                            </Text>
                                        </View>
                                        <View className="items-center mr-2">
                                            <Text className="text-white font-sans-bold text-sm">{Math.round(item.calories)}</Text>
                                            <Text className="text-surface-500 font-sans text-[9px]">cal</Text>
                                        </View>
                                        <Ionicons name="add-circle" size={24} color="#EF4444" />
                                    </GlassContainer>
                                </Pressable>
                            </Animated.View>
                        )}
                    />
                </View>
            )}

            {/* ══════════ SCAN TAB ══════════ */}
            {tab === "scan" && (
                <View className="flex-1 px-5">
                    <Animated.View entering={FadeInDown.delay(50)}>
                        <Text className="text-surface-400 font-sans text-xs mb-4 px-1">
                            Scan your food or a barcode to instantly log it.
                        </Text>

                        {/* Photo Scan */}
                        <Pressable onPress={() => handleOpenScanner("photo")}>
                            <GlassContainer
                                style={{ borderRadius: 24, backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.15)" }}
                                className="p-5 mb-4"
                            >
                                <View className="flex-row items-center">
                                    <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                                        <Ionicons name="camera" size={28} color="#EF4444" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-sans-bold text-base">Snap a Photo</Text>
                                        <Text className="text-surface-400 font-sans text-xs mt-1">
                                            Take a picture of your meal and AI will estimate the calories and macros
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#6E6E85" />
                                </View>
                            </GlassContainer>
                        </Pressable>

                        {/* Barcode Scan */}
                        <Pressable onPress={() => handleOpenScanner("barcode")}>
                            <GlassContainer
                                style={{ borderRadius: 24, backgroundColor: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.15)" }}
                                className="p-5 mb-4"
                            >
                                <View className="flex-row items-center">
                                    <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(251,191,36,0.15)", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                                        <Ionicons name="barcode" size={28} color="#FBBF24" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-sans-bold text-base">Scan Barcode</Text>
                                        <Text className="text-surface-400 font-sans text-xs mt-1">
                                            Scan a packaged food barcode to pull nutrition from our database
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#6E6E85" />
                                </View>
                            </GlassContainer>
                        </Pressable>

                        {/* Info */}
                        <View className="flex-row items-start bg-surface-900/50 rounded-2xl p-4 mt-2">
                            <Ionicons name="information-circle" size={18} color="#60A5FA" style={{ marginRight: 8, marginTop: 1 }} />
                            <Text className="text-surface-400 font-sans text-xs flex-1">
                                Foods identified by AI or barcode are automatically saved to the community database so everyone can find them instantly next time.
                            </Text>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ══════════ RECIPE TAB ══════════ */}
            {tab === "recipe" && (
                <View className="flex-1 px-5">
                    <View className="flex-row items-center bg-surface-900 px-3 py-2.5 rounded-2xl mb-4">
                        <Ionicons name="search" size={18} color="#4A4A5E" />
                        <TextInput value={recipeSearch} onChangeText={setRecipeSearch} placeholder="Search your recipes..." placeholderTextColor="#4A4A5E" className="flex-1 text-white font-sans ml-2" />
                    </View>
                    <FlatList
                        data={filteredRecipes}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center py-16 opacity-40">
                                <Ionicons name="book-outline" size={48} color="#FFFFFF" />
                                <Text className="text-white font-sans mt-4 text-center">No recipes with nutrition data found.</Text>
                            </View>
                        )}
                        renderItem={({ item, index }) => (
                            <Animated.View entering={FadeInDown.delay(index * 40)}>
                                <Pressable onPress={() => handleLogRecipe(item)}>
                                    <GlassContainer className="flex-row items-center p-3 mb-2 rounded-2xl overflow-hidden">
                                        <View className="w-12 h-12 rounded-xl bg-surface-800 overflow-hidden mr-3">
                                            {item.image_url ? <Image source={{ uri: item.image_url }} style={{ flex: 1 }} /> : (
                                                <View className="flex-1 items-center justify-center"><Text className="text-lg">🍽️</Text></View>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-bold text-sm" numberOfLines={1}>{item.title}</Text>
                                            <Text className="text-surface-400 font-sans text-[10px] mt-0.5">
                                                {item.calories} cal • {item.protein}g P • {item.carbs}g C • {item.fat}g F
                                            </Text>
                                        </View>
                                        <Ionicons name="add-circle" size={22} color="#EF4444" />
                                    </GlassContainer>
                                </Pressable>
                            </Animated.View>
                        )}
                    />
                </View>
            )}

            {/* ══════════ MANUAL TAB ══════════ */}
            {tab === "quick" && (
                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    <Animated.View entering={FadeInDown}>
                        <GlassContainer style={{ borderRadius: 24 }} className="p-5 mb-4">
                            <Text className="text-white font-sans-bold text-base mb-4">Manual Entry</Text>
                            {([
                                { key: "food_name", label: "Food Name", placeholder: "e.g. Grilled Chicken Breast", kb: "default" },
                                { key: "serving_size", label: "Serving Size", placeholder: "e.g. 1 cup, 100g", kb: "default" },
                                { key: "calories", label: "Calories", placeholder: "0", kb: "numeric" },
                                { key: "protein", label: "Protein (g)", placeholder: "0", kb: "numeric" },
                                { key: "carbs", label: "Carbs (g)", placeholder: "0", kb: "numeric" },
                                { key: "fat", label: "Fat (g)", placeholder: "0", kb: "numeric" },
                            ] as const).map((field) => (
                                <View key={field.key} className="mb-3">
                                    <Text className="text-surface-400 font-sans text-xs mb-1">{field.label}</Text>
                                    <TextInput
                                        value={quick[field.key]}
                                        onChangeText={(v) => setQuick((p) => ({ ...p, [field.key]: v }))}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="#3A3A4E"
                                        keyboardType={field.kb as any}
                                        className="bg-surface-900 text-white font-sans px-4 py-3 rounded-xl"
                                    />
                                </View>
                            ))}
                            <Pressable onPress={handleQuickAdd} style={{ backgroundColor: "#EF4444", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 8 }}>
                                <Text className="text-white font-sans-bold text-sm">Add to Log</Text>
                            </Pressable>
                        </GlassContainer>
                    </Animated.View>
                </ScrollView>
            )}
        </KeyboardAvoidingView>
    );
}

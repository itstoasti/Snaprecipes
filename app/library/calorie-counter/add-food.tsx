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
import * as SecureStore from "expo-secure-store";
import { AI_PROVIDER_STORE } from "@/lib/constants";

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
    source: "local" | "ai" | "community" | "global";
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
    const { recipes, searchCommunityRecipes } = useRecipes();
    const [recipeTab, setRecipeTab] = useState<"mine" | "community">("mine");
    const [communityRecipes, setCommunityRecipes] = useState<any[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);

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
    // ── Database Search: local + community ──
    const performSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
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
            let combinedResults: FoodResult[] = [];

            // Step 1: Search local custom_foods
            try {
                const localResults = await searchCustomFoods(q);
                if (localResults.length > 0) {
                    combinedResults = localResults.map((f: any) => ({ ...f, source: "local" as const }));
                }
            } catch (e) {
                console.warn("Local food search failed:", e);
            }

            // Step 2: Search community global_foods in Supabase
            try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

                if (supabaseUrl && supabaseKey) {
                    const queryParam = encodeURIComponent(q.toLowerCase());
                    const response = await fetch(
                        `${supabaseUrl}/rest/v1/global_foods?or=(food_name_lower.ilike.*${queryParam}*,brand_lower.ilike.*${queryParam}*)&order=lookup_count.desc&limit=10`,
                        {
                            headers: {
                                "apikey": supabaseKey,
                                "Authorization": `Bearer ${supabaseKey}`,
                            },
                        }
                    );

                    if (response.ok) {
                        const globalData = await response.json();
                        if (globalData && globalData.length > 0) {
                            const communityItems = globalData.map((f: any) => ({
                                ...f,
                                source: "community" as const,
                            }));
                            
                            // Merge and de-duplicate (prefer local hits if name matches exactly)
                            const localNames = new Set(combinedResults.map(r => r.food_name.toLowerCase()));
                            const newCommunityItems = communityItems.filter((f: any) => !localNames.has(f.food_name.toLowerCase()));
                            
                            combinedResults = [...combinedResults, ...newCommunityItems];

                            // Increment lookup count for the best community match asynchronously
                            const topMatch = globalData[0];
                            fetch(`${supabaseUrl}/rpc/increment_lookup_count`, {
                                method: 'POST',
                                headers: {
                                    "apikey": supabaseKey,
                                    "Authorization": `Bearer ${supabaseKey}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ row_id: topMatch.id })
                            }).catch(() => {});
                        }
                    }
                }
            } catch (e) {
                console.warn("Global food search failed:", e);
            }

            // Step 3: Search Open Food Facts (Global Database)
            if (combinedResults.length < 5) {
                try {
                    const offResp = await fetch(
                        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10`
                    );
                    if (offResp.ok) {
                        const offData = await offResp.json();
                        if (offData.products && offData.products.length > 0) {
                            const offItems: FoodResult[] = offData.products
                                .filter((p: any) => p.product_name || p.generic_name)
                                .map((p: any) => {
                                    const n = p.nutriments || {};
                                    return {
                                        food_name: p.product_name || p.generic_name || "Unknown Product",
                                        brand: p.brands || null,
                                        serving_size: p.serving_size || p.quantity || "1 serving",
                                        calories: Math.round(n["energy-kcal_serving"] || n["energy-kcal_100g"] || 0),
                                        protein: Math.round((n.proteins_serving || n.proteins_100g || 0) * 10) / 10,
                                        fat: Math.round((n.fat_serving || n.fat_100g || 0) * 10) / 10,
                                        carbs: Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10,
                                        sugar: n.sugars_serving || n.sugars_100g || null,
                                        fiber: n.fiber_serving || n.fiber_100g || null,
                                        sodium: n.sodium_serving ? Math.round(n.sodium_serving * 1000) : null,
                                        source: "global" as const,
                                    };
                                });
                            
                            const existingNames = new Set(combinedResults.map(r => r.food_name.toLowerCase()));
                            const uniqueOffItems = offItems.filter(f => !existingNames.has(f.food_name.toLowerCase()));
                            combinedResults = [...combinedResults, ...uniqueOffItems];
                        }
                    }
                } catch (e) {
                    console.warn("Global database search failed:", e);
                }
            }
            
            // Final Step: Smart Ranking & Filtering
            const queryLower = q.toLowerCase().trim();
            const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
            
            combinedResults = combinedResults.sort((a, b) => {
                const nameA = a.food_name.toLowerCase();
                const nameB = b.food_name.toLowerCase();
                
                // 1. Exact match is king
                if (nameA === queryLower) return -1;
                if (nameB === queryLower) return 1;
                
                // 2. "Starts with" is queen
                if (nameA.startsWith(queryLower) && !nameB.startsWith(queryLower)) return -1;
                if (nameB.startsWith(queryLower) && !nameA.startsWith(queryLower)) return 1;
                
                // 3. Keyword density (how many words from query appear in name)
                const countA = queryWords.filter(w => nameA.includes(w)).length;
                const countB = queryWords.filter(w => nameB.includes(w)).length;
                if (countA !== countB) return countB - countA;
                
                // 4. Source priority: local > community > global
                const sourceOrder = { local: 0, community: 1, global: 2, ai: 3 };
                return sourceOrder[a.source] - sourceOrder[b.source];
            });

            // 5. Semantic De-noising (e.g. if searching for bread, deprioritize tortillas/wraps)
            if (queryLower.includes("bread")) {
                const isNoisy = (name: string) => 
                    name.includes("tortilla") || name.includes("wrap") || name.includes("pita") || name.includes("flatbread");
                
                const clearResults = combinedResults.filter(r => !isNoisy(r.food_name.toLowerCase()));
                const noisyResults = combinedResults.filter(r => isNoisy(r.food_name.toLowerCase()));
                combinedResults = [...clearResults, ...noisyResults];
            }

            setSearchResults(combinedResults.slice(0, 15));
        } catch (e) {
            console.warn("Search failed:", e);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, [searchCustomFoods]);

    // ── Manual AI Trigger ──
    const triggerAiSearch = useCallback(async () => {
        const q = searchQuery.trim();
        if (!q) return;

        setSearching(true);
        setAiLookedUp(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                Alert.alert("Error", "Configuration error. Please try again later.");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || supabaseKey;
            const provider = await SecureStore.getItemAsync(AI_PROVIDER_STORE) || "gemini";

            const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "apikey": supabaseKey,
                },
                body: JSON.stringify({ 
                    textDescription: q,
                    provider
                }),
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => "unknown");
                console.warn("AI lookup failed:", response.status, errText);
                Alert.alert("AI Error", "Failed to get estimation from AI. Please try again or enter manually.");
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

            // If we found something, clear results and show only AI results
            if (items.length > 0) {
                setSearchResults(items);
                setAiLookedUp(true);
            } else {
                Alert.alert("Not Found", "AI couldn't identify this food. Try a more specific name.");
            }
        } catch (e) {
            console.warn("AI search failed:", e);
            Alert.alert("Error", "Something went wrong with the AI search.");
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    // Debounced search handler — Database only
    const handleSearchInput = useCallback((q: string) => {
        setSearchQuery(q);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!q.trim()) {
            performSearch("");
            return;
        }
        setSearching(true);
        searchTimer.current = setTimeout(() => performSearch(q), 300);
    }, [performSearch]);

    // Load frequent foods on mount
    useEffect(() => {
        performSearch("");
    }, []);

    // ── Log a food result ──
    const handleLogFood = useCallback(async (food: FoodResult) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // If this came from AI or Global database, save to local custom_foods so it's cached for next time
        if (food.source === "ai" || food.source === "global") {
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

            // If it's a global item, also "contribute" it to our community database via analyze-food pipeline
            // This builds our community database without using expensive Gemini tokens
            if (food.source === "global") {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                if (supabaseUrl && supabaseKey) {
                    fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json",
                            "apikey": supabaseKey,
                            "Authorization": `Bearer ${supabaseKey}`,
                        },
                        body: JSON.stringify({ 
                            textDescription: food.food_name,
                            _silent_contribution: true,
                            _contributed_item: {
                                ...food,
                                source: "community"
                            }
                        })
                    }).catch(() => {});
                }
            }
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
            food_name: recipe.title, brand: "SnapRecipe",
            serving_size: recipe.servings ? `1/${recipe.servings} recipe` : "1 serving", 
            serving_qty: 1,
            calories: recipe.calories || 0, protein: recipe.protein || 0,
            fat: recipe.fat || 0, carbs: recipe.carbs || 0,
            sugar: recipe.sugar || null, fiber: recipe.fiber || null,
            sodium: recipe.sodium || null, meal_type: mealType, log_date: logDate,
            source_type: "recipe", source_recipe_id: recipe.id > 0 ? recipe.id : null,
            image_url: recipe.image_url || null, barcode: null,
        });
        router.back();
    }, [addFoodLog, mealType, logDate, router]);

    const handleRecipeSearch = useCallback(async (text: string) => {
        setRecipeSearch(text);
        if (recipeTab === "community") {
            setLoadingCommunity(true);
            try {
                const results = await searchCommunityRecipes(text);
                setCommunityRecipes(results);
            } catch (error) {
                console.error("Community recipe search failed:", error);
            } finally {
                setLoadingCommunity(false);
            }
        }
    }, [recipeTab, searchCommunityRecipes]);

    useEffect(() => {
        if (tab === "recipe" && recipeTab === "community" && communityRecipes.length === 0) {
            handleRecipeSearch(recipeSearch);
        }
    }, [tab, recipeTab, communityRecipes.length, handleRecipeSearch, recipeSearch]);

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
                            returnKeyType="search"
                            onSubmitEditing={() => performSearch(searchQuery)}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => handleSearchInput("")}>
                                <Ionicons name="close-circle" size={18} color="#4A4A5E" />
                            </Pressable>
                        )}
                    </View>

                    {/* Status indicators */}
                    {searching && !aiLookedUp && (
                        <Animated.View entering={FadeIn} className="flex-row items-center mb-3 px-1">
                            <ActivityIndicator size="small" color="#EF4444" />
                            <Text className="text-surface-400 font-sans text-xs ml-2">
                                Searching database...
                            </Text>
                        </Animated.View>
                    )}

                    {searching && aiLookedUp && (
                        <Animated.View entering={FadeIn} className="flex-row items-center mb-3 px-1">
                            <ActivityIndicator size="small" color="#FBBF24" />
                            <Text className="text-amber-400 font-sans text-xs ml-2">
                                AI is estimating nutrition...
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
                            !searching && searchQuery.trim() ? (
                                <View className="items-center justify-center py-12 px-10">
                                    <Ionicons name="search-outline" size={40} color="#4A4A5E" />
                                    <Text className="text-white font-sans mt-4 text-center text-sm">
                                        No results found for "{searchQuery}"
                                    </Text>
                                    <Pressable 
                                        onPress={triggerAiSearch}
                                        className="mt-6 bg-amber-400/20 border border-amber-400/30 px-6 py-3 rounded-2xl flex-row items-center"
                                    >
                                        <Ionicons name="sparkles" size={18} color="#FBBF24" />
                                        <Text className="text-amber-400 font-sans-bold ml-2">Ask AI to Estimate</Text>
                                    </Pressable>
                                </View>
                            ) : !searching && !searchQuery.trim() ? (
                                <View className="items-center justify-center py-16 opacity-40">
                                    <Ionicons name="nutrition" size={48} color="#FFFFFF" />
                                    <Text className="text-white font-sans mt-4 text-center text-sm">
                                        Type any food to search.
                                    </Text>
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            !searching && searchQuery.trim().length > 0 && searchResults.length > 0 && !aiLookedUp ? (
                                <View className="mt-4 px-1">
                                    <View className="h-[1px] bg-white/5 w-full mb-6" />
                                    <Text className="text-surface-500 font-sans text-xs text-center mb-4">
                                        Don't see the right match?
                                    </Text>
                                    <Pressable 
                                        onPress={triggerAiSearch}
                                        className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-2xl flex-row items-center justify-center"
                                    >
                                        <Ionicons name="sparkles" size={16} color="#FBBF24" />
                                        <Text className="text-amber-400 font-sans-bold ml-2 text-sm">Ask AI to estimate "{searchQuery}"</Text>
                                    </Pressable>
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
                                                <Ionicons name="people" size={16} color="#34D399" />
                                            </View>
                                        )}
                                        {item.source === "global" && (
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(96,165,250,0.15)", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Ionicons name="globe" size={16} color="#60A5FA" />
                                            </View>
                                        )}
                                        <View className="flex-1">
                                            {item.brand && (
                                                <Text className="text-surface-500 font-sans text-[10px] uppercase tracking-tighter" numberOfLines={1}>
                                                    {item.brand}
                                                </Text>
                                            )}
                                            <Text className="text-white font-sans-bold text-sm" numberOfLines={1}>{item.food_name}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <Text className="text-surface-500 font-sans text-[10px] mr-2">
                                                    {item.serving_size || "1 serving"}
                                                </Text>
                                                <View className="flex-row items-center" style={{ gap: 8 }}>
                                                    <Text style={{ color: "#60A5FA", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                        {Math.round(item.protein)}g Protein
                                                    </Text>
                                                    <Text style={{ color: "#FBBF24", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                        {Math.round(item.carbs)}g Carbs
                                                    </Text>
                                                    <Text style={{ color: "#F472B6", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                        {Math.round(item.fat)}g Fat
                                                    </Text>
                                                </View>
                                            </View>
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
                    {/* Inner Tabs for Recipe Source */}
                    <View className="flex-row bg-surface-900/50 p-1 rounded-2xl mb-4 border border-surface-800/50">
                        <Pressable
                            onPress={() => setRecipeTab("mine")}
                            className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${recipeTab === "mine" ? "bg-surface-800 shadow-sm" : ""}`}
                        >
                            <Ionicons name="book" size={14} color={recipeTab === "mine" ? "#FFFFFF" : "#6E6E85"} />
                            <Text className={`font-sans-bold text-xs ml-2 ${recipeTab === "mine" ? "text-white" : "text-surface-400"}`}>My Recipes</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setRecipeTab("community")}
                            className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${recipeTab === "community" ? "bg-surface-800 shadow-sm" : ""}`}
                        >
                            <Ionicons name="globe" size={14} color={recipeTab === "community" ? "#FFFFFF" : "#6E6E85"} />
                            <Text className={`font-sans-bold text-xs ml-2 ${recipeTab === "community" ? "text-white" : "text-surface-400"}`}>Community</Text>
                        </Pressable>
                    </View>

                    <View className="flex-row items-center bg-surface-900 px-3 py-2.5 rounded-2xl mb-4">
                        <Ionicons name="search" size={18} color="#4A4A5E" />
                        <TextInput 
                            value={recipeSearch} 
                            onChangeText={handleRecipeSearch} 
                            placeholder={recipeTab === "mine" ? "Search your recipes..." : "Search community recipes..."} 
                            placeholderTextColor="#4A4A5E" 
                            className="flex-1 text-white font-sans ml-2" 
                        />
                        {loadingCommunity && <ActivityIndicator size="small" color="#EF4444" className="ml-2" />}
                    </View>

                    <FlatList
                        data={recipeTab === "mine" ? filteredRecipes : communityRecipes}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View className="items-center justify-center py-16 opacity-40">
                                <Ionicons name={recipeTab === "mine" ? "book-outline" : "globe-outline"} size={48} color="#FFFFFF" />
                                <Text className="text-white font-sans mt-4 text-center">
                                    {recipeTab === "mine" ? "No recipes with nutrition data found." : "No community recipes found."}
                                </Text>
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
                                            <View className="flex-row items-center mt-1.5" style={{ gap: 8 }}>
                                                <Text className="text-surface-500 font-sans text-[10px] mr-1">{item.calories} kcal</Text>
                                                <Text style={{ color: "#60A5FA", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                    {Math.round(item.protein)}g Protein
                                                </Text>
                                                <Text style={{ color: "#FBBF24", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                    {Math.round(item.carbs)}g Carbs
                                                </Text>
                                                <Text style={{ color: "#F472B6", fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
                                                    {Math.round(item.fat)}g Fat
                                                </Text>
                                            </View>
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

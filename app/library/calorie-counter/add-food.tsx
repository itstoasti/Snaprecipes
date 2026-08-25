import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    View, Text, Pressable, TextInput, FlatList, Alert,
    KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView,
    Modal,
} from "react-native";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFoodLog } from "@/hooks/useFoodLog";
import { useRecipes } from "@/hooks/useRecipes";
import { supabase } from "@/lib/supabase";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { BlurView } from "expo-blur";
import { AI_PROVIDER_STORE } from "@/lib/constants";
import { format } from "@/lib/dateUtils";
import { searchRawFoods } from "@/lib/rawFoods";
import { trackEvent } from "@/lib/analytics";
import { useTheme } from "@/hooks/useTheme";

type Tab = "search" | "scan" | "quick" | "recipe";

interface FoodResult {
    id?: number | string;
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
    source: "local" | "ai" | "community" | "global" | "basic";
    isBasic?: boolean;
    use_count?: number;
    lookup_count?: number;
}

interface QuickAddState {
    food_name: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    serving_size: string;
    serving_qty: string;
}

const EMPTY_QUICK: QuickAddState = {
    food_name: "", calories: "", protein: "", carbs: "", fat: "", serving_size: "", serving_qty: "1",
};

const MEAL_TYPES = [
    { key: "breakfast", label: "Breakfast", icon: "sunny" },
    { key: "lunch", label: "Lunch", icon: "restaurant" },
    { key: "dinner", label: "Dinner", icon: "moon" },
    { key: "snack", label: "Snack", icon: "nutrition" },
] as const;

// ── Search Tokenizer & Relevance Gate ──
function tokenizeQuery(query: string): string[] {
    return query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 0);
}

function wordMatches(targetText: string, token: string): boolean {
    if (targetText.includes(token)) return true;
    if (token.endsWith("ies") && token.length > 4) {
        const singular = token.slice(0, -3) + "y";
        if (targetText.includes(singular)) return true;
    }
    if (token.endsWith("es") && token.length > 3) {
        const singular = token.slice(0, -2);
        if (targetText.includes(singular)) return true;
    }
    if (token.endsWith("s") && token.length > 2) {
        const singular = token.slice(0, -1);
        if (targetText.includes(singular)) return true;
    }
    const plural = token + "s";
    if (targetText.includes(plural)) return true;
    return false;
}

function passesRelevanceGate(item: { food_name: string; brand?: string | null }, queryTokens: string[]): boolean {
    if (queryTokens.length === 0) return true;
    const nameLower = (item.food_name || "").toLowerCase();
    const brandLower = (item.brand || "").toLowerCase();
    const combined = `${nameLower} ${brandLower}`;

    // Every single query token MUST match in either the food name or the brand
    return queryTokens.every(token => wordMatches(combined, token));
}

function calculateScore(item: FoodResult, queryLower: string, queryTokens: string[]): number {
    const nameLower = item.food_name.toLowerCase();
    const brandLower = (item.brand || "").toLowerCase();
    const cleanName = nameLower
        .replace(/,\s*(raw|fresh|whole|cooked|boiled|baked|grilled|fried|steamed|roasted|canned|dry|dried|unsalted|salted|sweetened|unsweetened|peeled|with skin|without skin|large|medium|small|chopped|sliced|diced|ground).*$/i, "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim();

    let score = 0;

    // Exact full match (Tier 0)
    if (cleanName === queryLower || nameLower === queryLower) {
        score += 1000;
    } else if (nameLower.startsWith(queryLower) || cleanName.startsWith(queryLower)) {
        // Starts with exact query string (Tier 1)
        score += 700;
    } else if (nameLower.includes(queryLower)) {
        // Contains exact query phrase (Tier 2)
        score += 500;
    } else {
        // Tokens scattered (Tier 3)
        score += 300;
    }

    // Curated basic / raw foods priority (highest trust for generic searches)
    if (item.source === "basic") {
        score += 200;
    } else if (item.source === "local") {
        score += 150;
    } else if (item.source === "community") {
        score += 100;
    }

    // Usage & Popularity boost
    const pop = (item.use_count || item.lookup_count || 0);
    score += Math.min(100, pop * 10);

    // Shorter clean names score higher (avoids spammy long descriptions)
    score -= Math.min(50, item.food_name.length * 0.4);

    return score;
}

export default function AddFoodScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark, colors } = useTheme();
    const params = useLocalSearchParams<{ date: string; mealType: string }>();
    const logDate = params.date || format(new Date(), "yyyy-MM-dd");
    const mealType = (params.mealType || "snack") as "breakfast" | "lunch" | "dinner" | "snack";
    const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(mealType);

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
    const [logTarget, setLogTarget] = useState<null | { type: "food"; food: FoodResult } | { type: "recipe"; recipe: any }>(null);
    const [servingQtyStr, setServingQtyStr] = useState("1");

    // Debounce timer ref & Sequence Guard ref to prevent race conditions
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchSeqRef = useRef<number>(0);

    const hasExactMatch = useMemo(() => {
        const queryLower = searchQuery.toLowerCase().trim();
        if (!queryLower) return true;
        return searchResults.some(r => {
            const cleanName = r.food_name.toLowerCase()
                .replace(/,\s*(raw|fresh|whole|cooked|boiled|baked|grilled|fried|steamed|roasted|canned|dry|dried|unsalted|salted|sweetened|unsweetened|peeled|with skin|without skin|large|medium|small|chopped|sliced|diced|ground).*$/i, "")
                .replace(/\s*\([^)]*\)/g, "")
                .trim();
            return cleanName === queryLower || r.food_name.toLowerCase().trim() === queryLower;
        });
    }, [searchResults, searchQuery]);

    // ── High Precision Search Engine ──
    const performSearch = useCallback(async (q: string) => {
        const currentSeq = ++searchSeqRef.current;

        if (!q.trim()) {
            try {
                const frequent = await searchCustomFoods("");
                if (searchSeqRef.current !== currentSeq) return;
                setSearchResults(frequent.map((f: any) => ({ ...f, source: "local" as const })));
            } catch (e) {
                if (searchSeqRef.current !== currentSeq) return;
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
            const queryLower = q.toLowerCase().trim();
            const queryTokens = tokenizeQuery(queryLower);

            let localMatches: FoodResult[] = [];
            let basicMatches: FoodResult[] = [];
            let communityMatches: FoodResult[] = [];
            let globalMatches: FoodResult[] = [];

            // Step 1: Search local custom_foods
            try {
                const localResults = await searchCustomFoods(q);
                localMatches = localResults
                    .map((f: any) => ({ ...f, source: "local" as const }))
                    .filter(f => passesRelevanceGate(f, queryTokens));
            } catch (e) {
                console.warn("Local food search failed:", e);
            }

            // Step 2: Search curated USDA basics (rawFoods.ts)
            try {
                const rawMatches = searchRawFoods(q);
                basicMatches = rawMatches
                    .map(f => ({
                        food_name: f.food_name,
                        brand: "Curated Basic",
                        serving_size: f.serving_size,
                        calories: f.calories,
                        protein: f.protein,
                        fat: f.fat,
                        carbs: f.carbs,
                        sugar: f.sugar,
                        fiber: f.fiber,
                        sodium: f.sodium,
                        source: "basic" as const,
                        isBasic: true,
                    }))
                    .filter(f => passesRelevanceGate(f, queryTokens));
            } catch (e) {
                console.warn("Raw foods search failed:", e);
            }

            // Stale check
            if (searchSeqRef.current !== currentSeq) return;

            // Step 3: Search Supabase community global_foods (trigram ranked)
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                try {
                    // Try search_global_foods RPC first
                    const { data: rpcData, error: rpcError } = await supabase.rpc("search_global_foods", {
                        query_text: q,
                        max_results: 15
                    });

                    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
                        communityMatches = rpcData.map((f: any) => ({
                            id: f.id,
                            food_name: f.food_name,
                            brand: f.brand || null,
                            serving_size: f.serving_size || "1 serving",
                            calories: Number(f.calories) || 0,
                            protein: Number(f.protein) || 0,
                            fat: Number(f.fat) || 0,
                            carbs: Number(f.carbs) || 0,
                            sugar: f.sugar !== null ? Number(f.sugar) : null,
                            fiber: f.fiber !== null ? Number(f.fiber) : null,
                            sodium: f.sodium !== null ? Number(f.sodium) : null,
                            source: "community" as const,
                            lookup_count: f.lookup_count || 1,
                        })).filter(f => passesRelevanceGate(f, queryTokens));
                    } else {
                        // Fallback to REST API
                        const queryParam = encodeURIComponent(queryLower);
                        const response = await fetch(
                            `${supabaseUrl}/rest/v1/global_foods?food_name_lower=ilike.*${queryParam}*&order=lookup_count.desc&limit=10`,
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
                                communityMatches = globalData
                                    .map((f: any) => ({ ...f, source: "community" as const }))
                                    .filter((f: any) => passesRelevanceGate(f, queryTokens));
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Global food search failed:", e);
                }
            }

            // Stale check
            if (searchSeqRef.current !== currentSeq) return;

            // Step 4: Search Open Food Facts via Search-a-licious API
            const totalHitsSoFar = localMatches.length + basicMatches.length + communityMatches.length;
            if (totalHitsSoFar < 15) {
                try {
                    const cleanQueryParam = encodeURIComponent(q.trim());
                    // Primary: Scoped US Search-a-licious search
                    const offUrl = `https://search.openfoodfacts.org/search?q=${cleanQueryParam}+countries_tags:%22en:united-states%22&langs=en&page_size=15&fields=code,product_name,generic_name,brands,serving_size,serving_quantity,nutriments`;
                    
                    let offResp = await fetch(offUrl, {
                        headers: { "User-Agent": "SnapRecipes - iOS/Android - Version 5.4.1 - www.snaprecipes.app" }
                    });

                    let offData = offResp.ok ? await offResp.json() : null;
                    let hits = offData?.hits || [];

                    // Fallback to global if US returned 0 hits
                    if (hits.length === 0) {
                        const fallbackUrl = `https://search.openfoodfacts.org/search?q=${cleanQueryParam}&langs=en&page_size=15&fields=code,product_name,generic_name,brands,serving_size,serving_quantity,nutriments`;
                        const fallbackResp = await fetch(fallbackUrl, {
                            headers: { "User-Agent": "SnapRecipes - iOS/Android - Version 5.4.1 - www.snaprecipes.app" }
                        });
                        if (fallbackResp.ok) {
                            const fallbackData = await fallbackResp.json();
                            hits = fallbackData?.hits || [];
                        }
                    }

                    if (hits.length > 0) {
                        globalMatches = hits
                            .filter((p: any) => p.product_name || p.generic_name)
                            .map((p: any) => {
                                const n = p.nutriments || {};
                                const brandStr = Array.isArray(p.brands) ? p.brands.filter(Boolean).join(", ") : (p.brands || null);
                                
                                const getVal = (servingK: string, g100K: string) => {
                                    if (n[servingK] !== undefined && n[servingK] !== null) return Number(n[servingK]);
                                    if (n[g100K] !== undefined && n[g100K] !== null) {
                                        if (p.serving_quantity) {
                                            return (Number(n[g100K]) * Number(p.serving_quantity)) / 100;
                                        }
                                        return Number(n[g100K]);
                                    }
                                    return 0;
                                };

                                const cal = Math.round(getVal("energy-kcal_serving", "energy-kcal_100g") || getVal("energy-kcal", "energy-kcal_100g"));
                                const pro = Math.round(getVal("proteins_serving", "proteins_100g") * 10) / 10;
                                const fat = Math.round(getVal("fat_serving", "fat_100g") * 10) / 10;
                                const carb = Math.round(getVal("carbohydrates_serving", "carbohydrates_100g") * 10) / 10;

                                return {
                                    food_name: p.product_name || p.generic_name || "Unknown Product",
                                    brand: brandStr,
                                    serving_size: p.serving_size || (p.serving_quantity ? `${p.serving_quantity}g` : "1 serving"),
                                    calories: cal,
                                    protein: pro,
                                    fat: fat,
                                    carbs: carb,
                                    sugar: n.sugars_serving || n.sugars_100g || null,
                                    fiber: n.fiber_serving || n.fiber_100g || null,
                                    sodium: n.sodium_serving ? Math.round(n.sodium_serving * 1000) : (n.sodium_100g ? Math.round(n.sodium_100g * 1000) : null),
                                    source: "global" as const,
                                };
                            })
                            .filter((f: FoodResult) => passesRelevanceGate(f, queryTokens));
                    }
                } catch (e) {
                    console.warn("Search-a-licious OFF search failed:", e);
                }
            }

            // Stale check
            if (searchSeqRef.current !== currentSeq) return;

            // Step 5: De-duplication & Combined Scoring
            const seen = new Set<string>();
            const uniqueCombined: FoodResult[] = [];

            // Order of insertion priority: Local > Basics > Community > Global
            for (const item of [...localMatches, ...basicMatches, ...communityMatches, ...globalMatches]) {
                const key = `${item.food_name.toLowerCase().trim()}|${(item.brand || "").toLowerCase().trim()}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCombined.push(item);
                }
            }

            // Rank everything with calculateScore
            uniqueCombined.sort((a, b) => {
                const scoreA = calculateScore(a, queryLower, queryTokens);
                const scoreB = calculateScore(b, queryLower, queryTokens);
                if (scoreB !== scoreA) return scoreB - scoreA;
                return a.food_name.length - b.food_name.length;
            });

            // Cap results to 20 cleanest items
            setSearchResults(uniqueCombined.slice(0, 20));
            trackEvent("food_search_completed", { query: q, results_count: uniqueCombined.length });
        } catch (e) {
            if (searchSeqRef.current !== currentSeq) return;
            console.warn("Search failed:", e);
            setSearchResults([]);
        } finally {
            if (searchSeqRef.current === currentSeq) {
                setSearching(false);
            }
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
            trackEvent("ai_food_estimation_triggered", { query: q, provider });

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
    const handleLogFood = useCallback(async (food: FoodResult, qty: number = 1) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Save/update in local custom_foods so it's cached/incremented for next time
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

        // Asynchronously contribute to global community foods index
        try {
            supabase.rpc("upsert_global_food", {
                p_food_name: food.food_name,
                p_brand: food.brand || null,
                p_serving_size: food.serving_size || "1 serving",
                p_calories: food.calories || 0,
                p_protein: food.protein || 0,
                p_fat: food.fat || 0,
                p_carbs: food.carbs || 0,
                p_sugar: food.sugar || null,
                p_fiber: food.fiber || null,
                p_sodium: food.sodium || null,
                p_barcode: null,
                p_source: food.source === "ai" ? "ai" : food.source === "basic" ? "basic" : "community"
            }).then(() => {}, () => {});
        } catch {}

        await addFoodLog({
            food_name: food.food_name,
            brand: food.brand || null,
            serving_size: food.serving_size || null,
            serving_qty: qty,
            calories: food.calories,
            protein: food.protein,
            fat: food.fat,
            carbs: food.carbs,
            sugar: food.sugar || null,
            fiber: food.fiber || null,
            sodium: food.sodium || null,
            meal_type: selectedMealType,
            log_date: logDate,
            source_type: food.source === "ai" ? "search" : "search",
            source_recipe_id: null,
            image_url: null,
            barcode: null,
        });
        trackEvent("food_logged", { source: "search", source_type: food.source, calories: food.calories * qty, quantity: qty });
        router.back();
    }, [addFoodLog, saveCustomFood, selectedMealType, logDate, router]);

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
        const qtyVal = parseFloat(quick.serving_qty) || 1;

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
            serving_qty: qtyVal,
            calories: cal, protein: pro, fat: fatVal, carbs: carb,
            sugar: null, fiber: null, sodium: null,
            meal_type: selectedMealType, log_date: logDate,
            source_type: "manual", source_recipe_id: null,
            image_url: null, barcode: null,
        });
        trackEvent("food_logged", { source: "quick_add", calories: cal * qtyVal, quantity: qtyVal });
        router.back();
    }, [quick, addFoodLog, saveCustomFood, selectedMealType, logDate, router]);

    // ── Log from Recipe ──
    const handleLogRecipe = useCallback(async (recipe: any, qty: number = 1) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await addFoodLog({
            food_name: recipe.title, brand: "SnapRecipe",
            serving_size: recipe.servings ? `1/${recipe.servings} recipe` : "1 serving", 
            serving_qty: qty,
            calories: recipe.calories || 0, protein: recipe.protein || 0,
            fat: recipe.fat || 0, carbs: recipe.carbs || 0,
            sugar: recipe.sugar || null, fiber: recipe.fiber || null,
            sodium: recipe.sodium || null, meal_type: selectedMealType, log_date: logDate,
            source_type: "recipe", source_recipe_id: recipe.id > 0 ? recipe.id : null,
            image_url: recipe.image_url || null, barcode: null,
        });
        trackEvent("food_logged", { source: "recipe", calories: (recipe.calories || 0) * qty, quantity: qty });
        router.back();
    }, [addFoodLog, selectedMealType, logDate, router]);

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
        try {
            trackEvent("scanner_opened", { mode });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push({
                pathname: "/library/calorie-counter/scan",
                params: { date: logDate, mealType: selectedMealType, mode },
            });
        } catch (e) {
            console.warn("Failed to open scanner:", e);
            Alert.alert("Error", "Could not open the scanner. Please try again.");
        }
    }, [router, logDate, selectedMealType]);

    const filteredRecipes = useMemo(() => {
        if (!recipeSearch.trim()) return recipes.filter(r => r.calories);
        return recipes.filter(r => r.calories && r.title.toLowerCase().includes(recipeSearch.toLowerCase()));
    }, [recipes, recipeSearch]);

    const searchListHeader = useMemo(() => {
        const showAiCard = !searching && searchQuery.trim().length > 0 && !aiLookedUp && !hasExactMatch;
        return (
            <View>
                {!searchQuery.trim() && searchResults.length > 0 && (
                    <Text className="text-surface-500 font-sans text-xs mb-2 px-1">FREQUENT</Text>
                )}
                {showAiCard && (
                    <Animated.View entering={FadeInDown} className="mb-3">
                        <Pressable 
                            onPress={triggerAiSearch}
                            className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-2xl flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center flex-1 mr-3">
                                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                                    <Ionicons name="sparkles" size={18} color="#FBBF24" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-amber-400 font-sans-bold text-sm">Ask AI to Estimate</Text>
                                    <Text className="text-surface-400 font-sans text-xs mt-0.5">
                                        Get nutrition facts for raw/fresh "{searchQuery}"
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#FBBF24" />
                        </Pressable>
                    </Animated.View>
                )}
            </View>
        );
    }, [searching, searchQuery, aiLookedUp, hasExactMatch, searchResults, triggerAiSearch]);

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
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <View>
                        <Text className="text-white font-sans-bold text-xl">Add Food</Text>
                        <Text className="text-surface-400 font-sans text-xs capitalize">{selectedMealType} • {logDate}</Text>
                    </View>
                </View>
            </View>

            {/* Tab Switcher */}
            <View className="flex-row mx-5 mb-4 bg-surface-900 rounded-2xl p-1">
                {TABS.map((t) => (
                    <Pressable
                        key={t.key}
                        onPress={() => {
                            setTab(t.key);
                            trackEvent("add_food_tab_changed", { tab: t.key });
                        }}
                        className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                        style={tab === t.key ? { backgroundColor: "rgba(239,68,68,0.15)" } : undefined}
                    >
                        <Ionicons name={t.icon} size={14} color={tab === t.key ? "#EF4444" : colors.textFaint} />
                        <Text className="font-sans-bold text-xs ml-1" style={{ color: tab === t.key ? "#EF4444" : colors.textFaint }}>
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
                            placeholderTextColor={colors.placeholder}
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
                            <Ionicons name="alert-circle-outline" size={40} color={colors.text} />
                            <Text className="text-white font-sans mt-3 text-center text-sm">
                                Couldn't identify "{searchQuery}".{"\n"}Try a more specific name or use Manual entry.
                            </Text>
                        </Animated.View>
                    )}

                    <FlatList
                        data={searchResults}
                        keyExtractor={(item, idx) => `${item.food_name}-${item.brand || ""}-${idx}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListHeaderComponent={searchListHeader}
                        ListEmptyComponent={
                            !searching && searchQuery.trim() ? (
                                <Animated.View entering={FadeInDown} className="items-center justify-center py-8 px-2">
                                    <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                                        <Ionicons name="search-outline" size={28} color="#9CA3AF" />
                                    </View>
                                    <Text className="text-white font-sans-bold text-base text-center">
                                        No matching foods found for "{searchQuery}"
                                    </Text>
                                    <Text className="text-surface-400 font-sans text-xs text-center mt-1 mb-5 px-6">
                                        Scan a barcode from packaging or use AI to estimate the exact nutritional facts.
                                    </Text>
                                    <View className="w-full flex-row" style={{ gap: 10 }}>
                                        <Pressable 
                                            onPress={() => handleOpenScanner("barcode")}
                                            className="flex-1 bg-surface-900 border border-white/10 p-3.5 rounded-2xl flex-row items-center justify-center"
                                        >
                                            <Ionicons name="barcode-outline" size={18} color="#FBBF24" />
                                            <Text className="text-white font-sans-bold text-xs ml-2">Scan Barcode</Text>
                                        </Pressable>
                                        <Pressable 
                                            onPress={triggerAiSearch}
                                            className="flex-1 bg-amber-400/10 border border-amber-400/30 p-3.5 rounded-2xl flex-row items-center justify-center"
                                        >
                                            <Ionicons name="sparkles" size={16} color="#FBBF24" />
                                            <Text className="text-amber-400 font-sans-bold text-xs ml-2">Ask AI</Text>
                                        </Pressable>
                                    </View>
                                </Animated.View>
                            ) : !searching && !searchQuery.trim() ? (
                                <View className="items-center justify-center py-16 opacity-40">
                                    <Ionicons name="nutrition" size={48} color={colors.text} />
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
                                <Pressable onPress={() => {
                                    setLogTarget({ type: "food", food: item });
                                    setServingQtyStr("1");
                                    setSelectedMealType(mealType);
                                }}>
                                    <GlassContainer className="flex-row items-center p-3.5 mb-2 rounded-2xl overflow-hidden"
                                        style={
                                            item.source === "basic" ? { borderColor: "rgba(52,211,153,0.25)" } :
                                            item.source === "local" ? { borderColor: "rgba(239,68,68,0.25)" } :
                                            item.source === "ai" ? { borderColor: "rgba(251,191,36,0.2)" } :
                                            item.source === "community" ? { borderColor: "rgba(52,211,153,0.2)" } : undefined
                                        }
                                    >
                                        {item.source === "basic" && (
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(52,211,153,0.15)", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Ionicons name="leaf" size={16} color="#34D399" />
                                            </View>
                                        )}
                                        {item.source === "local" && (
                                            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                                                <Ionicons name="heart" size={16} color="#EF4444" />
                                            </View>
                                        )}
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
                                                <Text className="text-surface-400 font-sans text-[10px] uppercase tracking-wider mb-0.5" numberOfLines={1}>
                                                    {item.source === "basic" ? "Curated Basic • USDA Data" : item.brand}
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
                                    <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
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
                                    <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
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
                            <Ionicons name="book" size={14} color={recipeTab === "mine" ? colors.text : colors.textFaint} />
                            <Text className={`font-sans-bold text-xs ml-2 ${recipeTab === "mine" ? "text-white" : "text-surface-400"}`}>My Recipes</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setRecipeTab("community")}
                            className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${recipeTab === "community" ? "bg-surface-800 shadow-sm" : ""}`}
                        >
                            <Ionicons name="globe" size={14} color={recipeTab === "community" ? colors.text : colors.textFaint} />
                            <Text className={`font-sans-bold text-xs ml-2 ${recipeTab === "community" ? "text-white" : "text-surface-400"}`}>Community</Text>
                        </Pressable>
                    </View>

                    <View className="flex-row items-center bg-surface-900 px-3 py-2.5 rounded-2xl mb-4">
                        <Ionicons name="search" size={18} color="#4A4A5E" />
                        <TextInput 
                            value={recipeSearch} 
                            onChangeText={handleRecipeSearch} 
                            placeholder={recipeTab === "mine" ? "Search your recipes..." : "Search community recipes..."}
                            placeholderTextColor={colors.placeholder}
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
                                <Ionicons name={recipeTab === "mine" ? "book-outline" : "globe-outline"} size={48} color={colors.text} />
                                <Text className="text-white font-sans mt-4 text-center">
                                    {recipeTab === "mine" ? "No recipes with nutrition data found." : "No community recipes found."}
                                </Text>
                            </View>
                        )}
                        renderItem={({ item, index }) => (
                            <Animated.View entering={FadeInDown.delay(index * 40)}>
                                <Pressable onPress={() => {
                                    setLogTarget({ type: "recipe", recipe: item });
                                    setServingQtyStr("1");
                                    setSelectedMealType(mealType);
                                }}>
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
                                { key: "serving_qty", label: "Serving Quantity", placeholder: "1", kb: "numeric" },
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
                                        placeholderTextColor={colors.placeholder}
                                        keyboardType={field.kb as any}
                                        className="bg-surface-900 text-white font-sans px-4 py-3 rounded-xl"
                                    />
                                </View>
                            ))}
                            {/* Meal Type Selection */}
                            <View className="mb-4 mt-2">
                                <Text className="text-surface-400 font-sans text-xs mb-2">Meal Category</Text>
                                <View className="flex-row bg-surface-900 rounded-2xl p-1 border border-white/5">
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
                                                <Ionicons name={t.icon as any} size={14} color={isSelected ? "#EF4444" : colors.textFaint} />
                                                <Text className="font-sans-bold text-[10px] ml-1" style={{ color: isSelected ? "#EF4444" : colors.textFaint }}>
                                                    {t.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                            <Pressable onPress={handleQuickAdd} style={{ backgroundColor: "#EF4444", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 8 }}>
                                <Text className="text-[#FFFFFF] font-sans-bold text-sm">Add to Log</Text>
                            </Pressable>
                        </GlassContainer>
                    </Animated.View>
                </ScrollView>
            )}
            {/* Serving Adjustment Modal */}
            {logTarget && (() => {
                const isFood = logTarget.type === "food";
                const item = isFood ? logTarget.food! : logTarget.recipe!;
                const title = isFood ? item.food_name : item.title;
                const brand = isFood ? item.brand : "SnapRecipe";
                const servingSize = isFood ? (item.serving_size || "1 serving") : (item.servings ? `1/${item.servings} recipe` : "1 serving");
                const baseCal = isFood ? item.calories : (item.calories || 0);
                const basePro = isFood ? item.protein : (item.protein || 0);
                const baseCarb = isFood ? item.carbs : (item.carbs || 0);
                const baseFat = isFood ? item.fat : (item.fat || 0);

                const qty = parseFloat(servingQtyStr) || 0;

                const displayCal = Math.round(baseCal * qty);
                const displayPro = Math.round(basePro * qty * 10) / 10;
                const displayCarb = Math.round(baseCarb * qty * 10) / 10;
                const displayFat = Math.round(baseFat * qty * 10) / 10;

                const handleIncrement = () => {
                    const nextVal = (qty + 0.5);
                    setServingQtyStr(nextVal.toString());
                };

                const handleDecrement = () => {
                    const nextVal = Math.max(0.1, qty - 0.5);
                    setServingQtyStr(nextVal.toString());
                };

                return (
                    <Modal transparent visible={logTarget !== null} animationType="none" statusBarTranslucent>
                        <View className="flex-1">
                            <Animated.View entering={FadeIn} exiting={FadeOut} className="absolute inset-0">
                                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="flex-1 bg-black/70" />
                            </Animated.View>
                            <Pressable className="flex-1 justify-end" onPress={() => setLogTarget(null)}>
                                <Pressable onPress={(e) => e.stopPropagation()}>
                                    <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown} className="pb-10 pt-4 px-5">
                                        <GlassContainer style={{ borderRadius: 24, overflow: "hidden" }}>
                                            <View className="p-6">
                                                {/* Header */}
                                                <View className="items-center mb-6">
                                                    {brand ? (
                                                        <Text className="text-surface-500 font-sans text-[10px] uppercase tracking-tighter mb-1">
                                                            {brand}
                                                        </Text>
                                                    ) : null}
                                                    <Text className="text-white font-sans-bold text-lg text-center" numberOfLines={2}>
                                                        {title}
                                                    </Text>
                                                    <Text className="text-surface-400 font-sans text-xs mt-1 text-center">
                                                        Base serving: {servingSize}
                                                    </Text>
                                                </View>

                                                {/* Macros Grid */}
                                                <View className="flex-row justify-around mb-6 bg-white/5 rounded-2xl py-4 border border-white/5">
                                                    <View className="items-center">
                                                        <Text style={{ color: "#EF4444", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayCal}</Text>
                                                        <Text className="text-surface-500 font-sans text-[10px] mt-1">Calories</Text>
                                                    </View>
                                                    <View className="items-center">
                                                        <Text style={{ color: "#60A5FA", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayPro}g</Text>
                                                        <Text className="text-surface-500 font-sans text-[10px] mt-1">Protein</Text>
                                                    </View>
                                                    <View className="items-center">
                                                        <Text style={{ color: "#FBBF24", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayCarb}g</Text>
                                                        <Text className="text-surface-500 font-sans text-[10px] mt-1">Carbs</Text>
                                                    </View>
                                                    <View className="items-center">
                                                        <Text style={{ color: "#F472B6", fontFamily: "Inter_700Bold", fontSize: 18 }}>{displayFat}g</Text>
                                                        <Text className="text-surface-500 font-sans text-[10px] mt-1">Fat</Text>
                                                    </View>
                                                </View>

                                                {/* Stepper + Input */}
                                                <View className="flex-row items-center justify-between bg-white/5 rounded-2xl px-5 py-4 mb-6 border border-white/5">
                                                    <View>
                                                        <Text className="text-white font-sans-bold text-sm">Number of Servings</Text>
                                                        <Text className="text-surface-500 font-sans text-[10px] mt-0.5">Adjust quantity to scale macros</Text>
                                                    </View>
                                                    <View className="flex-row items-center" style={{ gap: 12 }}>
                                                        <Pressable 
                                                            onPress={handleDecrement} 
                                                            className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                                        >
                                                            <Ionicons name="remove" size={20} color={colors.text} />
                                                        </Pressable>
                                                        <TextInput
                                                            value={servingQtyStr}
                                                            onChangeText={(v) => {
                                                                // Allow decimals and numbers
                                                                const sanitized = v.replace(/[^0-9.]/g, "");
                                                                setServingQtyStr(sanitized);
                                                            }}
                                                            keyboardType="decimal-pad"
                                                            className="text-white font-sans-bold text-lg text-center bg-surface-900 px-3 py-1.5 rounded-lg min-w-[50px] max-w-[80px]"
                                                        />
                                                        <Pressable 
                                                            onPress={handleIncrement} 
                                                            className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center border border-white/5"
                                                        >
                                                            <Ionicons name="add" size={20} color={colors.text} />
                                                        </Pressable>
                                                    </View>
                                                </View>

                                                {/* Meal Type Selection */}
                                                <View className="mb-6">
                                                    <Text className="text-white font-sans-bold text-sm mb-2 px-1">Meal Category</Text>
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
                                                                    <Ionicons name={t.icon as any} size={14} color={isSelected ? "#EF4444" : colors.textFaint} />
                                                                    <Text className="font-sans-bold text-[10px] ml-1" style={{ color: isSelected ? "#EF4444" : colors.textFaint }}>
                                                                        {t.label}
                                                                    </Text>
                                                                </Pressable>
                                                            );
                                                        })}
                                                    </View>
                                                </View>

                                                {/* Actions */}
                                                <View className="flex-row" style={{ gap: 12 }}>
                                                    <Pressable
                                                        onPress={() => setLogTarget(null)}
                                                        style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.card, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: colors.hairline }}
                                                    >
                                                        <Text className="text-white font-sans-semibold text-base">Cancel</Text>
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={async () => {
                                                            if (qty <= 0) {
                                                                Alert.alert("Invalid Quantity", "Please enter a quantity greater than 0.");
                                                                return;
                                                                }
                                                            setLogTarget(null);
                                                            if (isFood) {
                                                                await handleLogFood(item, qty);
                                                            } else {
                                                                await handleLogRecipe(item, qty);
                                                            }
                                                        }}
                                                        style={{ flex: 1, paddingVertical: 14, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center" }}
                                                    >
                                                        <Text className="text-[#FFFFFF] font-sans-semibold text-base">Log Food</Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        </GlassContainer>
                                    </Animated.View>
                                </Pressable>
                            </Pressable>
                        </View>
                    </Modal>
                );
            })()}
        </KeyboardAvoidingView>
    );
}

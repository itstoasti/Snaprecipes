import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, Pressable, FlatList, Modal, TextInput, Image, ActivityIndicator, Platform } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMealPlans } from "@/hooks/useMealPlans";
import { useRecipes } from "@/hooks/useRecipes";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { format, addDays, isSameDay } from "@/lib/dateUtils";
import * as Haptics from "expo-haptics";

type SelectorTab = "mine" | "community";

export default function MealPrepScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { plans, loading, addRecipeToPlan, removeFromPlan } = useMealPlans();
    const { recipes, saveCommunityRecipe } = useRecipes();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isSelectorVisible, setIsSelectorVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectorTab, setSelectorTab] = useState<SelectorTab>("mine");
    const [communityRecipes, setCommunityRecipes] = useState<any[]>([]);
    const [communityLoading, setCommunityLoading] = useState(false);
    const [addingId, setAddingId] = useState<string | number | null>(null);

    // Generate next 14 days
    const dates = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));
    }, []);

    const dailyPlans = plans.filter(p => p.planned_date === format(selectedDate, "yyyy-MM-dd"));

    // ── Load community recipes ──────────────────────────────────
    const loadCommunityRecipes = useCallback(async (query: string) => {
        setCommunityLoading(true);
        try {
            let q = supabase
                .from("public_recipes")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (query.trim()) {
                q = q.ilike("title", `%${query.trim()}%`);
            }

            const { data, error } = await q;
            if (error) throw error;
            setCommunityRecipes(data || []);
        } catch (error) {
            console.error("Failed to load community recipes:", error);
        } finally {
            setCommunityLoading(false);
        }
    }, []);

    // Load community recipes when tab switches or modal opens
    useEffect(() => {
        if (isSelectorVisible && selectorTab === "community") {
            loadCommunityRecipes(searchQuery);
        }
    }, [isSelectorVisible, selectorTab]);

    // ── Add personal recipe ─────────────────────────────────────
    const handleAddRecipe = async (recipeId: number) => {
        await addRecipeToPlan(recipeId, format(selectedDate, "yyyy-MM-dd"));
        trackEvent("meal_planned", { source: "mine" });
        setIsSelectorVisible(false);
        setSearchQuery("");
    };

    // ── Add community recipe (import first) ─────────────────────
    const handleAddCommunityRecipe = async (publicId: string) => {
        setAddingId(publicId);
        try {
            const newId = await saveCommunityRecipe(publicId);
            if (newId) {
                await addRecipeToPlan(newId, format(selectedDate, "yyyy-MM-dd"));
                trackEvent("meal_planned", { source: "community" });
            }
            setIsSelectorVisible(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Failed to add community recipe:", error);
        } finally {
            setAddingId(null);
        }
    };

    // ── Handle search ───────────────────────────────────────────
    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
        if (selectorTab === "community") {
            loadCommunityRecipes(text);
        }
    }, [selectorTab, loadCommunityRecipes]);

    // ── Filter personal recipes ─────────────────────────────────
    const filteredRecipes = useMemo(() => {
        if (!searchQuery.trim()) return recipes;
        return recipes.filter(r =>
            r.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recipes, searchQuery]);

    const handleCloseSelector = () => {
        setIsSelectorVisible(false);
        setSearchQuery("");
        setSelectorTab("mine");
    };

    const handleTabSwitch = (newTab: SelectorTab) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectorTab(newTab);
        setSearchQuery("");
    };

    const currentList = selectorTab === "mine" ? filteredRecipes : communityRecipes;
    const isListLoading = selectorTab === "community" && communityLoading;

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
            <Stack.Screen options={{ headerShown: false }} />

            <View className="px-5 flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center mr-3"
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </Pressable>
                    <Text className="text-white font-sans-bold text-3xl">Meal Prep</Text>
                </View>

                <Pressable
                    onPress={() => router.push("/library/shopping-list")}
                    className="w-10 h-10 rounded-full bg-rose-500/20 items-center justify-center"
                >
                    <Ionicons name="cart" size={22} color="#FB7185" />
                </Pressable>
            </View>

            {/* Date Scroller */}
            <View className="mb-8">
                <FlatList
                    data={dates}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    keyExtractor={(item) => item.toISOString()}
                    renderItem={({ item }) => {
                        const active = isSameDay(item, selectedDate);
                        return (
                            <Pressable
                                onPress={() => setSelectedDate(item)}
                                className={`items-center justify-center w-16 h-24 rounded-3xl mr-3 ${active ? 'bg-emerald-500' : 'bg-surface-800'}`}
                            >
                                <Text className={`text-[10px] uppercase font-sans-bold ${active ? 'text-white' : 'text-surface-400'}`}>
                                    {format(item, "EEE")}
                                </Text>
                                <Text className={`text-xl font-sans-bold mt-1 ${active ? 'text-white' : 'text-white'}`}>
                                    {format(item, "d")}
                                </Text>
                                {plans.some(p => p.planned_date === format(item, "yyyy-MM-dd")) && (
                                    <View className={`w-1.5 h-1.5 rounded-full mt-2 ${active ? 'bg-white' : 'bg-emerald-500'}`} />
                                )}
                            </Pressable>
                        );
                    }}
                />
            </View>

            <View className="flex-1 px-5">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white font-sans-bold text-xl">
                        {isSameDay(selectedDate, new Date()) ? "Today's Meals" : format(selectedDate, "EEEE, MMM d")}
                    </Text>
                    <Pressable
                        onPress={() => setIsSelectorVisible(true)}
                        className="bg-emerald-500/20 px-4 py-2 rounded-full"
                    >
                        <Text className="text-emerald-400 font-sans-bold text-xs">+ Add Recipe</Text>
                    </Pressable>
                </View>

                {dailyPlans.length === 0 ? (
                    <View className="flex-1 items-center justify-center opacity-40">
                        <Ionicons name="restaurant-outline" size={60} color="#FFFFFF" />
                        <Text className="text-white font-sans mt-4">No meals planned for this day</Text>
                    </View>
                ) : (
                    <FlatList
                        data={dailyPlans}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item, index }) => (
                            <Animated.View entering={FadeInDown.delay(index * 100)}>
                                <GlassContainer className="flex-row items-center p-3 mb-3 rounded-3xl overflow-hidden">
                                    <Pressable
                                        onPress={() => router.push(`/recipe/${item.recipe_id}`)}
                                        className="flex-row items-center flex-1"
                                    >
                                        <View className="w-16 h-16 rounded-2xl bg-surface-800 overflow-hidden mr-4">
                                            {item.recipe.image_url ? (
                                                <Image source={{ uri: item.recipe.image_url }} className="flex-1" />
                                            ) : (
                                                <View className="flex-1 items-center justify-center">
                                                    <Text className="text-2xl">🍽️</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-bold text-base" numberOfLines={1}>
                                                {item.recipe.title}
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-1">
                                                {item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)} • {item.servings} Servings
                                            </Text>
                                        </View>
                                    </Pressable>
                                    <View className="w-[1px] h-8 bg-surface-800 mx-2 opacity-50" />
                                    <Pressable
                                        onPress={() => {
                                            removeFromPlan(item.id);
                                            trackEvent("meal_unplanned", { recipe_id: item.recipe_id });
                                        }}
                                        className="w-10 h-10 items-center justify-center"
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                    </Pressable>
                                </GlassContainer>
                            </Animated.View>
                        )}
                    />
                )}
            </View>

            {/* ── Recipe Selector Modal ── */}
            <Modal
                visible={isSelectorVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseSelector}
            >
                <View className="flex-1 bg-surface-950/95" style={{ paddingTop: insets.top }}>
                    <View className="px-5 py-4 border-b border-surface-800">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-white font-sans-bold text-xl">Select a Recipe</Text>
                            <Pressable onPress={handleCloseSelector}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        {/* Tab Toggle */}
                        <View
                            style={{
                                flexDirection: "row",
                                backgroundColor: "#1A1A2E",
                                borderRadius: 14,
                                padding: 3,
                                marginBottom: 12,
                            }}
                        >
                            <Pressable
                                onPress={() => handleTabSwitch("mine")}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    backgroundColor: selectorTab === "mine" ? "#10B981" : "transparent",
                                }}
                            >
                                <Text style={{
                                    color: selectorTab === "mine" ? "#FFF" : "#6E6E85",
                                    fontWeight: "700",
                                    fontSize: 14,
                                }}>
                                    My Recipes
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => handleTabSwitch("community")}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    backgroundColor: selectorTab === "community" ? "#10B981" : "transparent",
                                }}
                            >
                                <Text style={{
                                    color: selectorTab === "community" ? "#FFF" : "#6E6E85",
                                    fontWeight: "700",
                                    fontSize: 14,
                                }}>
                                    Community
                                </Text>
                            </Pressable>
                        </View>

                        {/* Search Bar */}
                        <View className="flex-row items-center bg-surface-900 px-3 rounded-xl" style={{ paddingVertical: Platform.OS === "ios" ? 10 : 4 }}>
                            <Ionicons name="search" size={18} color="#4A4A5E" />
                            <TextInput
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                placeholder={selectorTab === "mine" ? "Search your recipes…" : "Search community recipes…"}
                                placeholderTextColor="#4A4A5E"
                                className="flex-1 text-white font-sans ml-2"
                                autoFocus={false}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <Pressable onPress={() => handleSearchChange("")}>
                                    <Ionicons name="close-circle" size={18} color="#4A4A5E" />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Recipe List */}
                    {isListLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#10B981" />
                        </View>
                    ) : (
                        <FlatList
                            data={currentList}
                            contentContainerStyle={{ padding: 20 }}
                            keyExtractor={(item) => `${selectorTab}-${item.id}`}
                            ListEmptyComponent={() => (
                                <View className="items-center justify-center py-20 opacity-40">
                                    <Ionicons name={selectorTab === "mine" ? "book-outline" : "globe-outline"} size={48} color="#FFFFFF" />
                                    <Text className="text-white font-sans mt-4 text-center px-8">
                                        {searchQuery.trim()
                                            ? `No recipes found matching "${searchQuery}"`
                                            : selectorTab === "mine"
                                                ? "No recipes in your library yet. Import one first!"
                                                : "No community recipes available yet."}
                                    </Text>
                                </View>
                            )}
                            renderItem={({ item }) => {
                                const isAdding = addingId === item.id;
                                return (
                                    <Pressable
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (selectorTab === "mine") {
                                                handleAddRecipe(item.id);
                                            } else {
                                                handleAddCommunityRecipe(item.id);
                                            }
                                        }}
                                        disabled={isAdding}
                                        className="flex-row items-center bg-surface-900 mb-3 p-3 rounded-2xl"
                                        style={{ opacity: isAdding ? 0.5 : 1 }}
                                    >
                                        <View className="w-12 h-12 rounded-xl bg-surface-800 overflow-hidden mr-4">
                                            {item.image_url && <Image source={{ uri: item.image_url }} className="flex-1" />}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-sans-bold" numberOfLines={1}>{item.title}</Text>
                                            {selectorTab === "community" && item.source_domain && (
                                                <Text className="text-surface-500 font-sans text-xs mt-0.5" numberOfLines={1}>{item.source_domain}</Text>
                                            )}
                                        </View>
                                        {isAdding ? (
                                            <ActivityIndicator size="small" color="#10B981" />
                                        ) : (
                                            <Ionicons name="add-circle" size={24} color="#10B981" />
                                        )}
                                    </Pressable>
                                );
                            }}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

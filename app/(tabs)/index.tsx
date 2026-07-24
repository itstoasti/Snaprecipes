import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Image, Dimensions, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRecipes } from "@/hooks/useRecipes";
import { useFoodLog } from "@/hooks/useFoodLog";
import { useCollections } from "@/hooks/useCollections";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import ImportModal from "@/components/ImportModal";
import SavesExplanationModal from "@/components/SavesExplanationModal";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { canExtractRecipe, getCurrentUsage } from "@/lib/usage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function GroupedDashboard() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { recipes, loadRecipes } = useRecipes();
    const { dailyTotals, refresh: refreshLogs } = useFoodLog();
    const { collections } = useCollections();
    const { isPro } = useRevenueCat();
    
    const [trending, setTrending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showImport, setShowImport] = useState(false);
    const [usageCount, setUsageCount] = useState(0);
    const [showSavesExplanation, setShowSavesExplanation] = useState(false);

    const checkUsageAndOpenModal = async () => {
        const allowed = await canExtractRecipe(isPro);
        if (allowed) {
            setShowImport(true);
        } else {
            router.push("/paywall");
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRecipes();
            refreshLogs();
            fetchTrending();
            if (!isPro) {
                getCurrentUsage().then(setUsageCount).catch(console.error);
            }
        }, [loadRecipes, refreshLogs, isPro])
    );

    const fetchTrending = async () => {
        try {
            const { data } = await supabase
                .from("public_recipes")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);
            
            if (data && data.length > 0) {
                // Use a seeded shuffle based on the date so it only changes daily
                const dateStr = new Date().toISOString().split("T")[0];
                // Simple deterministic "shuffle" using the date string as a seed
                let seed = 0;
                for (let i = 0; i < dateStr.length; i++) {
                    seed += dateStr.charCodeAt(i);
                }
                
                const dailySelection = [...data]
                    .map((item, i) => ({ item, sort: (Math.sin(seed + i) * 10000) % 1 }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ item }) => item);

                setTrending(dailySelection.slice(0, 4));
            } else {
                setTrending([]);
            }
        } catch (e) {
            console.error("Failed to fetch trending:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-surface-950">
            <Stack.Screen options={{ headerShown: false }} />
            
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ 
                    paddingTop: Math.max(insets.top, 20) + 10,
                    paddingBottom: 120,
                    paddingHorizontal: 20
                }}
            >
                {/* Header Area */}
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-surface-500 font-sans text-xs uppercase tracking-widest mb-1">SnapRecipe</Text>
                        <Text className="text-white font-sans-bold text-3xl">Dashboard</Text>
                    </View>
                    <View className="flex-row items-center" style={{ gap: 10 }}>
                        {!isPro && (
                            <Pressable 
                                onPress={() => setShowSavesExplanation(true)}
                                className="h-12 px-4 rounded-2xl bg-surface-900 border border-white/5 flex-row items-center justify-center"
                                style={{ gap: 6 }}
                            >
                                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: usageCount >= 5 ? "#EF4444" : "#FF6B35" }} />
                                <Text className="text-white font-sans-bold text-xs">{usageCount}/5 Saves</Text>
                            </Pressable>
                        )}
                        <Pressable 
                            onPress={() => router.push("/settings")}
                            className="w-12 h-12 rounded-2xl bg-surface-900 border border-white/5 items-center justify-center"
                        >
                            <Ionicons name="person-outline" size={24} color="white" />
                        </Pressable>
                    </View>
                </View>

                {/* ── RECIPE MANAGEMENT (Main Purpose) ── */}
                <View className="mb-10">
                    <Pressable 
                        onPress={checkUsageAndOpenModal}
                        className="w-full bg-accent rounded-[40px] p-8 justify-between shadow-lg shadow-accent/20"
                        style={{ height: 180 }}
                    >
                        <View className="flex-row justify-between items-start">
                            <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                                <Ionicons name="cloud-download" size={28} color="white" />
                            </View>
                            <Ionicons name="sparkles" size={20} color="white" className="opacity-40" />
                        </View>
                        <View>
                            <Text className="text-white font-sans-bold text-2xl leading-tight">Import New Recipe</Text>
                            <Text className="text-white/70 font-sans text-sm mt-1">URL, Video, or Photo</Text>
                        </View>
                    </Pressable>
                </View>

                {/* ── CALORIE & FOOD LOGGING (Secondary Cluster) ── */}
                <View className="mb-10">
                    <View className="flex-row items-center mb-4 px-1">
                        <Text className="text-surface-400 font-sans-bold text-xs uppercase tracking-widest">Nutrition Tracking</Text>
                        <View className="flex-1 h-[1px] bg-white/5 ml-4" />
                    </View>

                    <View className="flex-row" style={{ gap: 12 }}>
                        {/* Detailed Calorie Tile */}
                        <Pressable 
                            onPress={() => router.push("/library/calorie-counter")}
                            className="flex-[2] bg-surface-900 rounded-[32px] p-6 border border-white/5"
                        >
                            <View className="flex-row justify-between items-center mb-4">
                                <Ionicons name="flame" size={20} color="#FF6B35" />
                                <Text className="text-surface-500 font-sans-bold text-[10px]">DAILY</Text>
                            </View>
                            <Text className="text-white font-sans-bold text-3xl">{Math.round(dailyTotals.calories)}</Text>
                            <Text className="text-surface-500 font-sans text-[11px] mb-4">kcal today</Text>
                            <View className="h-1.5 bg-white/5 rounded-full overflow-hidden flex-row">
                                <View style={{ flex: dailyTotals.protein || 1, backgroundColor: '#60A5FA' }} className="h-full" />
                                <View style={{ flex: dailyTotals.carbs || 1, backgroundColor: '#FBBF24' }} className="h-full mx-[1px]" />
                                <View style={{ flex: dailyTotals.fat || 1, backgroundColor: '#F472B6' }} className="h-full" />
                            </View>
                        </Pressable>

                        {/* Food Logging Actions */}
                        <View style={{ gap: 12 }} className="flex-1">
                            <Pressable 
                                onPress={() => router.push("/library/calorie-counter/scan")}
                                className="flex-1 bg-surface-900 rounded-[28px] p-4 border border-white/5 items-center justify-center"
                            >
                                <Ionicons name="scan" size={20} color="#FBBF24" />
                                <Text className="text-white font-sans-bold text-[10px] mt-2">Scan</Text>
                            </Pressable>
                            <Pressable 
                                onPress={() => router.push("/library/calorie-counter/add-food")}
                                className="flex-1 bg-surface-900 rounded-[28px] p-4 border border-white/5 items-center justify-center"
                            >
                                <Ionicons name="search" size={20} color="#60A5FA" />
                                <Text className="text-white font-sans-bold text-[10px] mt-2">Log</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ── DISCOVERY & KITCHEN ── */}
                <View className="mb-10">
                    <View className="flex-row justify-between items-center mb-4 px-1">
                        <Text className="text-white font-sans-bold text-xl">My Recipes</Text>
                        <Pressable onPress={() => router.push("/(tabs)/recipes")}>
                            <Text className="text-accent font-sans-semibold text-xs">VIEW ALL</Text>
                        </Pressable>
                    </View>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={{ marginHorizontal: -20 }}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                    >
                        {recipes.slice(0, 4).map((recipe) => (
                            <Pressable 
                                key={recipe.id}
                                onPress={() => router.push(`/recipe/${recipe.id}`)}
                                style={{ width: 140 }}
                                className="bg-surface-900 rounded-[28px] overflow-hidden border border-white/5"
                            >
                                <View className="h-28">
                                    {recipe.image_url ? (
                                        <Image source={{ uri: recipe.image_url }} className="w-full h-full" />
                                    ) : (
                                        <View className="w-full h-full bg-surface-800 items-center justify-center">
                                            <Text className="text-xl">🍽️</Text>
                                        </View>
                                    )}
                                </View>
                                <View className="p-3">
                                    <Text className="text-white font-sans-bold text-[11px]" numberOfLines={1}>{recipe.title}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                <View className="mb-10">
                    <View className="flex-row justify-between items-center mb-4 px-1">
                        <Text className="text-white font-sans-bold text-xl">Community Recipes</Text>
                        <Pressable onPress={() => router.push("/library/community")}>
                            <Ionicons name="arrow-forward" size={20} color="#FF6B35" />
                        </Pressable>
                    </View>
                    <View style={{ gap: 12 }}>
                        {trending.slice(0, 3).map((item) => (
                            <Pressable 
                                key={item.id}
                                onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: item.id, isCommunity: 'true' } })}
                                className="bg-surface-900 rounded-[32px] p-4 border border-white/5 flex-row items-center"
                            >
                                <Image source={{ uri: item.image_url }} className="w-14 h-14 rounded-2xl mr-4" />
                                <View className="flex-1">
                                    <Text className="text-white font-sans-bold text-sm" numberOfLines={1}>{item.title}</Text>
                                    <Text className="text-surface-500 font-sans text-[10px] mt-1">{item.save_count} saves</Text>
                                </View>
                                <Ionicons name="heart-outline" size={18} color="#F472B6" />
                            </Pressable>
                        ))}
                    </View>
                </View>

            </ScrollView>

            <ImportModal 
                visible={showImport} 
                onClose={() => setShowImport(false)} 
            />

            <SavesExplanationModal 
                visible={showSavesExplanation}
                usageCount={usageCount}
                onClose={() => setShowSavesExplanation(false)}
            />
        </View>
    );
}

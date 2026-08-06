import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDatabase } from "@/db/client";
import RecipeFeed from "@/components/RecipeFeed";
import Animated, { FadeInDown } from "react-native-reanimated";
import AddRecipesModal from "@/components/AddRecipesModal";
import { useTheme } from "@/hooks/useTheme";

export default function CollectionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [collectionName, setCollectionName] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const db = await getDatabase();
        
        // Get collection name
        const col = await db.getFirstAsync<{ name: string }>(
            "SELECT name FROM collections WHERE id = ?",
            [parseInt(id)]
        );
        if (col) setCollectionName(col.name);

        // Get recipes in this collection
        const results = await db.getAllAsync<any>(
            `SELECT r.* FROM recipes r
             INNER JOIN recipe_collections rc ON r.id = rc.recipe_id
             WHERE rc.collection_id = ? ORDER BY r.created_at DESC`,
            [parseInt(id)]
        );
        setRecipes(results);
        setLoading(false);
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View className="px-5 flex-row items-center justify-between mb-6">
                <View className="flex-row items-center flex-1">
                    <Pressable 
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center mr-4"
                    >
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </Pressable>
                    <View className="flex-1">
                        <Text className="text-surface-500 font-sans text-xs uppercase tracking-widest mb-0.5">Cookbook</Text>
                        <Text className="text-white font-sans-bold text-2xl" numberOfLines={1}>
                            {collectionName || "Loading..."}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => setShowAddModal(true)}
                        className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center ml-4"
                    >
                        <Ionicons name="add-outline" size={24} color="#FF6B35" />
                    </Pressable>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF6B35" />
                </View>
            ) : recipes.length === 0 ? (
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-20 h-20 rounded-full bg-surface-900 items-center justify-center mb-4">
                        <Ionicons name="folder-open-outline" size={40} color="#4A4A5E" />
                    </View>
                    <Text className="text-white font-sans-bold text-lg mb-2">Empty Cookbook</Text>
                    <Text className="text-surface-400 font-sans text-sm text-center">
                        Add recipes to this cookbook from your library to see them here.
                    </Text>
                </View>
            ) : (
                <RecipeFeed 
                    recipes={recipes} 
                    onRefresh={loadData}
                    loading={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            )}

            <AddRecipesModal
                visible={showAddModal}
                collectionId={parseInt(id || "0")}
                onClose={() => setShowAddModal(false)}
                onAddSuccess={loadData}
            />
        </View>
    );
}

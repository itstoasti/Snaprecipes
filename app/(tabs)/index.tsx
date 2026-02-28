import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Platform, TextInput, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useRecipes } from "@/hooks/useRecipes";
import { useCollections } from "@/hooks/useCollections";
import RecipeFeed from "@/components/RecipeFeed";
import FilterBar from "@/components/FilterBar";
import FloatingActionButton from "@/components/FloatingActionButton";
import ImportModal from "@/components/ImportModal";
import { getDatabase } from "@/db/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { pushPendingChanges, pullRemoteChanges } from "@/lib/sync";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { canExtractRecipe } from "@/lib/usage";

interface TagItem {
    id: number;
    name: string;
}

export default function HomeScreen() {
    const { recipes, loading, loadRecipes } = useRecipes();
    const { collections } = useCollections();
    const [showImport, setShowImport] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");
    const [tags, setTags] = useState<TagItem[]>([]);
    const [filteredRecipes, setFilteredRecipes] = useState(recipes);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isPro } = useRevenueCat();
    const params = useLocalSearchParams();

    // Load tags
    useEffect(() => {
        (async () => {
            const db = await getDatabase();
            const t = await db.getAllAsync<TagItem>("SELECT * FROM tags ORDER BY name");
            setTags(t);
        })();
    }, [recipes]);

    // Refresh on focus and handle incoming filter params from other tabs
    useFocusEffect(
        useCallback(() => {
            loadRecipes();
            if (params.filter && typeof params.filter === "string") {
                setActiveFilter(params.filter);
            } else {
                setActiveFilter("all");
            }
        }, [loadRecipes, params.filter])
    );

    // Apply filter and search
    useEffect(() => {
        const applyFilter = async () => {
            let results: any[] = [];

            if (activeFilter === "all") {
                results = recipes;
            } else {
                if (activeFilter.startsWith("col_")) {
                    const colId = parseInt(activeFilter.replace("col_", ""));
                    const db = await getDatabase();
                    results = await db.getAllAsync<any>(
                        `SELECT r.* FROM recipes r
               INNER JOIN recipe_collections rc ON r.id = rc.recipe_id
               WHERE rc.collection_id = ? ORDER BY r.created_at DESC`,
                        [colId]
                    );
                } else if (activeFilter.startsWith("tag_")) {
                    const tagId = parseInt(activeFilter.replace("tag_", ""));
                    const db = await getDatabase();
                    results = await db.getAllAsync<any>(
                        `SELECT r.* FROM recipes r
               INNER JOIN recipe_tags rt ON r.id = rt.recipe_id
               WHERE rt.tag_id = ? ORDER BY r.created_at DESC`,
                        [tagId]
                    );
                } else {
                    results = recipes;
                }
            }

            // Apply search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                results = results.filter((r: any) =>
                    r.title?.toLowerCase().includes(query) ||
                    r.description?.toLowerCase().includes(query)
                );
            }

            setFilteredRecipes(results);
        };
        applyFilter();
    }, [activeFilter, recipes, searchQuery]);

    const filterItems = [
        { id: "all", label: "All Recipes", type: "all" as const },
        ...collections.map((c) => ({
            id: `col_${c.id}`,
            label: c.name,
            type: "collection" as const,
        })),
        ...tags.map((t) => ({
            id: `tag_${t.id}`,
            label: t.name,
            type: "tag" as const,
        })),
    ];

    const handleRefresh = useCallback(async () => {
        try {
            await pushPendingChanges();
            await pullRemoteChanges();
        } catch (e) {
            console.log("Manual sync failed:", e);
        } finally {
            await loadRecipes();
        }
    }, [loadRecipes]);

    const checkUsageAndOpenModal = async () => {
        const allowed = await canExtractRecipe(isPro);
        if (allowed) {
            setShowImport(true);
        } else {
            router.push("/paywall");
        }
    };

    return (
        <View
            className="flex-1 bg-surface-950"
            style={{ paddingTop: Math.max(insets.top, 20) + 10 }}
        >
            {/* Header */}
            <View className="px-5 mb-4">
                <Text className="text-surface-400 font-sans text-xs uppercase tracking-widest">
                    Your Kitchen
                </Text>
                <Text className="text-white font-sans-bold text-3xl mt-0.5">
                    Recipes
                </Text>
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-4">
                <View className="flex-row items-center bg-surface-900 rounded-2xl px-4 py-1 border border-surface-800">
                    <Ionicons name="search" size={20} color="#6E6E85" className="mr-2" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search recipes (e.g., chicken)..."
                        placeholderTextColor="#6E6E85"
                        className="flex-1 text-white font-sans text-base py-3"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery("")} className="p-2 -mr-2">
                            <Ionicons name="close-circle" size={18} color="#6E6E85" />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Filters */}
            {filterItems.length > 1 && (
                <FilterBar
                    filters={filterItems}
                    activeFilter={activeFilter}
                    onFilterSelect={setActiveFilter}
                />
            )}

            {/* Recipe Grid */}
            <RecipeFeed
                recipes={filteredRecipes}
                loading={loading}
                onRefresh={handleRefresh}
                {...(activeFilter.startsWith("col_") ? {
                    emptyTitle: "This Collection is Empty",
                    emptyMessage: "Open a recipe and tap the bookmark icon to add it to this collection.",
                } : {})}
            />

            {/* FAB */}
            <FloatingActionButton onPress={checkUsageAndOpenModal} />

            {/* Import Modal */}
            <ImportModal
                visible={showImport}
                onClose={() => {
                    setShowImport(false);
                    loadRecipes();
                }}
            />
        </View>
    );
}

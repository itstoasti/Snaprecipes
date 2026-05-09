import React, { useState, useCallback, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useRecipes } from "@/hooks/useRecipes";
import RecipeFeed from "@/components/RecipeFeed";
import FloatingActionButton from "@/components/FloatingActionButton";
import ImportModal from "@/components/ImportModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { pushPendingChanges, pullRemoteChanges } from "@/lib/sync";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { canExtractRecipe } from "@/lib/usage";

export default function RecipesScreen() {
    const { recipes, loading, loadRecipes } = useRecipes();
    const [showImport, setShowImport] = useState(false);
    const [filteredRecipes, setFilteredRecipes] = useState(recipes);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isPro } = useRevenueCat();

    // Refresh recipes data on every focus
    useFocusEffect(
        useCallback(() => {
            loadRecipes();
        }, [loadRecipes])
    );

    // Apply search
    useEffect(() => {
        let results = recipes;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            results = recipes.filter(r => 
                r.title.toLowerCase().includes(query) || 
                r.description?.toLowerCase().includes(query)
            );
        }
        setFilteredRecipes(results);
    }, [recipes, searchQuery]);

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
                        placeholder="Search recipes..."
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

            <View className="flex-1">
                <RecipeFeed
                    recipes={filteredRecipes}
                    loading={loading}
                    onRefresh={handleRefresh}
                />
            </View>

            <FloatingActionButton onPress={checkUsageAndOpenModal} />

            <ImportModal
                visible={showImport}
                onClose={() => setShowImport(false)}
                onImportSuccess={() => {
                    setShowImport(false);
                    loadRecipes();
                }}
            />
        </View>
    );
}

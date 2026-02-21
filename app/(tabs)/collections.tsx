import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    Pressable,
    TextInput,
    Alert,
    Platform,
    StatusBar as RNStatusBar,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCollections } from "@/hooks/useCollections";
import { getDatabase } from "@/db/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CollectionsScreen() {
    const { collections, loading, loadCollections, createCollection, deleteCollection } =
        useCollections();
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [recipeCounts, setRecipeCounts] = useState<Record<number, number>>({});
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    useFocusEffect(
        useCallback(() => {
            loadCollections();
            loadCounts();
        }, [loadCollections])
    );

    const loadCounts = async () => {
        const db = await getDatabase();
        const counts = await db.getAllAsync<{ collection_id: number; count: number }>(
            `SELECT collection_id, COUNT(*) as count FROM recipe_collections GROUP BY collection_id`
        );
        const map: Record<number, number> = {};
        counts.forEach((c) => (map[c.collection_id] = c.count));
        setRecipeCounts(map);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await createCollection(newName.trim());
        setNewName("");
        setShowCreate(false);
    };

    const handleDelete = (id: number, name: string) => {
        Alert.alert(
            "Delete Collection",
            `Are you sure you want to delete "${name}"? Recipes won't be deleted.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteCollection(id),
                },
            ]
        );
    };

    const COLORS = ["#FF6B35", "#34D399", "#818CF8", "#F472B6", "#FBBF24", "#22D3EE"];

    return (
        <View
            className="flex-1 bg-surface-950"
            style={{ paddingTop: Math.max(insets.top, 20) + 10 }}
        >
            {/* Header */}
            <View className="px-5 flex-row items-center justify-between mb-4">
                <View>
                    <Text className="text-surface-400 font-sans text-xs uppercase tracking-widest">
                        Organize
                    </Text>
                    <Text className="text-white font-sans-bold text-3xl mt-0.5">
                        Collections
                    </Text>
                </View>
                <Pressable
                    onPress={() => setShowCreate(!showCreate)}
                    className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center"
                >
                    <Ionicons
                        name={showCreate ? "close" : "add"}
                        size={24}
                        color="#FF6B35"
                    />
                </Pressable>
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-4">
                <View className="flex-row items-center bg-surface-900 rounded-2xl px-4 py-1 border border-surface-800">
                    <Ionicons name="search" size={20} color="#6E6E85" className="mr-2" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search collections..."
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

            {/* Create Collection */}
            {showCreate && (
                <Animated.View
                    entering={FadeInDown.springify()}
                    className="mx-5 mb-4 bg-surface-800 rounded-2xl p-4 flex-row items-center"
                >
                    <TextInput
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="Collection name..."
                        placeholderTextColor="#6E6E85"
                        className="flex-1 text-white font-sans text-base mr-3"
                        autoFocus
                        onSubmitEditing={handleCreate}
                    />
                    <Pressable
                        onPress={handleCreate}
                        className="bg-accent px-4 py-2 rounded-xl"
                    >
                        <Text className="text-white font-sans-semibold text-sm">Create</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Collections List */}
            <FlatList
                data={filteredCollections}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View className="items-center justify-center pt-20">
                        <Ionicons name="folder-open-outline" size={56} color="#4A4A5E" />
                        <Text className="text-surface-400 font-sans text-sm mt-3 text-center">
                            Create collections to organize your recipes
                        </Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                        <Pressable
                            onPress={() => router.push({ pathname: "/(tabs)/", params: { filter: `col_${item.id}` } })}
                            onLongPress={() => handleDelete(item.id, item.name)}
                            className="flex-row items-center py-4 border-b border-surface-800"
                        >
                            <View
                                className="w-11 h-11 rounded-xl items-center justify-center mr-4"
                                style={{ backgroundColor: COLORS[index % COLORS.length] + "20" }}
                            >
                                <Ionicons
                                    name="folder"
                                    size={22}
                                    color={COLORS[index % COLORS.length]}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-sans-semibold text-base">
                                    {item.name}
                                </Text>
                                <Text className="text-surface-400 font-sans text-xs mt-0.5">
                                    {recipeCounts[item.id] || 0} recipes
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#6E6E85" />
                        </Pressable>
                    </Animated.View>
                )}
            />
        </View>
    );
}

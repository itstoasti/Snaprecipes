import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    ActivityIndicator,
    ScrollView,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown, FadeInDown } from "react-native-reanimated";
import GlassContainer from "./GlassContainer";
import { useCollections } from "@/hooks/useCollections";
import { getDatabase } from "@/db/client";

interface CollectionPickerModalProps {
    visible: boolean;
    recipeId: number;
    onClose: () => void;
}

export default function CollectionPickerModal({
    visible,
    recipeId,
    onClose,
}: CollectionPickerModalProps) {
    const { collections, createCollection, addRecipeToCollection, removeRecipeFromCollection } = useCollections();
    const [loading, setLoading] = useState(true);
    const [assignedCollectionIds, setAssignedCollectionIds] = useState<Set<number>>(new Set());
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");

    useEffect(() => {
        if (!visible) return;

        const loadAssignments = async () => {
            setLoading(true);
            try {
                const db = await getDatabase();
                const results = await db.getAllAsync<{ collection_id: number }>(
                    "SELECT collection_id FROM recipe_collections WHERE recipe_id = ?",
                    [recipeId]
                );
                const ids = new Set(results.map(r => r.collection_id));
                setAssignedCollectionIds(ids);
            } catch (error) {
                console.error("Failed to load recipe collections:", error);
            } finally {
                setLoading(false);
            }
        };

        loadAssignments();
    }, [visible, recipeId]);

    const toggleCollection = async (collectionId: number) => {
        const isAssigned = assignedCollectionIds.has(collectionId);

        // Optimistic UI update
        const newSet = new Set(assignedCollectionIds);
        if (isAssigned) {
            newSet.delete(collectionId);
        } else {
            newSet.add(collectionId);
        }
        setAssignedCollectionIds(newSet);

        try {
            if (isAssigned) {
                await removeRecipeFromCollection(recipeId, collectionId);
            } else {
                await addRecipeToCollection(recipeId, collectionId);
            }
        } catch (error) {
            console.error("Failed to toggle collection assignment:", error);
            // Revert optimistic update on failure (simplistic approach for MVP)
            setAssignedCollectionIds(assignedCollectionIds);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const newId = await createCollection(newName.trim());
            setNewName("");
            setShowCreate(false);
            if (typeof newId === 'number' || typeof newId === 'string') {
                await toggleCollection(Number(newId));
            }
        } catch (error) {
            console.error("Failed to create collection inline:", error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1">
                <Pressable
                    onPress={onClose}
                    className="flex-1 bg-black/60 justify-end"
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Animated.View entering={SlideInDown.springify().damping(22).stiffness(120)}>
                            <GlassContainer
                                style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
                                className="p-6 pb-12 max-h-[80vh]"
                            >
                                {/* Handle */}
                                <View className="self-center w-10 h-1 bg-surface-500 rounded-full mb-5" />

                                <View className="flex-row items-center justify-between mb-1 mt-2">
                                    <Text className="text-white font-sans-bold text-xl">
                                        Save to Collection
                                    </Text>
                                    <Pressable
                                        onPress={() => setShowCreate(!showCreate)}
                                        className="w-8 h-8 rounded-full bg-surface-800 items-center justify-center"
                                    >
                                        <Ionicons
                                            name={showCreate ? "close" : "add"}
                                            size={20}
                                            color="#FF6B35"
                                        />
                                    </Pressable>
                                </View>
                                <Text className="text-surface-400 font-sans text-sm mb-6">
                                    Organize your recipes into custom folders
                                </Text>

                                {/* Create Input */}
                                {showCreate && (
                                    <Animated.View
                                        entering={FadeInDown.springify()}
                                        className="mb-4 bg-surface-800 rounded-2xl p-4 flex-row items-center"
                                    >
                                        <TextInput
                                            value={newName}
                                            onChangeText={setNewName}
                                            placeholder="New collection name..."
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

                                {loading ? (
                                    <View className="items-center py-10">
                                        <ActivityIndicator size="small" color="#FF6B35" />
                                    </View>
                                ) : collections.length === 0 ? (
                                    <View className="items-center py-10 px-4">
                                        <Ionicons name="folder-open-outline" size={48} color="#6E6E85" />
                                        <Text className="text-surface-300 font-sans text-center mt-4 mb-2 opacity-80">
                                            You haven't created any collections yet.
                                        </Text>
                                        <Text className="text-surface-500 font-sans text-xs text-center">
                                            Go to the Collections tab to create one.
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                                        {collections.map((collection) => {
                                            const isSelected = assignedCollectionIds.has(collection.id);
                                            return (
                                                <Pressable
                                                    key={collection.id}
                                                    onPress={() => toggleCollection(collection.id)}
                                                    className="flex-row items-center p-4 bg-surface-800/60 rounded-2xl mb-3"
                                                >
                                                    <View
                                                        className="w-10 h-10 rounded-full items-center justify-center mr-4"
                                                        style={{ backgroundColor: `${collection.color}20` }}
                                                    >
                                                        <Ionicons
                                                            name={collection.icon_name as any}
                                                            size={20}
                                                            color={collection.color}
                                                        />
                                                    </View>
                                                    <Text className="text-white font-sans-semibold text-base flex-1">
                                                        {collection.name}
                                                    </Text>

                                                    <View
                                                        className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected ? "bg-accent border-accent" : "border-surface-600"
                                                            }`}
                                                    >
                                                        {isSelected && (
                                                            <Ionicons name="checkmark" size={14} color="#FFF" />
                                                        )}
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </GlassContainer>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </View>
        </Modal>
    );
}

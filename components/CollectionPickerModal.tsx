import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TextInput,
    useWindowDimensions,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown, FadeInDown } from "react-native-reanimated";
import GlassContainer from "./GlassContainer";
import { useCollections } from "@/hooks/useCollections";
import { getDatabase } from "@/db/client";
import { useTheme } from "@/hooks/useTheme";

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
    const { height: windowHeight } = useWindowDimensions();
    const { collections, createCollection, addRecipeToCollection, removeRecipeFromCollection } = useCollections();
    const [loading, setLoading] = useState(true);
    const [assignedCollectionIds, setAssignedCollectionIds] = useState<Set<number>>(new Set());
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const { colors } = useTheme();

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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <View className="flex-1 justify-end">
                    {/* Backdrop — sits behind the sheet, tapping it closes the modal */}
                    <Pressable
                        onPress={onClose}
                        className="absolute inset-0 bg-black/60"
                    />

                    {/* Sheet — not nested inside the backdrop Pressable, so no touch conflict */}
                    <Animated.View 
                        style={{ height: "100%", maxHeight: windowHeight * 0.75 }}
                        className="w-full"
                        entering={SlideInDown.duration(300)}
                    >
                        <GlassContainer
                            style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
                            className="flex-1"
                        >
                            {/* flex column: header takes natural height, list takes the rest */}
                            <View className="flex-1 p-6 pb-12">

                                {/* Fixed header — natural height */}
                                <View>
                                    <View className="self-center w-10 h-1 bg-surface-600 rounded-full mb-5" />

                                    <View className="flex-row items-center justify-between mb-2 mt-2">
                                        <Text className="text-white font-sans-bold text-2xl">Add to Cookbook</Text>
                                        <Pressable
                                            onPress={() => setShowCreate(!showCreate)}
                                            className="w-10 h-10 rounded-full bg-surface-900 border border-surface-800 items-center justify-center"
                                        >
                                            <Ionicons name={showCreate ? "close" : "add"} size={20} color="#FF6B35" />
                                        </Pressable>
                                    </View>
                                    <Text className="text-surface-400 font-sans text-sm mb-6">
                                        Group your recipes into themed cookbooks
                                    </Text>

                                    {showCreate && (
                                        <Animated.View
                                            entering={FadeInDown.springify()}
                                            className="mb-6 bg-surface-900/60 border border-surface-800 p-4 rounded-2xl flex-row items-center"
                                        >
                                            <TextInput
                                                value={newName}
                                                onChangeText={setNewName}
                                                placeholder="New cookbook name..."
                                                placeholderTextColor={colors.placeholder}
                                                className="flex-1 text-white font-sans text-base mr-3"
                                                autoFocus
                                                onSubmitEditing={handleCreate}
                                            />
                                            <Pressable
                                                onPress={handleCreate}
                                                className="bg-accent px-5 py-2.5 rounded-xl"
                                            >
                                                <Text className="text-[#FFFFFF] font-sans-bold text-sm">Create</Text>
                                            </Pressable>
                                        </Animated.View>
                                    )}
                                </View>

                                {/* Scrollable list — flex:1 fills remaining height */}
                                {loading ? (
                                    <View className="flex-1 items-center justify-center">
                                        <ActivityIndicator size="small" color="#FF6B35" />
                                    </View>
                                ) : collections.length === 0 ? (
                                    <View className="flex-1 items-center justify-center px-4 py-8">
                                        <Ionicons name="folder-open-outline" size={48} color={colors.textFaint} />
                                        <Text className="text-white font-sans-bold text-center mt-4 mb-1 opacity-80">
                                            You haven't created any cookbooks yet.
                                        </Text>
                                        <Text className="text-surface-500 font-sans text-sm text-center">
                                            Go to the Hub tab to create one.
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
                                        {collections.map((collection) => {
                                            const isSelected = assignedCollectionIds.has(collection.id);
                                            return (
                                                <Pressable
                                                    key={collection.id}
                                                    onPress={() => toggleCollection(collection.id)}
                                                    className="flex-row items-center p-4 bg-surface-900/40 border border-surface-800/30 rounded-2xl mb-3 active:bg-accent/10"
                                                >
                                                    <View
                                                        style={{ backgroundColor: `${collection.color}20` }}
                                                        className="w-10 h-10 rounded-full items-center justify-center mr-4"
                                                    >
                                                        <Ionicons name={collection.icon_name as any} size={20} color={collection.color} />
                                                    </View>
                                                    <Text className="text-white font-sans-bold text-base flex-1">
                                                        {collection.name}
                                                    </Text>
                                                    <View
                                                        style={{
                                                            backgroundColor: isSelected ? "#FF6B35" : "transparent",
                                                            borderColor: isSelected ? "#FF6B35" : colors.textFaint
                                                        }}
                                                        className="w-6 h-6 rounded-full border items-center justify-center"
                                                    >
                                                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>
                        </GlassContainer>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

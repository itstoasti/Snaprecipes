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
    const { height: windowHeight } = useWindowDimensions();
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
            <View style={{ flex: 1 }}>
                {/* Backdrop — sits behind the sheet, tapping it closes the modal */}
                <Pressable
                    onPress={onClose}
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.6)" }]}
                />

                {/* Sheet — not nested inside the backdrop Pressable, so no touch conflict */}
                {/* explicit height (not maxHeight) so flex:1 children have a real size to work with */}
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: windowHeight * 0.75 }}>
                    <Animated.View style={{ flex: 1 }} entering={SlideInDown.springify().damping(22).stiffness(120)}>
                        <GlassContainer
                            style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1 }}
                        >
                            {/* flex column: header takes natural height, list takes the rest */}
                            <View style={{ flex: 1, padding: 24, paddingBottom: 48 }}>

                                {/* Fixed header — natural height */}
                                <View>
                                    <View style={{ alignSelf: "center", width: 40, height: 4, backgroundColor: "#6E6E85", borderRadius: 2, marginBottom: 20 }} />

                                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, marginTop: 8 }}>
                                        <Text className="text-white font-sans-bold text-xl">Save to Collection</Text>
                                        <Pressable
                                            onPress={() => setShowCreate(!showCreate)}
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#2A2A3A", alignItems: "center", justifyContent: "center" }}
                                        >
                                            <Ionicons name={showCreate ? "close" : "add"} size={20} color="#FF6B35" />
                                        </Pressable>
                                    </View>
                                    <Text className="text-surface-400 font-sans text-sm mb-5">
                                        Organize your recipes into custom folders
                                    </Text>

                                    {showCreate && (
                                        <Animated.View
                                            entering={FadeInDown.springify()}
                                            style={{ marginBottom: 16, backgroundColor: "#2A2A3A", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center" }}
                                        >
                                            <TextInput
                                                value={newName}
                                                onChangeText={setNewName}
                                                placeholder="New collection name..."
                                                placeholderTextColor="#6E6E85"
                                                style={{ flex: 1, color: "#FFF", fontSize: 16, marginRight: 12 }}
                                                autoFocus
                                                onSubmitEditing={handleCreate}
                                            />
                                            <Pressable
                                                onPress={handleCreate}
                                                style={{ backgroundColor: "#FF6B35", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                                            >
                                                <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 14 }}>Create</Text>
                                            </Pressable>
                                        </Animated.View>
                                    )}
                                </View>

                                {/* Scrollable list — flex:1 fills remaining height */}
                                {loading ? (
                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                        <ActivityIndicator size="small" color="#FF6B35" />
                                    </View>
                                ) : collections.length === 0 ? (
                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
                                        <Ionicons name="folder-open-outline" size={48} color="#6E6E85" />
                                        <Text className="text-surface-300 font-sans text-center mt-4 mb-2 opacity-80">
                                            You haven't created any collections yet.
                                        </Text>
                                        <Text className="text-surface-500 font-sans text-xs text-center">
                                            Go to the Collections tab to create one.
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
                                        {collections.map((collection) => {
                                            const isSelected = assignedCollectionIds.has(collection.id);
                                            return (
                                                <Pressable
                                                    key={collection.id}
                                                    onPress={() => toggleCollection(collection.id)}
                                                    style={({ pressed }) => [
                                                        {
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            padding: 16,
                                                            borderRadius: 16,
                                                            marginBottom: 12,
                                                            backgroundColor: pressed ? "rgba(255,107,53,0.15)" : "rgba(42,42,58,0.6)"
                                                        }
                                                    ]}
                                                >
                                                    <View
                                                        style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 16, backgroundColor: `${collection.color}20` }}
                                                    >
                                                        <Ionicons name={collection.icon_name as any} size={20} color={collection.color} />
                                                    </View>
                                                    <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600", flex: 1 }}>
                                                        {collection.name}
                                                    </Text>
                                                    <View
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 12,
                                                            borderWidth: 1,
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            backgroundColor: isSelected ? "#FF6B35" : "transparent",
                                                            borderColor: isSelected ? "#FF6B35" : "#6E6E85"
                                                        }}
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
            </View>
        </Modal>
    );
}

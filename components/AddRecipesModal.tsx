import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, Pressable, Modal, ActivityIndicator, ScrollView,
    StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions,
    Image, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { SlideInDown, FadeIn } from "react-native-reanimated";
import GlassContainer from "./GlassContainer";
import { getDatabase } from "@/db/client";
import { useCollections } from "@/hooks/useCollections";
import { useRecipes } from "@/hooks/useRecipes";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";

interface AddRecipesModalProps {
    visible: boolean;
    collectionId: number;
    onClose: () => void;
    onAddSuccess: () => void;
}

type Tab = "mine" | "community";

export default function AddRecipesModal({ visible, collectionId, onClose, onAddSuccess }: AddRecipesModalProps) {
    const { height: windowHeight } = useWindowDimensions();
    const { addRecipeToCollection } = useCollections();
    const { saveCommunityRecipe, searchCommunityRecipes } = useRecipes();

    const [tab, setTab] = useState<Tab>("mine");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // My Recipes state
    const [myRecipes, setMyRecipes] = useState<any[]>([]);
    const [selectedMyIds, setSelectedMyIds] = useState<Set<number>>(new Set());

    // Community state
    const [communityRecipes, setCommunityRecipes] = useState<any[]>([]);
    const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());

    // ── Load My Recipes ─────────────────────────────────────────
    const loadMyRecipes = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const db = await getDatabase();
            let results;
            if (query.trim()) {
                results = await db.getAllAsync<any>(
                    `SELECT r.* FROM recipes r
                     WHERE r.id NOT IN (SELECT recipe_id FROM recipe_collections WHERE collection_id = ?)
                     AND r.title LIKE ?
                     ORDER BY r.created_at DESC`,
                    [collectionId, `%${query.trim()}%`]
                );
            } else {
                results = await db.getAllAsync<any>(
                    `SELECT r.* FROM recipes r
                     WHERE r.id NOT IN (SELECT recipe_id FROM recipe_collections WHERE collection_id = ?)
                     ORDER BY r.created_at DESC`,
                    [collectionId]
                );
            }
            setMyRecipes(results);
        } catch (error) {
            console.error("Failed to load recipes:", error);
        } finally {
            setLoading(false);
        }
    }, [collectionId]);

    // ── Load Community Recipes ──────────────────────────────────
    const loadCommunityRecipes = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const results = await searchCommunityRecipes(query);
            setCommunityRecipes(results);
        } catch (error) {
            console.error("Failed to load community recipes:", error);
        } finally {
            setLoading(false);
        }
    }, [searchCommunityRecipes]);

    // ── Reset & load on open / tab switch ───────────────────────
    useEffect(() => {
        if (!visible) return;
        setSearchQuery("");
        setSelectedMyIds(new Set());
        setSelectedCommunityIds(new Set());
        if (tab === "mine") {
            loadMyRecipes("");
        } else {
            loadCommunityRecipes("");
        }
    }, [visible, tab]);

    // ── Search handler ──────────────────────────────────────────
    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (tab === "mine") {
            loadMyRecipes(text);
        } else {
            loadCommunityRecipes(text);
        }
    }, [tab, loadMyRecipes, loadCommunityRecipes]);

    // ── Selection toggles ───────────────────────────────────────
    const toggleMy = (id: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = new Set(selectedMyIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedMyIds(next);
    };

    const toggleCommunity = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = new Set(selectedCommunityIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedCommunityIds(next);
    };

    // ── Save handler ────────────────────────────────────────────
    const handleSave = async () => {
        const myCount = selectedMyIds.size;
        const communityCount = selectedCommunityIds.size;
        if (myCount === 0 && communityCount === 0) {
            onClose();
            return;
        }

        setSaving(true);
        try {
            // Add personal recipes directly
            for (const recipeId of selectedMyIds) {
                await addRecipeToCollection(recipeId, collectionId);
            }

            // Community recipes: import to local DB first, then add to collection
            for (const publicId of selectedCommunityIds) {
                const newId = await saveCommunityRecipe(publicId);
                if (newId) {
                    await addRecipeToCollection(newId, collectionId);
                }
            }

            onAddSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to add recipes:", error);
        } finally {
            setSaving(false);
        }
    };

    const totalSelected = selectedMyIds.size + selectedCommunityIds.size;

    // ── Render ──────────────────────────────────────────────────
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <View className="flex-1 justify-end">
                    <Pressable onPress={onClose} style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
                    <Animated.View 
                        style={{ height: "100%", maxHeight: windowHeight * 0.88 }}
                        className="w-full"
                        entering={SlideInDown.duration(300)}
                    >
                        <GlassContainer style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1 }}>
                            <View style={{ flex: 1, padding: 20, paddingBottom: 48 }}>
                                {/* Handle */}
                                <View style={{ alignSelf: "center", width: 40, height: 4, backgroundColor: "#6E6E85", borderRadius: 2, marginBottom: 16 }} />

                                {/* Header */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                    <Text className="text-white font-sans-bold text-xl">Add Recipes</Text>
                                    <Pressable
                                        onPress={onClose}
                                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#2A2A3A", alignItems: "center", justifyContent: "center" }}
                                    >
                                        <Ionicons name="close" size={20} color="#6E6E85" />
                                    </Pressable>
                                </View>

                                {/* Tabs */}
                                <View style={{ flexDirection: "row", backgroundColor: "#1C1C28", borderRadius: 16, padding: 4, marginBottom: 16 }}>
                                    {(["mine", "community"] as Tab[]).map((t) => (
                                        <Pressable
                                            key={t}
                                            onPress={() => setTab(t)}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: "center",
                                                borderRadius: 12,
                                                backgroundColor: tab === t ? "rgba(255, 107, 53, 0.12)" : "transparent",
                                                borderWidth: tab === t ? 1 : 0,
                                                borderColor: tab === t ? "rgba(255, 107, 53, 0.25)" : "transparent",
                                            }}
                                        >
                                            <Text style={{
                                                color: tab === t ? "#FF6B35" : "#6E6E85",
                                                fontWeight: "700",
                                                fontSize: 14,
                                                textTransform: "capitalize"
                                            }}>
                                                {t === "mine" ? "My Recipes" : "Community"}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                {/* Search */}
                                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A26", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                                    <Ionicons name="search" size={20} color="#6E6E85" style={{ marginRight: 12 }} />
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        placeholder={tab === "mine" ? "Search your recipes..." : "Search community recipes..."}
                                        placeholderTextColor="#6E6E85"
                                        style={{ flex: 1, color: "#FFF", fontSize: 16 }}
                                        autoCorrect={false}
                                    />
                                    {searchQuery.length > 0 && (
                                        <Pressable onPress={() => handleSearch("")}>
                                            <Ionicons name="close-circle" size={18} color="#6E6E85" />
                                        </Pressable>
                                    )}
                                </View>

                                {loading ? (
                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                        <ActivityIndicator size="small" color="#FF6B35" />
                                    </View>
                                ) : (
                                    <>
                                        {/* Scrollable list */}
                                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
                                            {tab === "mine" ? (
                                                myRecipes.length === 0 ? (
                                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                                                        <Text style={{ color: "#6E6E85", fontSize: 14, textAlign: "center" }}>
                                                            No recipes found.
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    myRecipes.map((recipe) => {
                                                        const isSelected = selectedMyIds.has(recipe.id);
                                                        return (
                                                            <Pressable
                                                                key={recipe.id}
                                                                onPress={() => toggleMy(recipe.id)}
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    padding: 12,
                                                                    borderRadius: 16,
                                                                    backgroundColor: isSelected ? "rgba(255, 107, 53, 0.08)" : "#1C1C28",
                                                                    marginBottom: 8,
                                                                    borderWidth: 1,
                                                                    borderColor: isSelected ? "rgba(255, 107, 53, 0.2)" : "rgba(255,255,255,0.02)",
                                                                }}
                                                            >
                                                                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#2A2A3E", overflow: "hidden", marginRight: 12 }}>
                                                                    {recipe.image_url ? (
                                                                        <Image source={{ uri: recipe.image_url }} style={{ flex: 1 }} />
                                                                    ) : (
                                                                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                                                            <Ionicons name="restaurant" size={18} color="#FF6B35" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={{ flex: 1, color: "#FFF", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                                                                    {recipe.title}
                                                                </Text>
                                                                <View style={{
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: 11,
                                                                    borderWidth: 1.5,
                                                                    borderColor: isSelected ? "#FF6B35" : "#6E6E85",
                                                                    backgroundColor: isSelected ? "#FF6B35" : "transparent",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    marginLeft: 12,
                                                                }}>
                                                                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                                                </View>
                                                            </Pressable>
                                                        );
                                                    })
                                                )
                                            ) : (
                                                communityRecipes.length === 0 ? (
                                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                                                        <Text style={{ color: "#6E6E85", fontSize: 14, textAlign: "center" }}>
                                                            No community recipes found.
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    communityRecipes.map((recipe) => {
                                                        const isSelected = selectedCommunityIds.has(recipe.id);
                                                        return (
                                                            <Pressable
                                                                key={recipe.id}
                                                                onPress={() => toggleCommunity(recipe.id)}
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    padding: 12,
                                                                    borderRadius: 16,
                                                                    backgroundColor: isSelected ? "rgba(255, 107, 53, 0.08)" : "#1C1C28",
                                                                    marginBottom: 8,
                                                                    borderWidth: 1,
                                                                    borderColor: isSelected ? "rgba(255, 107, 53, 0.2)" : "rgba(255,255,255,0.02)",
                                                                }}
                                                            >
                                                                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#2A2A3E", overflow: "hidden", marginRight: 12 }}>
                                                                    {recipe.image_url ? (
                                                                        <Image source={{ uri: recipe.image_url }} style={{ flex: 1 }} />
                                                                    ) : (
                                                                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                                                            <Ionicons name="restaurant" size={18} color="#FF6B35" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={{ flex: 1, color: "#FFF", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                                                                    {recipe.title}
                                                                </Text>
                                                                <View style={{
                                                                    width: 22,
                                                                    height: 22,
                                                                    borderRadius: 11,
                                                                    borderWidth: 1.5,
                                                                    borderColor: isSelected ? "#FF6B35" : "#6E6E85",
                                                                    backgroundColor: isSelected ? "#FF6B35" : "transparent",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    marginLeft: 12,
                                                                }}>
                                                                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                                                </View>
                                                            </Pressable>
                                                        );
                                                    })
                                                )
                                            )}
                                        </ScrollView>

                                        {/* Action Button */}
                                        <Pressable
                                            onPress={handleSave}
                                            disabled={saving || (selectedMyIds.size === 0 && selectedCommunityIds.size === 0)}
                                            style={{
                                                backgroundColor: (selectedMyIds.size > 0 || selectedCommunityIds.size > 0) ? "#FF6B35" : "#2A2A3E",
                                                paddingVertical: 16,
                                                borderRadius: 16,
                                                alignItems: "center",
                                                marginTop: 16,
                                            }}
                                        >
                                            {saving ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={{
                                                    color: totalSelected > 0 ? "#FFF" : "#6E6E85",
                                                    fontWeight: "700",
                                                    fontSize: 16,
                                                }}>
                                                    {totalSelected > 0
                                                        ? `Add ${totalSelected} Recipe${totalSelected > 1 ? "s" : ""}`
                                                        : "Select Recipes to Add"}
                                                </Text>
                                            )}
                                        </Pressable>
                                    </>
                                )}
                            </View>
                        </GlassContainer>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

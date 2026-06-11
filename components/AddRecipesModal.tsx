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
    const { saveCommunityRecipe } = useRecipes();

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
            let supabaseQuery = supabase
                .from("public_recipes")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (query.trim()) {
                supabaseQuery = supabaseQuery.ilike("title", `%${query.trim()}%`);
            }

            const { data, error } = await supabaseQuery;
            if (error) throw error;
            setCommunityRecipes(data || []);
        } catch (error) {
            console.error("Failed to load community recipes:", error);
        } finally {
            setLoading(false);
        }
    }, []);

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
    const currentRecipes = tab === "mine" ? myRecipes : communityRecipes;

    // ── Render ──────────────────────────────────────────────────
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                <Pressable onPress={onClose} style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: windowHeight * 0.88 }}
                >
                    <Animated.View style={{ flex: 1 }} entering={SlideInDown.duration(300)}>
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
                                        <Ionicons name="close" size={20} color="#FF6B35" />
                                    </Pressable>
                                </View>

                                {/* ── Tab Toggle ── */}
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
                                        onPress={() => setTab("mine")}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            alignItems: "center",
                                            backgroundColor: tab === "mine" ? "#FF6B35" : "transparent",
                                        }}
                                    >
                                        <Text style={{
                                            color: tab === "mine" ? "#FFF" : "#6E6E85",
                                            fontWeight: "700",
                                            fontSize: 14,
                                        }}>
                                            My Recipes
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => setTab("community")}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            alignItems: "center",
                                            backgroundColor: tab === "community" ? "#FF6B35" : "transparent",
                                        }}
                                    >
                                        <Text style={{
                                            color: tab === "community" ? "#FFF" : "#6E6E85",
                                            fontWeight: "700",
                                            fontSize: 14,
                                        }}>
                                            Community
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* ── Search Bar ── */}
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        backgroundColor: "#1A1A2E",
                                        borderRadius: 14,
                                        paddingHorizontal: 14,
                                        paddingVertical: Platform.OS === "ios" ? 12 : 4,
                                        marginBottom: 12,
                                    }}
                                >
                                    <Ionicons name="search" size={18} color="#6E6E85" style={{ marginRight: 8 }} />
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        placeholder={tab === "mine" ? "Search your recipes…" : "Search community recipes…"}
                                        placeholderTextColor="#6E6E85"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        style={{
                                            flex: 1,
                                            color: "#FFF",
                                            fontSize: 15,
                                        }}
                                    />
                                    {searchQuery.length > 0 && (
                                        <Pressable onPress={() => handleSearch("")}>
                                            <Ionicons name="close-circle" size={18} color="#6E6E85" />
                                        </Pressable>
                                    )}
                                </View>

                                {/* ── Recipe List ── */}
                                {loading ? (
                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                        <ActivityIndicator size="large" color="#FF6B35" />
                                    </View>
                                ) : currentRecipes.length === 0 ? (
                                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                        <Ionicons name={tab === "mine" ? "book-outline" : "globe-outline"} size={48} color="#6E6E85" />
                                        <Text className="text-surface-400 font-sans text-center mt-4" style={{ paddingHorizontal: 24 }}>
                                            {searchQuery.trim()
                                                ? "No recipes found matching your search."
                                                : tab === "mine"
                                                    ? "All your recipes are already in this cookbook!"
                                                    : "No community recipes available yet."}
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                            {currentRecipes.map((recipe) => {
                                                const id = tab === "mine" ? recipe.id : recipe.id;
                                                const isSelected = tab === "mine"
                                                    ? selectedMyIds.has(recipe.id)
                                                    : selectedCommunityIds.has(recipe.id);

                                                return (
                                                    <Pressable
                                                        key={`${tab}-${id}`}
                                                        onPress={() => tab === "mine" ? toggleMy(recipe.id) : toggleCommunity(recipe.id)}
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            padding: 12,
                                                            borderRadius: 16,
                                                            marginBottom: 8,
                                                            backgroundColor: isSelected ? "rgba(255,107,53,0.15)" : "rgba(42,42,58,0.6)",
                                                            borderWidth: isSelected ? 1 : 0,
                                                            borderColor: isSelected ? "rgba(255,107,53,0.3)" : "transparent",
                                                        }}
                                                    >
                                                        {/* Thumbnail */}
                                                        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#2A2A3A", overflow: "hidden", marginRight: 12 }}>
                                                            {recipe.image_url ? (
                                                                <Image source={{ uri: recipe.image_url }} style={{ width: "100%", height: "100%" }} />
                                                            ) : (
                                                                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                                                                    <Ionicons name="restaurant-outline" size={20} color="#6E6E85" />
                                                                </View>
                                                            )}
                                                        </View>

                                                        {/* Title + source badge */}
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
                                                                {recipe.title}
                                                            </Text>
                                                            {tab === "community" && recipe.source_domain && (
                                                                <Text style={{ color: "#6E6E85", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                                                                    {recipe.source_domain}
                                                                </Text>
                                                            )}
                                                        </View>

                                                        {/* Checkbox */}
                                                        <View style={{
                                                            width: 24, height: 24, borderRadius: 12,
                                                            borderWidth: 1,
                                                            alignItems: "center", justifyContent: "center",
                                                            backgroundColor: isSelected ? "#FF6B35" : "transparent",
                                                            borderColor: isSelected ? "#FF6B35" : "#6E6E85",
                                                            marginLeft: 12,
                                                        }}>
                                                            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                                        </View>
                                                    </Pressable>
                                                );
                                            })}
                                        </ScrollView>

                                        {/* ── Save Button ── */}
                                        <Pressable
                                            onPress={handleSave}
                                            disabled={saving}
                                            style={{
                                                backgroundColor: totalSelected > 0 ? "#FF6B35" : "#2A2A3A",
                                                padding: 16,
                                                borderRadius: 16,
                                                alignItems: "center",
                                                marginTop: 12,
                                            }}
                                        >
                                            {saving ? (
                                                <ActivityIndicator color="#FFF" />
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
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

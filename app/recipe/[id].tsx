import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar as RNStatusBar,
    Dimensions,
    Linking,
    Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, SlideInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import GlassContainer from "@/components/GlassContainer";
import CookMode from "@/components/CookMode";
import ServingScaler, { scaleQuantity } from "@/components/ServingScaler";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import CollectionPickerModal from "@/components/CollectionPickerModal";
import EditRecipeModal from "@/components/EditRecipeModal";
import { useCookMode } from "@/hooks/useCookMode";
import { useRecipes } from "@/hooks/useRecipes";
import type { Recipe, Ingredient, Step } from "@/db/schema";
import { getDatabase } from "@/db/client";
import StatusModal from "@/components/StatusModal";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useAppReview } from "@/hooks/useAppReview";
import ReviewPromptModal from "@/components/ReviewPromptModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function isVideoUrl(url: string | null): boolean {
    if (!url) return false;
    return url.includes("instagram.com/reel/") || url.includes("instagram.com/p/") || url.includes("tiktok.com");
}

export default function RecipeDetailScreen() {
    const { id, isNew, isCommunity } = useLocalSearchParams<{ id: string, isNew?: string, isCommunity?: string }>();
    const router = useRouter();
    const { getRecipeById, getCommunityRecipeById, saveCommunityRecipe, deleteRecipe, updateRecipe } = useRecipes();
    const { isPro } = useRevenueCat();
    const {
        isCookMode,
        checkedIngredients,
        checkedSteps,
        enterCookMode,
        exitCookMode,
        toggleIngredient,
        toggleStep,
        resetChecks,
    } = useCookMode();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [steps, setSteps] = useState<Step[]>([]);
    const [loading, setLoading] = useState(true);
    const [multiplier, setMultiplier] = useState(1);
    const [imageError, setImageError] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [inCollection, setInCollection] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState<{
        visible: boolean;
        type: "success" | "error" | "info";
        title: string;
        message: string;
    }>({ visible: false, type: "success", title: "", message: "" });
    const insets = useSafeAreaInsets();
    const { showPrePrompt, recordSuccessfulSave, handlePrePromptResponse } = useAppReview();

    const isVideo = recipe ? isVideoUrl(recipe.source_url) : false;
    const headerHeight = SCREEN_WIDTH * 0.9; // Slightly taller for better framing

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        
        let data;
        if (isCommunity === "true") {
            data = await getCommunityRecipeById(id);
            if (data?.recipe) {
                const db = await getDatabase();
                let savedRecipe: Recipe | null = null;
                if (data.recipe.source_url) {
                    savedRecipe = await db.getFirstAsync<Recipe>(
                        "SELECT id FROM recipes WHERE source_url = ?",
                        [data.recipe.source_url]
                    );
                } else {
                    savedRecipe = await db.getFirstAsync<Recipe>(
                        "SELECT id FROM recipes WHERE title = ?",
                        [data.recipe.title]
                    );
                }
                setIsSaved(!!savedRecipe);
            }
        } else {
            data = await getRecipeById(parseInt(id));
            
            // Check if it is in a collection
            const db = await getDatabase();
            const collectionCount = await db.getFirstAsync<{count: number}>(
                `SELECT COUNT(*) as count FROM recipe_collections WHERE recipe_id = ?`,
                [parseInt(id)]
            );
            setInCollection((collectionCount?.count || 0) > 0);
        }

        if (data) {
            setRecipe(data.recipe);
            setIngredients(data.ingredients);
            setSteps(data.steps);
        }
        setLoading(false);
    }, [id, isCommunity, getRecipeById, getCommunityRecipeById]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle the review prompt milestone check exactly once on mount
    useEffect(() => {
        if (isNew === "true") {
            recordSuccessfulSave();
        }
        // ESLint might complain about empty deps here, but it's intentional
        // so we don't spam the review counter on every screen re-render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = () => {
        if (!recipe) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!recipe) return;
        setShowDeleteModal(false);
        await deleteRecipe(recipe.id);
        router.back();
    };

    const handleStartCooking = async () => {
        if (!recipe) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        enterCookMode(recipe.id);
    };

    const handlePlayVideo = async () => {
        if (recipe?.source_url) {
            try {
                await Linking.openURL(recipe.source_url);
            } catch (error) {
                console.error("Failed to open URL:", error);
                Alert.alert("Error", "Failed to open the video link.");
            }
        }
    };

    const handleSaveEdit = async (
        updates: {
            title?: string;
            description?: string;
            servings?: number;
            prep_time?: string;
            cook_time?: string;
            image_url?: string;
        },
        newIngredients: { id?: number; text: string; quantity?: string; unit?: string; name: string }[],
        newSteps: { id?: number; text: string; step_number: number }[]
    ) => {
        if (!recipe) return;
        await updateRecipe(recipe.id, updates, newIngredients, newSteps);
        await loadData();
    };

    const handleSaveToLibrary = async () => {
        if (!id) return;
        if (isSaved) {
            setStatusModalConfig({
                visible: true,
                type: "info",
                title: "Already Saved",
                message: "This recipe is already in your library."
            });
            return;
        }
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        try {
            const newId = await saveCommunityRecipe(id);
            if (newId) {
                setIsSaved(true);
                setStatusModalConfig({
                    visible: true,
                    type: "success",
                    title: "Success",
                    message: "Recipe saved to your library!"
                });
            }
        } catch (error) {
            console.error("Failed to save community recipe:", error);
            setStatusModalConfig({
                visible: true,
                type: "error",
                title: "Error",
                message: "Failed to save recipe. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading || !recipe) {
        return (
            <View className="flex-1 bg-surface-950 items-center justify-center">
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    // Cook Mode Overlay
    if (isCookMode) {
        return (
            <CookMode
                recipeName={recipe.title}
                imageUrl={recipe.image_url}
                ingredients={ingredients}
                steps={steps}
                multiplier={multiplier}
                checkedIngredients={checkedIngredients}
                checkedSteps={checkedSteps}
                onToggleIngredient={toggleIngredient}
                onToggleStep={toggleStep}
                onExit={exitCookMode}
            />
        );
    }

    return (
        <View className="flex-1 bg-surface-950">
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                bounces
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Hero Image or Video */}
                <View style={{ width: SCREEN_WIDTH, height: headerHeight, backgroundColor: "#111" }}>
                    <Pressable onPress={handlePlayVideo} className="flex-1 w-full h-full bg-surface-800 items-center justify-center">
                        {/* Fallback emoji - Only show if no image_url OR if there's an error */}
                        {(!recipe.image_url || imageError) && (
                            <Text className="text-6xl absolute z-0 w-full text-center">🍽️</Text>
                        )}

                        {recipe.image_url && !imageError && (
                            <Image
                                source={{ uri: recipe.image_url }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                                onError={() => setImageError(true)}
                            />
                        )}
                    </Pressable>

                    {/* Gradient overlay */}
                    <View
                        className="absolute inset-0 justify-center items-center"
                        style={{
                            backgroundColor: "transparent",
                        }}
                    >
                        {/* Play Button Overlay for Videos */}
                        {isVideo && (
                            <Pressable
                                onPress={handlePlayVideo}
                                className="w-20 h-20 rounded-full bg-black/60 items-center justify-center"
                                style={{
                                    borderWidth: 2,
                                    borderColor: "rgba(255,255,255,0.8)"
                                }}
                            >
                                <Ionicons name="play" size={40} color="#FFF" style={{ marginLeft: 6 }} />
                            </Pressable>
                        )}
                        <View className="absolute bottom-0 left-0 right-0 h-32 bg-surface-950" style={{ opacity: 0.8 }} />
                    </View>

                    {/* Back button */}
                    <Pressable
                        onPress={() => router.back()}
                        className="absolute left-5 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                        style={{ top: Math.max(insets.top, 20) + 12 }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </Pressable>

                    {/* Action buttons */}
                    {isCommunity === "true" ? (
                        <Pressable
                            onPress={handleSaveToLibrary}
                            className="absolute right-4 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                            style={{ top: Math.max(insets.top, 20) + 12 }}
                        >
                            <Ionicons 
                                name={isSaved ? "bookmark" : "bookmark-outline"} 
                                size={20} 
                                color={isSaved ? "#FF6B35" : "#FFFFFF"} 
                            />
                        </Pressable>
                    ) : (
                        <>
                            {/* Add to Cookbook button */}
                            <Pressable
                                onPress={() => setShowCollectionModal(true)}
                                className="absolute right-[120px] w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                                style={{ top: Math.max(insets.top, 20) + 12 }}
                            >
                                <Ionicons name={inCollection ? "folder" : "folder-outline"} size={20} color={inCollection ? "#FF6B35" : "#FFFFFF"} />
                            </Pressable>

                            {/* Edit button */}
                            <Pressable
                                onPress={() => setShowEditModal(true)}
                                className="absolute right-[68px] w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                                style={{ top: Math.max(insets.top, 20) + 12 }}
                            >
                                <Ionicons name="pencil-outline" size={20} color="#FFFFFF" />
                            </Pressable>

                            {/* Delete button */}
                            <Pressable
                                onPress={handleDelete}
                                className="absolute right-4 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                                style={{ top: Math.max(insets.top, 20) + 12 }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                            </Pressable>
                        </>
                    )}
                </View>

                {/* Content — Solid Plate (high contrast) */}
                <View className="px-5 -mt-8">
                    {/* Title */}
                    <Animated.View entering={FadeIn.delay(100)}>
                        <Text className="text-white font-sans-bold text-2xl leading-tight mb-2">
                            {recipe.title}
                        </Text>
                    </Animated.View>

                    {/* Meta pills */}
                    <Animated.View entering={FadeIn.delay(200)} className="flex-row flex-wrap gap-2 mb-5">
                        {recipe.prep_time && (
                            <View className="flex-row items-center bg-surface-800 px-3 py-1.5 rounded-full">
                                <Ionicons name="time-outline" size={14} color="#9D9DB0" />
                                <Text className="text-surface-300 font-sans text-xs ml-1.5">
                                    Prep {recipe.prep_time}
                                </Text>
                            </View>
                        )}
                        {recipe.cook_time && (
                            <View className="flex-row items-center bg-surface-800 px-3 py-1.5 rounded-full">
                                <Ionicons name="flame-outline" size={14} color="#FF6B35" />
                                <Text className="text-surface-300 font-sans text-xs ml-1.5">
                                    Cook {recipe.cook_time}
                                </Text>
                            </View>
                        )}
                        {recipe.source_type && (
                            <View className="flex-row items-center bg-surface-800 px-3 py-1.5 rounded-full">
                                <Ionicons
                                    name={recipe.source_type === "camera" ? "camera-outline" : "link-outline"}
                                    size={14}
                                    color="#34D399"
                                />
                                <Text className="text-surface-300 font-sans text-xs ml-1.5">
                                    {recipe.source_type === "camera" ? "Scanned" : "Web"}
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Description */}
                    {recipe.description && (
                        <Animated.View entering={FadeIn.delay(250)}>
                            <Text className="text-surface-300 font-sans text-sm leading-5 mb-5">
                                {recipe.description}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Serving Scaler */}
                    <Animated.View entering={FadeInDown.delay(300)} className="mb-6">
                        <ServingScaler
                            originalServings={recipe.servings}
                            currentMultiplier={multiplier}
                            onMultiplierChange={setMultiplier}
                        />
                    </Animated.View>

                    {/* Nutrition Facts */}
                    {recipe.calories != null && (
                        <Animated.View entering={FadeInDown.delay(325)} className="mb-6">
                            <Text className="text-white font-sans-bold text-lg mb-3">Nutrition</Text>
                            <View className="bg-surface-900 rounded-2xl px-4 py-4">
                                <Text className="text-surface-500 font-sans text-xs mb-3">Per serving</Text>
                                <View className="flex-row justify-between">
                                    <View className="items-center flex-1">
                                        <Text className="text-white font-sans-bold text-lg">
                                            {Math.round((recipe.calories || 0) * multiplier)}
                                        </Text>
                                        <Text className="text-surface-400 font-sans text-xs mt-0.5">Calories</Text>
                                    </View>
                                    {recipe.protein != null && (
                                        <View className="items-center flex-1">
                                            <Text className="text-accent font-sans-bold text-lg">
                                                {Math.round((recipe.protein || 0) * multiplier)}g
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">Protein</Text>
                                        </View>
                                    )}
                                    {recipe.fat != null && (
                                        <View className="items-center flex-1">
                                            <Text className="text-yellow-400 font-sans-bold text-lg">
                                                {Math.round((recipe.fat || 0) * multiplier)}g
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">Fat</Text>
                                        </View>
                                    )}
                                    {recipe.carbs != null && (
                                        <View className="items-center flex-1">
                                            <Text className="text-blue-400 font-sans-bold text-lg">
                                                {Math.round((recipe.carbs || 0) * multiplier)}g
                                            </Text>
                                            <Text className="text-surface-400 font-sans text-xs mt-0.5">Carbs</Text>
                                        </View>
                                    )}
                                </View>

                            </View>
                        </Animated.View>
                    )}

                    {/* Ingredients */}
                    <Animated.View entering={FadeInDown.delay(350)} className="mb-6">
                        <Text className="text-white font-sans-bold text-lg mb-3">Ingredients</Text>
                        <View className="bg-surface-900 rounded-2xl px-4 py-1">
                            {(() => {
                                // Group ingredients by section, preserving order
                                const groups: { section: string | null; items: typeof ingredients }[] = [];
                                let currentSection: string | null | undefined = undefined;
                                for (const ing of ingredients) {
                                    if (groups.length === 0 || ing.section !== currentSection) {
                                        currentSection = ing.section;
                                        groups.push({ section: ing.section, items: [ing] });
                                    } else {
                                        groups[groups.length - 1].items.push(ing);
                                    }
                                }
                                let flatIndex = 0;
                                return groups.map((group, gi) => (
                                    <View key={`section-${gi}`}>
                                        {group.section ? (
                                            <Text className="text-accent font-sans-bold text-sm uppercase tracking-wider pt-4 pb-2">
                                                {group.section}
                                            </Text>
                                        ) : null}
                                        {group.items.map((ing, index) => {
                                            const scaledQty = scaleQuantity(ing.quantity, multiplier);
                                            const isLast = gi === groups.length - 1 && index === group.items.length - 1;
                                            flatIndex++;
                                            return (
                                                <View
                                                    key={ing.id}
                                                    className={`flex-row items-center py-3 ${!isLast ? "border-b border-surface-800" : ""}`}
                                                >
                                                    <View className="min-w-[90px] flex-shrink-0 flex-row items-center mr-3">
                                                        <Text className="text-accent font-sans-bold text-sm">
                                                            {scaledQty}
                                                        </Text>
                                                        {ing.unit ? (
                                                            <Text className="text-surface-300 font-sans text-sm ml-1">
                                                                {ing.unit}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    <Text className="text-white font-sans text-sm flex-1">
                                                        {ing.name}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ));
                            })()}
                        </View>
                    </Animated.View>

                    {/* Steps */}
                    <Animated.View entering={FadeInDown.delay(400)}>
                        <Text className="text-white font-sans-bold text-lg mb-3">Instructions</Text>
                        {steps.map((step) => (
                            <View key={step.id} className="flex-row mb-4">
                                <View className="w-8 h-8 rounded-full bg-accent/15 items-center justify-center mr-3 mt-0.5">
                                    <Text className="text-accent font-sans-bold text-sm">
                                        {step.step_number}
                                    </Text>
                                </View>
                                <Text className="text-surface-200 font-sans text-sm flex-1 leading-5">
                                    {step.text}
                                </Text>
                            </View>
                        ))}
                    </Animated.View>
                </View>
            </ScrollView>

            {/* Start Cooking Button */}
            <View className="absolute bottom-0 left-0 right-0">
                <LinearGradient
                    colors={["transparent", "rgba(10,10,15,0.8)", "rgba(10,10,15,1)"]}
                    className="pt-12 pb-8 px-5"
                >
                    <GlassContainer style={{ borderRadius: 20, overflow: "hidden" }}>
                        <Pressable
                            onPress={handleStartCooking}
                            className="flex-row items-center justify-center py-4"
                        >
                            <Ionicons name="restaurant" size={20} color="#FF6B35" />
                            <Text className="text-accent font-sans-bold text-base ml-2">
                                Start Cooking
                            </Text>
                        </Pressable>
                    </GlassContainer>
                </LinearGradient>
            </View>

            {/* Custom Delete Modal */}
            <DeleteConfirmationModal
                visible={showDeleteModal}
                recipeName={recipe.title}
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
            />

            {/* Collection Picker Modal */}
            <CollectionPickerModal
                visible={showCollectionModal}
                recipeId={recipe.id}
                onClose={() => setShowCollectionModal(false)}
            />

            {/* Edit Recipe Modal */}
            <EditRecipeModal
                visible={showEditModal}
                recipe={recipe}
                ingredients={ingredients}
                steps={steps}
                onSave={handleSaveEdit}
                onClose={() => setShowEditModal(false)}
            />

            {/* Smart Review Pre-Prompt Overlay */}
            <ReviewPromptModal
                visible={showPrePrompt}
                onRespond={handlePrePromptResponse}
            />

            <StatusModal
                visible={statusModalConfig.visible}
                type={statusModalConfig.type}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                buttonText={statusModalConfig.type === "success" ? "View Recipes" : "Got it"}
                onClose={() => {
                    setStatusModalConfig(prev => ({ ...prev, visible: false }));
                    if (statusModalConfig.type === "success") {
                        router.push("/(tabs)/recipes");
                    }
                }}
            />
        </View>
    );
}

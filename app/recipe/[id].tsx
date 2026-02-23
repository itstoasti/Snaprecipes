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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
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
import { useRevenueCat } from "@/hooks/useRevenueCat";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function isVideoUrl(url: string | null): boolean {
    if (!url) return false;
    return url.includes("instagram.com/reel/") || url.includes("instagram.com/p/") || url.includes("tiktok.com");
}

export default function RecipeDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getRecipeById, deleteRecipe, updateRecipe } = useRecipes();
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
    const insets = useSafeAreaInsets();

    const isVideo = recipe ? isVideoUrl(recipe.source_url) : false;
    const headerHeight = SCREEN_WIDTH * 0.9; // Slightly taller for better framing

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const data = await getRecipeById(parseInt(id));
        if (data) {
            setRecipe(data.recipe);
            setIngredients(data.ingredients);
            setSteps(data.steps);
        }
        setLoading(false);
    }, [id, getRecipeById]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

        if (!isPro) {
            router.push("/paywall");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        enterCookMode(recipe.id);
    };

    const handlePlayVideo = async () => {
        if (recipe?.source_url) {
            try {
                const canOpen = await Linking.canOpenURL(recipe.source_url);
                if (canOpen) {
                    await Linking.openURL(recipe.source_url);
                } else {
                    Alert.alert("Error", "Could not open video URL.");
                }
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
                    {recipe.image_url && !imageError ? (
                        <Image
                            source={{ uri: recipe.image_url }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={400}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View className="flex-1 bg-surface-800 items-center justify-center">
                            <Text className="text-6xl">🍽️</Text>
                        </View>
                    )}

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

                    {/* Add to Collection button */}
                    <Pressable
                        onPress={() => setShowCollectionModal(true)}
                        className="absolute right-[120px] w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                        style={{ top: Math.max(insets.top, 20) + 12 }}
                    >
                        <Ionicons name="folder-outline" size={20} color="#FFFFFF" />
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
                    <Animated.View entering={FadeInDown.delay(300).springify()} className="mb-6">
                        <ServingScaler
                            originalServings={recipe.servings}
                            currentMultiplier={multiplier}
                            onMultiplierChange={setMultiplier}
                        />
                    </Animated.View>

                    {/* Ingredients */}
                    <Animated.View entering={FadeInDown.delay(350).springify()} className="mb-6">
                        <Text className="text-white font-sans-bold text-lg mb-3">Ingredients</Text>
                        <View className="bg-surface-900 rounded-2xl px-4 py-1">
                            {ingredients.map((ing, index) => {
                                const scaledQty = scaleQuantity(ing.quantity, multiplier);
                                return (
                                    <View
                                        key={ing.id}
                                        className={`flex-row items-center py-3 ${index < ingredients.length - 1 ? "border-b border-surface-800" : ""
                                            }`}
                                    >
                                        <View className="w-24 flex-row items-center">
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
                    </Animated.View>

                    {/* Steps */}
                    <Animated.View entering={FadeInDown.delay(400).springify()}>
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
            <View className="absolute bottom-0 left-0 right-0 p-5 pb-8">
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
        </View>
    );
}

import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import GlassContainer from "./GlassContainer";
import type { Recipe, Ingredient, Step } from "@/db/schema";

interface EditableIngredient {
    id?: number;
    text: string;
    quantity: string;
    unit: string;
    name: string;
}

interface EditableStep {
    id?: number;
    text: string;
    step_number: number;
}

interface EditRecipeModalProps {
    visible: boolean;
    recipe: Recipe;
    ingredients: Ingredient[];
    steps: Step[];
    onSave: (
        updates: {
            title?: string;
            description?: string;
            servings?: number;
            prep_time?: string;
            cook_time?: string;
            image_url?: string;
        },
        ingredients: EditableIngredient[],
        steps: EditableStep[]
    ) => Promise<void>;
    onClose: () => void;
}

export default function EditRecipeModal({
    visible,
    recipe,
    ingredients: initialIngredients,
    steps: initialSteps,
    onSave,
    onClose,
}: EditRecipeModalProps) {
    const [title, setTitle] = useState(recipe.title);
    const [description, setDescription] = useState(recipe.description || "");
    const [servings, setServings] = useState(recipe.servings.toString());
    const [prepTime, setPrepTime] = useState(recipe.prep_time || "");
    const [cookTime, setCookTime] = useState(recipe.cook_time || "");
    const [imageUrl, setImageUrl] = useState(recipe.image_url || "");
    const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
    const [steps, setSteps] = useState<EditableStep[]>([]);
    const [saving, setSaving] = useState(false);

    // Reset form when modal opens with new recipe
    useEffect(() => {
        if (visible) {
            setTitle(recipe.title);
            setDescription(recipe.description || "");
            setServings(recipe.servings.toString());
            setPrepTime(recipe.prep_time || "");
            setCookTime(recipe.cook_time || "");
            setImageUrl(recipe.image_url || "");
            setIngredients(
                initialIngredients.map((ing) => ({
                    id: ing.id,
                    text: ing.text,
                    quantity: ing.quantity || "",
                    unit: ing.unit || "",
                    name: ing.name,
                }))
            );
            setSteps(
                initialSteps.map((step) => ({
                    id: step.id,
                    text: step.text,
                    step_number: step.step_number,
                }))
            );
        }
    }, [visible, recipe, initialIngredients, initialSteps]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImageUrl(result.assets[0].uri);
        }
    };

    const updateIngredient = (index: number, field: keyof EditableIngredient, value: string) => {
        const updated = [...ingredients];
        updated[index] = { ...updated[index], [field]: value };
        // Update text to reflect the full ingredient
        if (field !== "text") {
            const ing = updated[index];
            updated[index].text = `${ing.quantity} ${ing.unit} ${ing.name}`.trim();
        }
        setIngredients(updated);
    };

    const addIngredient = () => {
        setIngredients([
            ...ingredients,
            { text: "", quantity: "", unit: "", name: "" },
        ]);
    };

    const removeIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const updateStep = (index: number, text: string) => {
        const updated = [...steps];
        updated[index] = { ...updated[index], text };
        setSteps(updated);
    };

    const addStep = () => {
        setSteps([
            ...steps,
            { text: "", step_number: steps.length + 1 },
        ]);
    };

    const removeStep = (index: number) => {
        const updated = steps.filter((_, i) => i !== index);
        // Renumber steps
        setSteps(updated.map((step, i) => ({ ...step, step_number: i + 1 })));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Error", "Recipe title is required");
            return;
        }

        // Filter out empty ingredients
        const validIngredients = ingredients.filter((ing) => ing.name.trim());
        if (validIngredients.length === 0) {
            Alert.alert("Error", "At least one ingredient is required");
            return;
        }

        // Filter out empty steps
        const validSteps = steps.filter((step) => step.text.trim());
        if (validSteps.length === 0) {
            Alert.alert("Error", "At least one step is required");
            return;
        }

        setSaving(true);
        try {
            await onSave(
                {
                    title: title.trim(),
                    description: description.trim(),
                    servings: parseInt(servings) || recipe.servings,
                    prep_time: prepTime.trim(),
                    cook_time: cookTime.trim(),
                    image_url: imageUrl,
                },
                validIngredients,
                validSteps.map((step, i) => ({ ...step, step_number: i + 1 }))
            );
            onClose();
        } catch (error) {
            console.error("Failed to save recipe:", error);
            Alert.alert("Error", "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (!visible) return null;

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
                <View className="flex-1">
                    <Pressable
                        onPress={onClose}
                        className="flex-1 bg-black/60 justify-end"
                    >
                        <Pressable onPress={(e) => e.stopPropagation()}>
                            <Animated.View entering={SlideInDown.springify().damping(22).stiffness(120)}>
                                <GlassContainer
                                    style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "90%" }}
                                    className="pb-8"
                                >
                                    {/* Handle */}
                                    <View className="self-center w-10 h-1 bg-surface-500 rounded-full mt-3 mb-4" />

                                    {/* Header */}
                                    <View className="flex-row items-center justify-between px-6 mb-4">
                                        <Text className="text-white font-sans-bold text-xl">Edit Recipe</Text>
                                        <Pressable
                                            onPress={onClose}
                                            className="w-8 h-8 rounded-full bg-surface-800 items-center justify-center"
                                        >
                                            <Ionicons name="close" size={20} color="#9D9DB0" />
                                        </Pressable>
                                    </View>

                                    <ScrollView
                                        className="px-6"
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {/* Image Section */}
                                        <Pressable onPress={handlePickImage} className="mb-5">
                                            <View className="h-40 bg-surface-800 rounded-2xl overflow-hidden items-center justify-center">
                                                {imageUrl ? (
                                                    <Image
                                                        source={{ uri: imageUrl }}
                                                        style={{ width: "100%", height: "100%" }}
                                                        contentFit="cover"
                                                    />
                                                ) : (
                                                    <View className="items-center">
                                                        <Ionicons name="image-outline" size={40} color="#6E6E85" />
                                                        <Text className="text-surface-400 font-sans text-sm mt-2">
                                                            Tap to add photo
                                                        </Text>
                                                    </View>
                                                )}
                                                <View className="absolute bottom-2 right-2 bg-black/60 rounded-full p-2">
                                                    <Ionicons name="camera" size={16} color="#FFF" />
                                                </View>
                                            </View>
                                        </Pressable>

                                        {/* Title */}
                                        <View className="mb-4">
                                            <Text className="text-surface-300 font-sans text-sm mb-2">Title</Text>
                                            <TextInput
                                                value={title}
                                                onChangeText={setTitle}
                                                placeholder="Recipe name"
                                                placeholderTextColor="#6E6E85"
                                                className="bg-surface-800 rounded-xl px-4 py-3 text-white font-sans text-base"
                                            />
                                        </View>

                                        {/* Description */}
                                        <View className="mb-4">
                                            <Text className="text-surface-300 font-sans text-sm mb-2">Description</Text>
                                            <TextInput
                                                value={description}
                                                onChangeText={setDescription}
                                                placeholder="Brief description"
                                                placeholderTextColor="#6E6E85"
                                                multiline
                                                numberOfLines={3}
                                                className="bg-surface-800 rounded-xl px-4 py-3 text-white font-sans text-base"
                                                style={{ minHeight: 80, textAlignVertical: "top" }}
                                            />
                                        </View>

                                        {/* Servings, Prep Time, Cook Time */}
                                        <View className="flex-row gap-3 mb-5">
                                            <View className="flex-1">
                                                <Text className="text-surface-300 font-sans text-sm mb-2">Servings</Text>
                                                <TextInput
                                                    value={servings}
                                                    onChangeText={setServings}
                                                    placeholder="4"
                                                    placeholderTextColor="#6E6E85"
                                                    keyboardType="number-pad"
                                                    className="bg-surface-800 rounded-xl px-4 py-3 text-white font-sans text-base"
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-surface-300 font-sans text-sm mb-2">Prep Time</Text>
                                                <TextInput
                                                    value={prepTime}
                                                    onChangeText={setPrepTime}
                                                    placeholder="15 min"
                                                    placeholderTextColor="#6E6E85"
                                                    className="bg-surface-800 rounded-xl px-4 py-3 text-white font-sans text-base"
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-surface-300 font-sans text-sm mb-2">Cook Time</Text>
                                                <TextInput
                                                    value={cookTime}
                                                    onChangeText={setCookTime}
                                                    placeholder="30 min"
                                                    placeholderTextColor="#6E6E85"
                                                    className="bg-surface-800 rounded-xl px-4 py-3 text-white font-sans text-base"
                                                />
                                            </View>
                                        </View>

                                        {/* Ingredients Section */}
                                        <View className="mb-5">
                                            <View className="flex-row items-center justify-between mb-3">
                                                <Text className="text-white font-sans-bold text-lg">Ingredients</Text>
                                                <Pressable
                                                    onPress={addIngredient}
                                                    className="flex-row items-center bg-accent/20 px-3 py-1.5 rounded-full"
                                                >
                                                    <Ionicons name="add" size={16} color="#FF6B35" />
                                                    <Text className="text-accent font-sans-semibold text-sm ml-1">Add</Text>
                                                </Pressable>
                                            </View>

                                            {ingredients.map((ing, index) => (
                                                <View key={index} className="flex-row items-center gap-2 mb-2">
                                                    <TextInput
                                                        value={ing.quantity}
                                                        onChangeText={(v) => updateIngredient(index, "quantity", v)}
                                                        placeholder="1"
                                                        placeholderTextColor="#6E6E85"
                                                        className="w-14 bg-surface-800 rounded-lg px-3 py-2.5 text-white font-sans text-sm text-center"
                                                    />
                                                    <TextInput
                                                        value={ing.unit}
                                                        onChangeText={(v) => updateIngredient(index, "unit", v)}
                                                        placeholder="cup"
                                                        placeholderTextColor="#6E6E85"
                                                        className="w-16 bg-surface-800 rounded-lg px-3 py-2.5 text-white font-sans text-sm"
                                                    />
                                                    <TextInput
                                                        value={ing.name}
                                                        onChangeText={(v) => updateIngredient(index, "name", v)}
                                                        placeholder="Ingredient name"
                                                        placeholderTextColor="#6E6E85"
                                                        className="flex-1 bg-surface-800 rounded-lg px-3 py-2.5 text-white font-sans text-sm"
                                                    />
                                                    <Pressable
                                                        onPress={() => removeIngredient(index)}
                                                        className="w-8 h-8 items-center justify-center"
                                                    >
                                                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Steps Section */}
                                        <View className="mb-8">
                                            <View className="flex-row items-center justify-between mb-3">
                                                <Text className="text-white font-sans-bold text-lg">Instructions</Text>
                                                <Pressable
                                                    onPress={addStep}
                                                    className="flex-row items-center bg-accent/20 px-3 py-1.5 rounded-full"
                                                >
                                                    <Ionicons name="add" size={16} color="#FF6B35" />
                                                    <Text className="text-accent font-sans-semibold text-sm ml-1">Add</Text>
                                                </Pressable>
                                            </View>

                                            {steps.map((step, index) => (
                                                <View key={index} className="flex-row items-start gap-2 mb-3">
                                                    <View className="w-8 h-8 rounded-full bg-accent/15 items-center justify-center mt-1">
                                                        <Text className="text-accent font-sans-bold text-sm">
                                                            {index + 1}
                                                        </Text>
                                                    </View>
                                                    <TextInput
                                                        value={step.text}
                                                        onChangeText={(v) => updateStep(index, v)}
                                                        placeholder="Describe this step..."
                                                        placeholderTextColor="#6E6E85"
                                                        multiline
                                                        className="flex-1 bg-surface-800 rounded-lg px-3 py-2.5 text-white font-sans text-sm"
                                                        style={{ minHeight: 60, textAlignVertical: "top" }}
                                                    />
                                                    <Pressable
                                                        onPress={() => removeStep(index)}
                                                        className="w-8 h-8 items-center justify-center mt-1"
                                                    >
                                                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Action Buttons */}
                                        <View className="flex-row gap-3 mb-6">
                                            <Pressable
                                                onPress={onClose}
                                                className="flex-1 py-4 bg-surface-800 rounded-xl items-center"
                                                disabled={saving}
                                            >
                                                <Text className="text-white font-sans-semibold text-base">Cancel</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={handleSave}
                                                className="flex-1 py-4 bg-accent rounded-xl items-center flex-row justify-center"
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="checkmark" size={20} color="#FFF" />
                                                        <Text className="text-white font-sans-semibold text-base ml-2">
                                                            Save Changes
                                                        </Text>
                                                    </>
                                                )}
                                            </Pressable>
                                        </View>
                                    </ScrollView>
                                </GlassContainer>
                            </Animated.View>
                        </Pressable>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

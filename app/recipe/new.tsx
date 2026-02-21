import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar as RNStatusBar,
    KeyboardAvoidingView,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { useRecipes } from "@/hooks/useRecipes";
import GlassContainer from "@/components/GlassContainer";
import type { ExtractedRecipe } from "@/db/schema";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

function FormInput({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    keyboardType = "default",
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    multiline?: boolean;
    keyboardType?: "default" | "numeric";
}) {
    return (
        <View className="mb-5">
            <Text className="text-surface-400 font-sans-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                {label}
            </Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#6E6E85"
                multiline={multiline}
                keyboardType={keyboardType}
                className={`bg-surface-900 text-white font-sans p-4 rounded-2xl ${multiline ? "h-32 pt-4" : ""
                    }`}
                style={multiline ? { textAlignVertical: "top" } : undefined}
            />
        </View>
    );
}

export default function NewRecipeScreen() {
    const router = useRouter();
    const { insertRecipe } = useRecipes();
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [prepTime, setPrepTime] = useState("");
    const [cookTime, setCookTime] = useState("");
    const [servings, setServings] = useState("4");
    const [ingredientsText, setIngredientsText] = useState("");
    const [stepsText, setStepsText] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission to access camera roll is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Error", "Please provide at least a recipe title.");
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Parse ingredients (newline separated)
            const parsedIngredients = ingredientsText
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((text) => ({ text, name: text, quantity: undefined, unit: undefined }));

            // Parse steps (newline separated)
            const parsedSteps = stepsText
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((text, index) => ({ text, stepNumber: index + 1 }));

            const recipeData: ExtractedRecipe = {
                title: title.trim(),
                description: description.trim() || undefined,
                prepTime: prepTime.trim() || undefined,
                cookTime: cookTime.trim() || undefined,
                servings: parseInt(servings) || 4,
                ingredients: parsedIngredients,
                steps: parsedSteps,
                imageUrl: imageUri || undefined,
            };

            const recipeId = await insertRecipe(recipeData, undefined, "manual");

            router.replace(`/recipe/${recipeId}`);
        } catch (error: any) {
            Alert.alert("Save Failed", "Could not save the manual recipe.");
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-surface-950"
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View
                className="flex-row items-center justify-between px-5 pb-4 border-b border-surface-800 bg-surface-950 z-10"
                style={{ paddingTop: Platform.OS === "ios" ? 60 : (RNStatusBar.currentHeight || 0) + 10 }}
            >
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-surface-800 items-center justify-center"
                >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
                <Text className="text-white font-sans-bold text-lg">Add Recipe</Text>
                <View className="w-10 h-10" />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            >
                <Animated.View entering={FadeIn.delay(100)}>
                    {/* Image Picker */}
                    <View className="mb-5 items-center">
                        <Pressable
                            onPress={handlePickImage}
                            className={`w-full h-48 rounded-3xl overflow-hidden justify-center items-center border-2 border-dashed ${imageUri ? "border-transparent" : "border-surface-600 bg-surface-900"
                                }`}
                        >
                            {imageUri ? (
                                <Image
                                    source={{ uri: imageUri }}
                                    style={{ width: "100%", height: "100%" }}
                                    contentFit="cover"
                                />
                            ) : (
                                <View className="items-center">
                                    <Ionicons name="camera" size={32} color="#6E6E85" />
                                    <Text className="text-surface-400 font-sans-medium mt-2">
                                        Add Recipe Photo
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                        {imageUri && (
                            <Pressable
                                onPress={() => setImageUri(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 items-center justify-center"
                            >
                                <Ionicons name="close" size={16} color="#FFF" />
                            </Pressable>
                        )}
                    </View>

                    <FormInput
                        label="Recipe Title"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Grandma's Chocolate Chip Cookies"
                    />

                    <FormInput
                        label="Description (Optional)"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="A short description of this recipe..."
                        multiline
                    />

                    <View className="flex-row justify-between mb-5">
                        <View className="flex-1 mr-2">
                            <FormInput
                                label="Prep Time"
                                value={prepTime}
                                onChangeText={setPrepTime}
                                placeholder="15 mins"
                            />
                        </View>
                        <View className="flex-1 mx-2">
                            <FormInput
                                label="Cook Time"
                                value={cookTime}
                                onChangeText={setCookTime}
                                placeholder="1 hr"
                            />
                        </View>
                        <View className="flex-1 ml-2">
                            <FormInput
                                label="Servings"
                                value={servings}
                                onChangeText={setServings}
                                placeholder="4"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(200)}>
                    <View className="mb-5">
                        <Text className="text-surface-400 font-sans-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                            Ingredients
                        </Text>
                        <Text className="text-surface-500 font-sans text-xs mb-3 ml-1">
                            Place each ingredient on a new line.
                        </Text>
                        <TextInput
                            value={ingredientsText}
                            onChangeText={setIngredientsText}
                            placeholder="1 cup all-purpose flour&#10;1/2 cup sugar&#10;2 eggs"
                            placeholderTextColor="#6E6E85"
                            multiline
                            className="bg-surface-900 text-white font-sans p-4 rounded-2xl h-40 pt-4"
                            style={{ textAlignVertical: "top" }}
                        />
                    </View>

                    <View className="mb-5">
                        <Text className="text-surface-400 font-sans-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                            Instructions
                        </Text>
                        <Text className="text-surface-500 font-sans text-xs mb-3 ml-1">
                            Place each step on a new line.
                        </Text>
                        <TextInput
                            value={stepsText}
                            onChangeText={setStepsText}
                            placeholder="Mix the flour and sugar.&#10;Add the eggs and stir.&#10;Bake at 350°F for 15 minutes."
                            placeholderTextColor="#6E6E85"
                            multiline
                            className="bg-surface-900 text-white font-sans p-4 rounded-2xl h-40 pt-4"
                            style={{ textAlignVertical: "top" }}
                        />
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Save Button */}
            <View className="absolute bottom-0 left-0 right-0 p-5 pb-8">
                <GlassContainer style={{ borderRadius: 20, overflow: "hidden" }}>
                    <Pressable
                        onPress={handleSave}
                        disabled={loading}
                        className="flex-row items-center justify-center py-4"
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FF6B35" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={20} color="#FF6B35" />
                                <Text className="text-accent font-sans-bold text-base ml-2">
                                    Save Recipe
                                </Text>
                            </>
                        )}
                    </Pressable>
                </GlassContainer>
            </View>
        </KeyboardAvoidingView>
    );
}

import React from "react";
import { FlatList, View, Text, RefreshControl } from "react-native";
import RecipeCard from "./RecipeCard";
import type { Recipe } from "@/db/schema";

interface RecipeFeedProps {
    recipes: Recipe[];
    loading: boolean;
    onRefresh: () => void;
    emptyTitle?: string;
    emptyMessage?: string;
}

export default function RecipeFeed({ recipes, loading, onRefresh, emptyTitle, emptyMessage }: RecipeFeedProps) {
    if (!loading && recipes.length === 0) {
        return (
            <View className="flex-1 items-center justify-center px-8">
                <Text className="text-5xl mb-4">{emptyTitle ? "📂" : "📖"}</Text>
                <Text className="text-white font-sans-bold text-xl text-center mb-2">
                    {emptyTitle || "No Recipes Yet"}
                </Text>
                <Text className="text-surface-400 font-sans text-center text-sm leading-5">
                    {emptyMessage || "Tap the + button to import your first recipe from a URL or snap a photo of one!"}
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={recipes}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={{ padding: 6, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={loading}
                    onRefresh={onRefresh}
                    tintColor="#FF6B35"
                    colors={["#FF6B35"]}
                />
            }
            renderItem={({ item, index }) => (
                <RecipeCard
                    id={item.id}
                    title={item.title}
                    imageUrl={item.image_url}
                    prepTime={item.prep_time}
                    cookTime={item.cook_time}
                    sourceType={item.source_type}
                    index={index}
                />
            )}
        />
    );
}

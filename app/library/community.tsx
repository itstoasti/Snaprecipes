import React, { useState, useEffect, useCallback } from "react";
import { 
    View, Text, FlatList, Pressable, Image, ActivityIndicator, 
    TextInput, Dimensions, RefreshControl 
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PublicRecipe {
    id: string;
    title: string;
    description: string;
    image_url: string;
    servings: number;
    prep_time: string;
    cook_time: string;
    save_count: number;
    source_domain: string;
}

export default function CommunityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchCommunityRecipes = useCallback(async (query?: string) => {
        try {
            let supabaseQuery = supabase
                .from("public_recipes")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (query) {
                supabaseQuery = supabaseQuery.ilike("title", `%${query}%`);
            }

            const { data, error } = await supabaseQuery;
            if (error) throw error;
            setRecipes(data || []);
        } catch (error) {
            console.error("Failed to fetch community recipes:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCommunityRecipes();
    }, [fetchCommunityRecipes]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCommunityRecipes(searchQuery);
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        // We could debounce this, but for now simple fetch on submit or clear
    };

    const submitSearch = () => {
        setLoading(true);
        fetchCommunityRecipes(searchQuery);
    };

    const renderRecipe = ({ item, index }: { item: PublicRecipe, index: number }) => {
        const itemWidth = (SCREEN_WIDTH - 48) / 2;

        return (
            <Animated.View 
                entering={FadeInDown.delay(index * 50)}
                style={{ width: itemWidth }}
                className="mb-4"
            >
                <Pressable 
                    onPress={() => router.push({
                        pathname: "/recipe/[id]",
                        params: { id: item.id, isCommunity: "true" }
                    })}
                >
                    <GlassContainer className="rounded-3xl overflow-hidden bg-surface-900 border-surface-800">
                        <View style={{ height: itemWidth * 1.1 }}>
                            {item.image_url ? (
                                <Image 
                                    source={{ uri: item.image_url }} 
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="flex-1 items-center justify-center bg-surface-800">
                                    <Ionicons name="restaurant-outline" size={32} color="#4A4A5E" />
                                </View>
                            )}
                            
                            {/* Save Count Badge */}
                            <View className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                                <Ionicons name="heart" size={10} color="#F472B6" />
                                <Text className="text-[#FFFFFF] font-sans-bold text-[9px] ml-1">{item.save_count}</Text>
                            </View>
                        </View>
                        
                        <View className="p-3">
                            <Text className="text-white font-sans-bold text-sm" numberOfLines={2}>
                                {item.title}
                            </Text>
                            <Text className="text-surface-500 font-sans text-[10px] mt-1" numberOfLines={1}>
                                {item.source_domain || "Shared Recipe"}
                            </Text>
                        </View>
                    </GlassContainer>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: insets.top }}>
            <Stack.Screen options={{ 
                headerShown: false,
                title: "Community"
            }} />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4">
                <View className="flex-row items-center">
                    <Pressable 
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-surface-900 items-center justify-center mr-3"
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </Pressable>
                    <View>
                        <Text className="text-white font-sans-bold text-2xl">Community</Text>
                        <Text className="text-surface-500 font-sans text-xs">Shared by the SnapRecipes world</Text>
                    </View>
                </View>
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-4">
                <View className="flex-row items-center bg-surface-900 px-4 py-3 rounded-2xl border border-surface-800">
                    <Ionicons name="search" size={20} color={colors.textFaint} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={handleSearch}
                        onSubmitEditing={submitSearch}
                        placeholder="Search community recipes..."
                        placeholderTextColor={colors.placeholder}
                        className="flex-1 ml-3 text-white font-sans"
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => { setSearchQuery(""); fetchCommunityRecipes(""); }}>
                            <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                        </Pressable>
                    )}
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF6B35" />
                    <Text className="text-surface-500 font-sans text-sm mt-4">Discovering recipes...</Text>
                </View>
            ) : (
                <FlatList
                    data={recipes}
                    renderItem={renderRecipe}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={handleRefresh} 
                            tintColor="#FF6B35"
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-20 px-10">
                            <Ionicons name="search-outline" size={64} color="#2A2A3E" />
                            <Text className="text-white font-sans-bold text-lg mt-4 text-center">
                                No recipes found
                            </Text>
                            <Text className="text-surface-500 font-sans text-center mt-2">
                                Try a different search term or check back later!
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

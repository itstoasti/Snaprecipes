import React, { useState, useMemo, useRef } from "react";
import { View, Text, Pressable, FlatList, TextInput, ScrollView, Alert, Modal, Image } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import GlassContainer from "@/components/GlassContainer";
import Animated, { FadeInRight, FadeInDown, FadeIn, Layout, SlideInUp } from "react-native-reanimated";
import { format, addDays, startOfToday } from "@/lib/dateUtils";

export default function ShoppingListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const { 
        items, 
        loading, 
        addItem, 
        toggleItem, 
        deleteItem, 
        clearChecked, 
        generateFromMealPlan, 
        addItemsFromRecipe 
    } = useShoppingList();
    const { recipes } = useRecipes();

    const [newItemName, setNewItemName] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [isManualEntryStarted, setIsManualEntryStarted] = useState(false);
    const [isRecipePickerVisible, setIsRecipePickerVisible] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState("");

    const filteredRecipes = useMemo(() => {
        if (!recipeSearch.trim()) return recipes;
        return recipes.filter(r => 
            r.title.toLowerCase().includes(recipeSearch.toLowerCase())
        );
    }, [recipes, recipeSearch]);

    const { uncheckedGroups, checkedItems } = useMemo(() => {
        const unchecked: Record<string, typeof items> = {};
        const checked: typeof items = [];
        
        items.forEach(item => {
            if (item.is_checked) {
                checked.push(item);
            } else {
                const cat = item.category || "General";
                if (!unchecked[cat]) unchecked[cat] = [];
                unchecked[cat].push(item);
            }
        });
        
        return { uncheckedGroups: unchecked, checkedItems: checked };
    }, [items]);

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;
        await addItem(newItemName.trim());
        setNewItemName("");
    };

    const handleGenerateItems = () => {
        setIsConfirmModalVisible(true);
    };

    const confirmGenerate = async () => {
        setIsConfirmModalVisible(false);
        setIsGenerating(true);
        const start = format(startOfToday(), "yyyy-MM-dd");
        const end = format(addDays(new Date(), 7), "yyyy-MM-dd");
        await generateFromMealPlan(start, end);
        setIsGenerating(false);
    };

    const handleSelectRecipe = async (recipeId: number) => {
        setIsRecipePickerVisible(false);
        setIsManualEntryStarted(true); // Ensure items are shown if they were empty
        await addItemsFromRecipe(recipeId);
    };

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View className="px-5 flex-row items-center justify-between mb-8">
                <View className="flex-row items-center">
                    <Pressable 
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-surface-900 border border-surface-800 items-center justify-center mr-4"
                    >
                        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </Pressable>
                    <View>
                        <Text className="text-white font-sans-bold text-3xl">Shopping List</Text>
                        <Text className="text-surface-500 font-sans text-xs uppercase tracking-widest mt-0.5">Your Grocery List</Text>
                    </View>
                </View>

                {items.length > 0 && (
                    <View className="flex-row">
                        <Pressable 
                            onPress={handleGenerateItems}
                            className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mr-2"
                            disabled={isGenerating}
                        >
                            <Ionicons name="sparkles" size={18} color="#34D399" />
                        </Pressable>
                        <Pressable 
                            onPress={clearChecked}
                            className="w-10 h-10 rounded-full bg-surface-900 border border-surface-800 items-center justify-center"
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF6B35" />
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Quick Add Bar - Shown when items exist or manual entry started */}
            {(items.length > 0 || isManualEntryStarted) && (
                <View className="px-5 mb-8">
                    <Animated.View entering={FadeInDown.duration(400)} layout={Layout.duration(300)}>
                        <GlassContainer className="flex-row items-center p-2 rounded-[24px] border border-surface-800/50 bg-surface-900/40">
                            <TextInput
                                ref={inputRef}
                                value={newItemName}
                                onChangeText={setNewItemName}
                                placeholder="Add something else..."
                                placeholderTextColor="#6E6E85"
                                className="flex-1 text-white font-sans px-4 py-3 text-base"
                                onSubmitEditing={handleAddItem}
                                autoFocus={isManualEntryStarted && items.length === 0}
                            />
                            
                            <Pressable 
                                onPress={handleAddItem}
                                className="w-11 h-11 bg-accent rounded-2xl items-center justify-center shadow-lg shadow-accent/20 mr-0.5"
                            >
                                <Ionicons name="add" size={24} color="#FFFFFF" />
                            </Pressable>
                        </GlassContainer>

                        <Pressable 
                            onPress={() => setIsRecipePickerVisible(true)}
                            className="mt-3"
                        >
                            <GlassContainer className="flex-row items-center justify-center py-3 rounded-2xl border border-surface-800/20 bg-surface-800/10">
                                <Ionicons name="restaurant-outline" size={18} color="#FF6B35" />
                                <Text className="text-white font-sans-bold ml-2">Add Ingredients from Recipe</Text>
                            </GlassContainer>
                        </Pressable>
                    </Animated.View>
                </View>
            )}

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {items.length === 0 && !loading && !isManualEntryStarted ? (
                    <View className="flex-1 justify-center py-10">
                        <Animated.View entering={FadeInDown.delay(100)} className="items-center mb-10">
                            <View className="w-20 h-20 rounded-[32px] bg-accent/20 items-center justify-center mb-6">
                                <Ionicons name="cart-outline" size={40} color="#FF6B35" />
                            </View>
                            <Text className="text-white font-sans-bold text-3xl text-center mb-3">Shopping List</Text>
                            <Text className="text-surface-500 font-sans text-center px-12 leading-5">
                                How would you like to build your list today?
                            </Text>
                        </Animated.View>

                        <View className="flex-row gap-4 mb-4">
                            <Animated.View entering={FadeInDown.delay(200)} className="flex-1">
                                <Pressable onPress={handleGenerateItems}>
                                    <View>
                                        <GlassContainer className="p-6 rounded-[36px] border-emerald-500/20 bg-emerald-500/5 items-center justify-center aspect-square shadow-2xl shadow-emerald-500/10">
                                            <View className="w-14 h-14 bg-emerald-500/20 rounded-[22px] items-center justify-center mb-4">
                                                <Ionicons name="sparkles" size={32} color="#34D399" />
                                            </View>
                                            <Text className="text-white font-sans-bold text-center">Smart Sync</Text>
                                            <Text className="text-emerald-500/60 font-sans text-[10px] text-center mt-1 uppercase tracking-widest">From Plan</Text>
                                        </GlassContainer>
                                    </View>
                                </Pressable>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(350)} className="flex-1">
                                <Pressable onPress={() => setIsManualEntryStarted(true)}>
                                    <View>
                                        <GlassContainer className="p-6 rounded-[36px] border-surface-800 bg-surface-900/40 items-center justify-center aspect-square shadow-2xl shadow-black/20">
                                            <View className="w-14 h-14 bg-surface-800 rounded-[22px] items-center justify-center mb-4">
                                                <Ionicons name="create-outline" size={32} color="#FFFFFF" />
                                            </View>
                                            <Text className="text-white font-sans-bold text-center">Quick Add</Text>
                                            <Text className="text-surface-600 font-sans text-[10px] text-center mt-1 uppercase tracking-widest">Manual</Text>
                                        </GlassContainer>
                                    </View>
                                </Pressable>
                            </Animated.View>
                        </View>
                    </View>
                ) : null}

                {Object.entries(uncheckedGroups).map(([category, catItems]) => (
                    <View key={category} className="mb-8">
                        <View className="flex-row items-center mb-4 px-1">
                            <Text className="text-surface-500 font-sans-bold text-xs uppercase tracking-[0.2em]">
                                {category}
                            </Text>
                            <View className="flex-1 h-[1px] bg-surface-800 ml-4 opacity-30" />
                        </View>
                        {catItems.map((item, index) => (
                            <Animated.View 
                                key={item.id} 
                                entering={FadeInRight.delay(index * 50)}
                                className="mb-3"
                            >
                                <Pressable onPress={() => toggleItem(item.id, !item.is_checked)}>
                                    <View>
                                        <GlassContainer 
                                            className="flex-row items-center p-4 rounded-[24px] border border-surface-800/30 bg-surface-900/20"
                                        >
                                            <View className="w-7 h-7 rounded-full border-2 border-surface-700 items-center justify-center mr-4 bg-surface-950/50">
                                                {item.is_checked ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-white font-sans-semibold text-base">
                                                    {item.name}
                                                </Text>
                                                {item.quantity || item.unit ? (
                                                    <Text className="text-surface-400 font-sans text-xs mt-1">
                                                        {item.quantity} {item.unit}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <Pressable 
                                                onPress={() => deleteItem(item.id)}
                                                className="w-8 h-8 items-center justify-center rounded-full bg-surface-800/50"
                                                hitSlop={10}
                                            >
                                                <Ionicons name="close" size={16} color="#6E6E85" />
                                            </Pressable>
                                        </GlassContainer>
                                    </View>
                                </Pressable>
                            </Animated.View>
                        ))}
                    </View>
                ))}

                {/* Completed Section */}
                {checkedItems.length > 0 ? (
                    <View className="mt-8 mb-10">
                        <View className="flex-row items-center mb-4 px-1">
                            <Text className="text-surface-600 font-sans-bold text-xs uppercase tracking-[0.2em]">
                                Completed ({checkedItems.length})
                            </Text>
                            <View className="flex-1 h-[1px] bg-surface-800 ml-4 opacity-20" />
                        </View>
                        {checkedItems.map((item, index) => (
                            <Animated.View 
                                key={item.id} 
                                entering={FadeIn.delay(index * 50)}
                                className="mb-3 opacity-40"
                            >
                                <View>
                                    <Pressable onPress={() => toggleItem(item.id, !item.is_checked)}>
                                        <GlassContainer 
                                            className="flex-row items-center p-4 rounded-[24px] border border-surface-800/10 bg-surface-900/10"
                                        >
                                            <View className="w-7 h-7 rounded-full bg-emerald-500 items-center justify-center mr-4 shadow-sm shadow-emerald-500/50">
                                                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-white/40 font-sans-bold text-base line-through">
                                                    {item.name}
                                                </Text>
                                            </View>
                                            <Pressable 
                                                onPress={() => deleteItem(item.id)}
                                                className="w-8 h-8 items-center justify-center rounded-full bg-surface-800/30"
                                                hitSlop={10}
                                            >
                                                <Ionicons name="close" size={16} color="#4A4A5E" />
                                            </Pressable>
                                        </GlassContainer>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        ))}
                    </View>
                ) : null}
            </ScrollView>

            {/* Custom Styled Confirm Modal */}
            {isConfirmModalVisible && (
                <View 
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000 }}
                >
                    <Animated.View entering={FadeIn.delay(0)} className="w-[85%]">
                        <GlassContainer className="p-6 rounded-[32px] border-emerald-500/30">
                            <View className="items-center mb-6">
                                <View className="w-16 h-16 bg-emerald-500/20 rounded-full items-center justify-center mb-4">
                                    <Ionicons name="sparkles" size={32} color="#34D399" />
                                </View>
                                <Text className="text-white font-sans-bold text-2xl text-center">Generate from Meal Plan</Text>
                                <Text className="text-surface-400 font-sans text-center mt-3 leading-5">
                                    This will add all ingredients from your next 7 days of planned meals to this list.
                                </Text>
                            </View>

                            <View className="flex-row gap-3">
                                <Pressable 
                                    onPress={() => setIsConfirmModalVisible(false)}
                                    className="flex-1 bg-surface-800 py-4 rounded-2xl items-center"
                                >
                                    <Text className="text-white font-sans-bold">Cancel</Text>
                                </Pressable>
                                <Pressable 
                                    onPress={confirmGenerate}
                                    className="flex-[2] bg-emerald-500 py-4 rounded-2xl items-center px-8"
                                >
                                    <Text className="text-white font-sans-bold">Generate</Text>
                                </Pressable>
                            </View>
                        </GlassContainer>
                    </Animated.View>
                </View>
            )}

            {/* Recipe Picker Modal */}
            <Modal
                visible={isRecipePickerVisible}
                animationType="none"
                transparent={true}
                onRequestClose={() => setIsRecipePickerVisible(false)}
            >
                <View className="flex-1 bg-black/60 justify-end">
                    <Pressable 
                        className="flex-1" 
                        onPress={() => setIsRecipePickerVisible(false)} 
                    />
                    <Animated.View 
                        entering={SlideInUp.duration(400)}
                        className="bg-surface-950 rounded-t-[40px] border-t border-surface-800 h-[80%]"
                    >
                        <View className="w-12 h-1 bg-surface-800 rounded-full self-center mt-4 mb-4" />
                        
                        <View className="px-6 pb-6">
                            <Text className="text-white font-sans-bold text-2xl mb-2">Import from Recipe</Text>
                            <Text className="text-surface-500 font-sans text-sm mb-6">Which recipe's ingredients do you need?</Text>
                            
                            <View className="flex-row items-center bg-surface-900 border border-surface-800 rounded-2xl px-4 py-3 mb-6">
                                <Ionicons name="search" size={20} color="#6E6E85" mr-3 />
                                <TextInput
                                    className="flex-1 text-white font-sans text-base ml-3"
                                    placeholder="Search recipes..."
                                    placeholderTextColor="#6E6E85"
                                    value={recipeSearch}
                                    onChangeText={setRecipeSearch}
                                />
                            </View>

                            <FlatList
                                data={filteredRecipes}
                                keyExtractor={(item) => item.id.toString()}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100 }}
                                renderItem={({ item, index }) => (
                                    <Animated.View entering={FadeInDown.delay(index * 30)}>
                                        <Pressable 
                                            onPress={() => handleSelectRecipe(item.id)}
                                            className="mb-3"
                                        >
                                            <GlassContainer className="flex-row items-center p-3 rounded-2xl border border-surface-800/30 bg-surface-900/20">
                                                {item.image_url ? (
                                                    <Image 
                                                        source={{ uri: item.image_url }} 
                                                        className="w-14 h-14 rounded-xl mr-4"
                                                    />
                                                ) : (
                                                    <View className="w-14 h-14 rounded-xl bg-surface-800 items-center justify-center mr-4">
                                                        <Ionicons name="restaurant-outline" size={24} color="#6E6E85" />
                                                    </View>
                                                )}
                                                <View className="flex-1">
                                                    <Text className="text-white font-sans-bold text-base" numberOfLines={1}>
                                                        {item.title}
                                                    </Text>
                                                    <Text className="text-surface-500 font-sans text-xs mt-1">
                                                        {item.servings} servings
                                                    </Text>
                                                </View>
                                                <View className="w-10 h-10 rounded-full bg-accent/10 items-center justify-center">
                                                    <Ionicons name="chevron-forward" size={18} color="#FF6B35" />
                                                </View>
                                            </GlassContainer>
                                        </Pressable>
                                    </Animated.View>
                                )}
                                ListEmptyComponent={() => (
                                    <View className="items-center py-10">
                                        <Text className="text-surface-600 font-sans">No recipes found matching "{recipeSearch}"</Text>
                                    </View>
                                )}
                            />
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

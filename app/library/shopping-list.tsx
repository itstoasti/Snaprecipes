import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";
import { View, Text, Pressable, TextInput, ScrollView, Alert, Modal, Image, ActivityIndicator } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInUp,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedKeyboard,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    interpolate,
    interpolateColor,
    Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { format, addDays, startOfToday } from "@/lib/dateUtils";
import { categorizeIngredient, aislePreset, AISLE_EMOJI_CHOICES } from "@/lib/ingredientCategorizer";
import type { ShoppingItem, ShoppingCategory } from "@/db/schema";
import { useTheme } from "@/hooks/useTheme";

interface AisleGroup {
    name: string;
    emoji: string;
    tint: string;
    isCustom: boolean;
    categoryId: number | null;
    items: ShoppingItem[];
}

function CheckDot({ checked }: { checked: boolean }) {
    const p = useSharedValue(checked ? 1 : 0);

    useEffect(() => {
        p.value = withSpring(checked ? 1 : 0, { damping: 14, stiffness: 280 });
    }, [checked]);

    const ringStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(p.value, [0, 1], ["rgba(10,10,15,0.6)", "#34D399"]),
        borderColor: interpolateColor(p.value, [0, 1], ["#3F3F52", "#34D399"]),
    }));

    const tickStyle = useAnimatedStyle(() => ({
        opacity: interpolate(p.value, [0.4, 1], [0, 1], "clamp"),
        transform: [{ scale: interpolate(p.value, [0.4, 1], [0.3, 1], "clamp") }],
    }));

    return (
        <Animated.View
            style={[ringStyle, { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" }]}
        >
            <Animated.View style={tickStyle}>
                <Ionicons name="checkmark" size={17} color="#06281E" />
            </Animated.View>
        </Animated.View>
    );
}

function ProgressBand({ done, total }: { done: number; total: number }) {
    const pct = total > 0 ? done / total : 0;
    const prog = useSharedValue(0);

    useEffect(() => {
        prog.value = withTiming(pct, { duration: 650, easing: Easing.out(Easing.cubic) });
    }, [pct]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${prog.value * 100}%`,
        backgroundColor: interpolateColor(prog.value, [0, 0.99, 1], ["#FF6B35", "#34D399", "#34D399"]),
    }));

    const allDone = total > 0 && done === total;

    return (
        <View className="px-5 mb-7">
            <Animated.View entering={FadeInDown.duration(400)} className="bg-surface-900/70 rounded-[24px] p-4 border border-white/5">
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <Ionicons name={allDone ? "checkmark-done-circle" : "cart"} size={18} color={allDone ? "#34D399" : "#FF6B35"} style={{ marginRight: 8 }} />
                        <Text className="text-white font-sans-bold text-sm">
                            {allDone ? "Cart fully loaded" : `${done} of ${total} in the cart`}
                        </Text>
                    </View>
                    <Text className="font-sans-bold text-xs" style={{ color: allDone ? "#34D399" : "#FF6B35" }}>
                        {Math.round(pct * 100)}%
                    </Text>
                </View>
                <View className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <Animated.View style={[barStyle, { height: 8, borderRadius: 4 }]} />
                </View>
            </Animated.View>
        </View>
    );
}

function ItemRow({
    item,
    onToggle,
    onDelete,
    onMove,
}: {
    item: ShoppingItem;
    onToggle: () => void;
    onDelete: () => void;
    onMove: () => void;
}) {
    const checked = !!item.is_checked;
    return (
        <Animated.View entering={FadeIn.duration(250)}>
            <Pressable
                onPress={onToggle}
                onLongPress={onMove}
                delayLongPress={420}
                className="flex-row items-center py-3.5 border-b border-white/5"
            >
                <CheckDot checked={checked} />
                <View className="flex-1 ml-4">
                    <Text
                        className={`font-sans-semibold text-[15px] ${checked ? "text-surface-600 line-through" : "text-white"}`}
                    >
                        {item.name}
                    </Text>
                </View>
                {item.quantity || item.unit ? (
                    <View className={`px-2.5 py-1 rounded-lg mr-1 ${checked ? "bg-white/[0.03]" : "bg-white/5"}`}>
                        <Text className={`font-sans text-[11px] ${checked ? "text-surface-700" : "text-surface-400"}`}>
                            {[item.quantity, item.unit].filter(Boolean).join(" ")}
                        </Text>
                    </View>
                ) : null}
                <Pressable
                    onPress={onDelete}
                    hitSlop={10}
                    className="w-8 h-8 items-center justify-center"
                >
                    <Ionicons name="close" size={15} color={checked ? "#33333F" : "#55556A"} />
                </Pressable>
            </Pressable>
        </Animated.View>
    );
}

function BuildOption({
    icon,
    iconColor,
    tileBg,
    title,
    subtitle,
    onPress,
    delay,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    tileBg: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    delay: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
            <Pressable onPress={onPress}>
                <View className="flex-row items-center bg-surface-900/80 border border-white/5 rounded-[26px] p-4 mb-3">
                    <View style={{ backgroundColor: tileBg }} className="w-14 h-14 rounded-[20px] items-center justify-center mr-4">
                        <Ionicons name={icon} size={26} color={iconColor} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-sans-bold text-base">{title}</Text>
                        <Text className="text-surface-500 font-sans text-xs mt-0.5">{subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#55556A" />
                </View>
            </Pressable>
        </Animated.View>
    );
}

export default function ShoppingListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const inputRef = useRef<TextInput>(null);
    const {
        items,
        categories,
        loading,
        addItem,
        toggleItem,
        updateItemCategory,
        deleteItem,
        clearChecked,
        clearAll,
        addCategory,
        renameCategory,
        deleteCategory,
        generateFromMealPlan,
        addItemsFromRecipe,
    } = useShoppingList();
    const { recipes, searchCommunityRecipes, saveCommunityRecipe } = useRecipes();

    const [newItemName, setNewItemName] = useState("");
    const [addAisleOverride, setAddAisleOverride] = useState<string | null>(null);
    const [isManualEntryStarted, setIsManualEntryStarted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    const [isMealPlanEmptyVisible, setIsMealPlanEmptyVisible] = useState(false);
    const [isTrashModalVisible, setIsTrashModalVisible] = useState(false);
    const [isBuildSheetVisible, setIsBuildSheetVisible] = useState(false);
    const [isRecipePickerVisible, setIsRecipePickerVisible] = useState(false);
    const [isAisleManagerVisible, setIsAisleManagerVisible] = useState(false);
    const [aisleManagerView, setAisleManagerView] = useState<"list" | "form">("list");
    const [aislePickerFor, setAislePickerFor] = useState<{ mode: "move"; item: ShoppingItem } | { mode: "add" } | null>(null);
    const [editAisle, setEditAisle] = useState<ShoppingCategory | null>(null);
    const [aisleFormName, setAisleFormName] = useState("");
    const [aisleFormEmoji, setAisleFormEmoji] = useState("🛒");
    const [recipeSearch, setRecipeSearch] = useState("");
    const [recipeTab, setRecipeTab] = useState<"mine" | "community">("mine");
    const [communityRecipes, setCommunityRecipes] = useState<any[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const basketPulse = useSharedValue(1);
    useEffect(() => {
        basketPulse.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);
    const basketStyle = useAnimatedStyle(() => ({ transform: [{ scale: basketPulse.value }] }));

    const keyboard = useAnimatedKeyboard();
    const dockStyle = useAnimatedStyle(() => ({ bottom: keyboard.height.value + insets.bottom + 8 }));
    const fabStyle = useAnimatedStyle(() => ({ bottom: keyboard.height.value + insets.bottom + 118 }));

    useEffect(() => {
        if (recipeTab === "community" && isRecipePickerVisible) {
            let active = true;
            const fetchCommunity = async () => {
                setLoadingCommunity(true);
                try {
                    const results = await searchCommunityRecipes(recipeSearch);
                    if (active) setCommunityRecipes(results);
                } catch (error) {
                    console.error("Error searching community recipes:", error);
                } finally {
                    if (active) setLoadingCommunity(false);
                }
            };
            const delay = recipeSearch.trim() ? 500 : 0;
            const timeoutId = setTimeout(fetchCommunity, delay);
            return () => {
                active = false;
                clearTimeout(timeoutId);
            };
        }
    }, [recipeSearch, recipeTab, isRecipePickerVisible, searchCommunityRecipes]);

    const filteredRecipes = useMemo(() => {
        if (!recipeSearch.trim()) return recipes;
        return recipes.filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()));
    }, [recipes, recipeSearch]);

    const { groups, doneCount } = useMemo(() => {
        const byName = new Map<string, ShoppingItem[]>();
        let done = 0;
        for (const item of items) {
            if (item.is_checked) done++;
            const raw = item.category && item.category !== "General" ? item.category : "Other";
            const list = byName.get(raw) || [];
            list.push(item);
            byName.set(raw, list);
        }

        const ordered: AisleGroup[] = [];
        const seen = new Set<string>();
        for (const cat of categories) {
            const list = byName.get(cat.name);
            if (list && list.length > 0) {
                ordered.push({ name: cat.name, emoji: cat.emoji, tint: cat.tint, isCustom: !cat.is_builtin, categoryId: cat.id, items: list });
                seen.add(cat.name);
            }
        }
        for (const [name, list] of byName.entries()) {
            if (!seen.has(name)) {
                const preset = aislePreset(name);
                ordered.push({ name, emoji: preset.emoji, tint: preset.tint, isCustom: false, categoryId: null, items: list });
            }
        }
        return { groups: ordered, doneCount: done };
    }, [items, categories]);

    const inferredAisle = useMemo(() => {
        if (!newItemName.trim()) return null;
        const guess = categorizeIngredient(newItemName.trim());
        return categories.some(c => c.name === guess) ? guess : "Other";
    }, [newItemName, categories]);

    const activeAddAisle = addAisleOverride || inferredAisle || "Other";

    const handleAddItem = useCallback(async () => {
        const name = newItemName.trim();
        if (!name) return;
        await addItem(name, undefined, undefined, activeAddAisle);
        trackEvent("shopping_item_added", { source: "manual", aisle: activeAddAisle });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setNewItemName("");
        setAddAisleOverride(null);
    }, [newItemName, activeAddAisle, addItem]);

    const handleToggle = useCallback(async (item: ShoppingItem) => {
        const next = !item.is_checked;
        const group = groups.find(g => g.items.some(i => i.id === item.id));
        toggleItem(item.id, next);
        trackEvent("shopping_item_toggled", { checked: next });
        if (next && group) {
            const remaining = group.items.filter(i => !i.is_checked && i.id !== item.id);
            if (remaining.length === 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
    }, [groups, toggleItem]);

    const confirmGenerate = async () => {
        setIsConfirmModalVisible(false);
        setIsGenerating(true);
        const start = format(startOfToday(), "yyyy-MM-dd");
        const end = format(addDays(new Date(), 7), "yyyy-MM-dd");
        const added = await generateFromMealPlan(start, end);
        trackEvent("shopping_items_generated", { source: "meal_plan", items: added });
        setIsGenerating(false);
        if (added === 0) {
            setIsMealPlanEmptyVisible(true);
        }
    };

    const handleSelectRecipe = async (recipe: any) => {
        if (recipeTab === "mine") {
            setIsRecipePickerVisible(false);
            setIsManualEntryStarted(true);
            await addItemsFromRecipe(recipe.id);
            trackEvent("shopping_items_generated", { source: "recipe" });
        } else {
            setIsImporting(true);
            try {
                const localId = await saveCommunityRecipe(recipe.id);
                if (localId) {
                    setIsRecipePickerVisible(false);
                    setIsManualEntryStarted(true);
                    await addItemsFromRecipe(localId);
                    trackEvent("shopping_items_generated", { source: "recipe" });
                } else {
                    Alert.alert("Error", "Could not import community recipe.");
                }
            } catch (error) {
                console.error("Failed to import community recipe:", error);
                Alert.alert("Error", "An error occurred while importing the recipe.");
            } finally {
                setIsImporting(false);
            }
        }
    };

    const openAisleForm = (cat: ShoppingCategory | null) => {
        setEditAisle(cat);
        setAisleFormName(cat?.name || "");
        setAisleFormEmoji(cat?.emoji || "🛒");
        setAisleManagerView("form");
    };

    const closeAisleForm = () => {
        setEditAisle(null);
        setAisleFormName("");
        setAisleFormEmoji("🛒");
        setAisleManagerView("list");
    };

    const saveAisleForm = async () => {
        const name = aisleFormName.trim();
        if (!name) return;
        if (editAisle) {
            await renameCategory(editAisle.id, name, aisleFormEmoji);
            trackEvent("shopping_aisle_renamed");
        } else {
            const ok = await addCategory(name, aisleFormEmoji, "#8B8BA3");
            if (!ok) {
                Alert.alert("Name Taken", "An aisle with that name already exists.");
                return;
            }
            trackEvent("shopping_aisle_added");
        }
        closeAisleForm();
    };

    const showList = items.length > 0 || isManualEntryStarted;
    const activePreset = categories.find(c => c.name === activeAddAisle) || aislePreset(activeAddAisle);

    return (
        <View className="flex-1 bg-surface-950" style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-5 flex-row items-center justify-between mb-7">
                <View className="flex-row items-center">
                    <Pressable
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full bg-surface-900 border border-surface-800 items-center justify-center mr-4"
                    >
                        <Ionicons name="chevron-back" size={20} color={colors.text} />
                    </Pressable>
                    <View>
                        <Text className="text-white font-sans-bold text-3xl">Groceries</Text>
                        <Text className="text-surface-500 font-sans text-xs uppercase tracking-widest mt-0.5">
                            {items.length > 0 ? `${items.length} item${items.length === 1 ? "" : "s"} · aisle by aisle` : "Aisle by aisle"}
                        </Text>
                    </View>
                </View>

                {items.length > 0 && (
                    <Pressable
                        onPress={() => setIsTrashModalVisible(true)}
                        className="w-10 h-10 rounded-full bg-surface-900 border border-surface-800 items-center justify-center"
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF6B35" />
                    </Pressable>
                )}
            </View>

            {items.length > 0 && <ProgressBand done={doneCount} total={items.length} />}

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 190 }}>
                {!showList && !loading ? (
                    /* ── EMPTY STATE: build the list ── */
                    <View className="pt-6">
                        <Animated.View entering={FadeInDown.duration(450)} className="items-center mb-9">
                            <View className="relative items-center justify-center mb-6">
                                <View className="absolute w-28 h-28 rounded-[38px] bg-accent/15" />
                                <Animated.View style={basketStyle} className="w-24 h-24 rounded-[34px] bg-accent/20 border border-accent/40 items-center justify-center">
                                    <Text style={{ fontSize: 42 }}>🧺</Text>
                                </Animated.View>
                            </View>
                            <Text className="text-white font-sans-bold text-2xl text-center mb-2">Stock the kitchen</Text>
                            <Text className="text-surface-500 font-sans text-center text-sm px-10 leading-5">
                                Where should we pull ingredients from?
                            </Text>
                        </Animated.View>

                        <BuildOption
                            icon="calendar-outline"
                            iconColor="#34D399"
                            tileBg="rgba(52,211,153,0.12)"
                            title="From Meal Plan"
                            subtitle="Everything planned for the next 7 days"
                            delay={120}
                            onPress={() => setIsConfirmModalVisible(true)}
                        />
                        <BuildOption
                            icon="book-outline"
                            iconColor="#FF6B35"
                            tileBg="rgba(255,107,53,0.12)"
                            title="From a Recipe"
                            subtitle="Every ingredient from one recipe"
                            delay={240}
                            onPress={() => {
                                setRecipeSearch("");
                                setRecipeTab("mine");
                                setIsRecipePickerVisible(true);
                            }}
                        />
                        <BuildOption
                            icon="create-outline"
                            iconColor={colors.text}
                            tileBg={colors.elevated}
                            title="Add Manually"
                            subtitle="Type items in one by one"
                            delay={360}
                            onPress={() => {
                                setIsManualEntryStarted(true);
                                setTimeout(() => inputRef.current?.focus(), 120);
                            }}
                        />
                    </View>
                ) : null}

                {/* ── AISLE SECTIONS ── */}
                {groups.map((group) => {
                    const groupDone = group.items.filter(i => i.is_checked).length;
                    const groupTotal = group.items.length;
                    const groupComplete = groupDone === groupTotal;
                    return (
                        <View key={group.name} className="mb-7">
                            <View className="flex-row items-center mb-1.5">
                                <View
                                    style={{ backgroundColor: `${group.tint}1F` }}
                                    className="w-8 h-8 rounded-[10px] items-center justify-center mr-2.5"
                                >
                                    <Text style={{ fontSize: 15 }}>{group.emoji}</Text>
                                </View>
                                <Text className="text-white font-sans-bold text-[15px] flex-shrink">{group.name}</Text>
                                <View
                                    className={`ml-2.5 px-2 py-0.5 rounded-full ${groupComplete ? "bg-emerald-500/15" : "bg-white/5"}`}
                                >
                                    <Text
                                        className="font-sans-bold text-[10px]"
                                        style={{ color: groupComplete ? "#34D399" : colors.textFaint }}
                                    >
                                        {groupDone}/{groupTotal}
                                    </Text>
                                </View>
                                <View className="flex-1" />
                                <Pressable
                                    onPress={() => setIsAisleManagerVisible(true)}
                                    hitSlop={10}
                                    className="w-8 h-8 items-center justify-center"
                                >
                                    <Ionicons name="ellipsis-horizontal" size={16} color="#55556A" />
                                </Pressable>
                            </View>

                            {group.items.map((item) => (
                                <ItemRow
                                    key={item.id}
                                    item={item}
                                    onToggle={() => handleToggle(item)}
                                    onDelete={() => {
                                        deleteItem(item.id);
                                        trackEvent("shopping_item_deleted");
                                    }}
                                    onMove={() => setAislePickerFor({ mode: "move", item })}
                                />
                            ))}
                        </View>
                    );
                })}
            </ScrollView>

            {/* ── QUICK ADD DOCK ── */}
            {showList && (
                <Animated.View
                    entering={SlideInUp.duration(350)}
                    className="absolute left-0 right-0 px-5 pt-3 bg-surface-950 border-t border-white/5"
                    style={dockStyle}
                >
                    <View className="flex-row items-center">
                        <View className="flex-1 flex-row items-center bg-surface-900 border border-surface-800 rounded-2xl pr-1">
                            <TextInput
                                ref={inputRef}
                                value={newItemName}
                                onChangeText={(t) => {
                                    setNewItemName(t);
                                    setAddAisleOverride(null);
                                }}
                                placeholder="Add an item..."
                                placeholderTextColor={colors.placeholder}
                                className="flex-1 text-white font-sans px-4 py-3.5 text-[15px]"
                                onSubmitEditing={handleAddItem}
                                returnKeyType="done"
                            />
                            <Pressable
                                onPress={handleAddItem}
                                className="w-11 h-11 bg-accent rounded-xl items-center justify-center"
                            >
                                <Ionicons name="add" size={24} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    </View>
                    <Pressable onPress={() => setAislePickerFor({ mode: "add" })} className="self-start mt-2.5 mb-1">
                        <View className="flex-row items-center bg-white/5 border border-white/5 rounded-full pl-2 pr-3 py-1.5">
                            <Text style={{ fontSize: 12, marginRight: 6 }}>{activePreset.emoji}</Text>
                            <Text className="text-surface-400 font-sans-semibold text-[11px]">
                                {addAisleOverride ? activeAddAisle : `→ ${activeAddAisle}`}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={colors.textFaint} style={{ marginLeft: 5 }} />
                        </View>
                    </Pressable>
                </Animated.View>
            )}

            {/* FAB: build more when a list exists */}
            {showList && (
                <Animated.View style={[{ position: "absolute", right: 20 }, fabStyle]}>
                    <Pressable
                        onPress={() => setIsBuildSheetVisible(true)}
                        className="w-14 h-14 rounded-full bg-accent items-center justify-center shadow-lg shadow-accent/30"
                    >
                        <Ionicons name="add" size={28} color="#FFFFFF" />
                    </Pressable>
                </Animated.View>
            )}

            {/* ── BUILD LIST SHEET ── */}
            <Modal visible={isBuildSheetVisible} animationType="none" transparent onRequestClose={() => setIsBuildSheetVisible(false)}>
                <View className="flex-1 bg-black/60 justify-end">
                    <Pressable className="flex-1" onPress={() => setIsBuildSheetVisible(false)} />
                    <Animated.View entering={SlideInUp.duration(350)} className="bg-surface-950 rounded-t-[36px] border-t border-surface-800 px-5 pt-3 pb-8">
                        <View className="w-12 h-1 bg-surface-800 rounded-full self-center mb-5" />
                        <Text className="text-white font-sans-bold text-2xl mb-1">Add to list</Text>
                        <Text className="text-surface-500 font-sans text-sm mb-5">Pull ingredients from anywhere</Text>
                        <BuildOption
                            icon="calendar-outline"
                            iconColor="#34D399"
                            tileBg="rgba(52,211,153,0.12)"
                            title="From Meal Plan"
                            subtitle="Everything planned for the next 7 days"
                            delay={0}
                            onPress={() => {
                                setIsBuildSheetVisible(false);
                                setIsConfirmModalVisible(true);
                            }}
                        />
                        <BuildOption
                            icon="book-outline"
                            iconColor="#FF6B35"
                            tileBg="rgba(255,107,53,0.12)"
                            title="From a Recipe"
                            subtitle="Every ingredient from one recipe"
                            delay={60}
                            onPress={() => {
                                setIsBuildSheetVisible(false);
                                setRecipeSearch("");
                                setRecipeTab("mine");
                                setIsRecipePickerVisible(true);
                            }}
                        />
                        <BuildOption
                            icon="create-outline"
                            iconColor={colors.text}
                            tileBg={colors.elevated}
                            title="Add Manually"
                            subtitle="Type items in one by one"
                            delay={120}
                            onPress={() => {
                                setIsBuildSheetVisible(false);
                                setIsManualEntryStarted(true);
                                setTimeout(() => inputRef.current?.focus(), 150);
                            }}
                        />
                    </Animated.View>
                </View>
            </Modal>

            {/* ── AISLE PICKER SHEET (move item / override add aisle) ── */}
            <Modal visible={aislePickerFor !== null} animationType="none" transparent onRequestClose={() => setAislePickerFor(null)}>
                <View className="flex-1 bg-black/60 justify-end">
                    <Pressable className="flex-1" onPress={() => setAislePickerFor(null)} />
                    <Animated.View entering={SlideInUp.duration(300)} className="bg-surface-950 rounded-t-[36px] border-t border-surface-800 px-5 pt-3 pb-8" style={{ maxHeight: "70%" }}>
                        <View className="w-12 h-1 bg-surface-800 rounded-full self-center mb-5" />
                        <Text className="text-white font-sans-bold text-2xl mb-5">
                            {aislePickerFor?.mode === "move" ? "Move to aisle" : "Choose an aisle"}
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {aislePickerFor?.mode === "add" && (
                                <Pressable
                                    onPress={() => {
                                        setAddAisleOverride(null);
                                        setAislePickerFor(null);
                                    }}
                                    className="flex-row items-center py-3.5 border-b border-white/5"
                                >
                                    <Text style={{ fontSize: 16, marginRight: 12 }}>✨</Text>
                                    <Text className="text-white font-sans-semibold text-[15px] flex-1">
                                        Auto {inferredAisle ? `(${inferredAisle})` : ""}
                                    </Text>
                                    {!addAisleOverride && <Ionicons name="checkmark" size={18} color="#FF6B35" />}
                                </Pressable>
                            )}
                            {categories.map((cat) => {
                                const selected =
                                    aislePickerFor?.mode === "move"
                                        ? (aislePickerFor.item.category || "Other") === cat.name
                                        : activeAddAisle === cat.name && !!addAisleOverride;
                                return (
                                    <Pressable
                                        key={cat.id}
                                        onPress={() => {
                                            if (aislePickerFor?.mode === "move") {
                                                updateItemCategory(aislePickerFor.item.id, cat.name);
                                                trackEvent("shopping_item_moved", { aisle: cat.name });
                                            } else {
                                                setAddAisleOverride(cat.name);
                                            }
                                            setAislePickerFor(null);
                                        }}
                                        className="flex-row items-center py-3.5 border-b border-white/5"
                                    >
                                        <Text style={{ fontSize: 16, marginRight: 12 }}>{cat.emoji}</Text>
                                        <Text className="text-white font-sans-semibold text-[15px] flex-1">{cat.name}</Text>
                                        {selected && <Ionicons name="checkmark" size={18} color="#FF6B35" />}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {/* ── AISLE MANAGER SHEET ── */}
            <Modal visible={isAisleManagerVisible} animationType="none" transparent onRequestClose={() => { setIsAisleManagerVisible(false); closeAisleForm(); }}>
                <View className="flex-1 bg-black/60 justify-end">
                    <Pressable className="flex-1" onPress={() => { setIsAisleManagerVisible(false); closeAisleForm(); }} />
                    <Animated.View entering={SlideInUp.duration(300)} className="bg-surface-950 rounded-t-[36px] border-t border-surface-800 px-5 pt-3 pb-8" style={{ maxHeight: "82%" }}>
                        <View className="w-12 h-1 bg-surface-800 rounded-full self-center mb-5" />

                        {aisleManagerView === "form" ? (
                            <View>
                                <Text className="text-white font-sans-bold text-2xl mb-5">
                                    {editAisle ? "Edit aisle" : "New aisle"}
                                </Text>
                                <View className="flex-row items-center bg-surface-900 border border-surface-800 rounded-2xl px-4 mb-5">
                                    <Text style={{ fontSize: 20, marginRight: 10 }}>{aisleFormEmoji}</Text>
                                    <TextInput
                                        value={aisleFormName}
                                        onChangeText={setAisleFormName}
                                        placeholder="Aisle name, e.g. Farmers Market"
                                        placeholderTextColor={colors.placeholder}
                                        className="flex-1 text-white font-sans py-3.5 text-[15px]"
                                        onSubmitEditing={saveAisleForm}
                                    />
                                </View>
                                <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
                                    {AISLE_EMOJI_CHOICES.map((e) => (
                                        <Pressable
                                            key={e}
                                            onPress={() => setAisleFormEmoji(e)}
                                            className={`w-11 h-11 rounded-xl items-center justify-center ${aisleFormEmoji === e ? "bg-accent/20 border border-accent/60" : "bg-surface-900 border border-surface-800"}`}
                                        >
                                            <Text style={{ fontSize: 18 }}>{e}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                                <View className="flex-row gap-3">
                                    <Pressable
                                        onPress={closeAisleForm}
                                        className="flex-1 bg-surface-800 py-4 rounded-2xl items-center"
                                    >
                                        <Text className="text-white font-sans-bold">Cancel</Text>
                                    </Pressable>
                                    <Pressable onPress={saveAisleForm} className="flex-[2] bg-accent py-4 rounded-2xl items-center">
                                        <Text className="text-[#FFFFFF] font-sans-bold">{editAisle ? "Save Changes" : "Create Aisle"}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <View className="flex-row items-center justify-between mb-5">
                                    <Text className="text-white font-sans-bold text-2xl">Manage aisles</Text>
                                    <Pressable
                                        onPress={() => openAisleForm(null)}
                                        className="flex-row items-center bg-accent/10 border border-accent/30 rounded-full px-3.5 py-2"
                                    >
                                        <Ionicons name="add" size={14} color="#FF6B35" />
                                        <Text className="text-accent font-sans-bold text-xs ml-1">New</Text>
                                    </Pressable>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {categories.map((cat) => (
                                        <View key={cat.id} className="flex-row items-center py-3 border-b border-white/5">
                                            <Text style={{ fontSize: 17, marginRight: 12 }}>{cat.emoji}</Text>
                                            <Text className="text-white font-sans-semibold text-[15px] flex-1">{cat.name}</Text>
                                            {cat.is_builtin ? (
                                                <View className="bg-white/5 rounded-full px-2.5 py-1 mr-1">
                                                    <Text className="text-surface-500 font-sans-bold text-[9px] uppercase tracking-widest">Default</Text>
                                                </View>
                                            ) : null}
                                            <Pressable onPress={() => openAisleForm(cat)} hitSlop={8} className="w-9 h-9 items-center justify-center">
                                                <Ionicons name="pencil-outline" size={16} color={colors.textFaint} />
                                            </Pressable>
                                            {!cat.is_builtin && (
                                                <Pressable
                                                    onPress={() => {
                                                        Alert.alert(
                                                            "Delete Aisle",
                                                            `Items in "${cat.name}" will move to Other.`,
                                                            [
                                                                { text: "Cancel", style: "cancel" },
                                                                {
                                                                    text: "Delete",
                                                                    style: "destructive",
                                                                    onPress: () => { deleteCategory(cat.id); trackEvent("shopping_aisle_deleted"); },
                                                                },
                                                            ]
                                                        );
                                                    }}
                                                    hitSlop={8}
                                                    className="w-9 h-9 items-center justify-center"
                                                >
                                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                </Pressable>
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </Modal>

            {/* ── MEAL PLAN CONFIRM ── */}
            {isConfirmModalVisible && (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000 }}>
                    <Animated.View entering={FadeIn.duration(200)} className="w-[85%]">
                        <View className="p-6 rounded-[32px] bg-surface-900 border border-emerald-500/30">
                            <View className="items-center mb-6">
                                <View className="w-16 h-16 bg-emerald-500/15 rounded-[22px] items-center justify-center mb-4">
                                    <Ionicons name="calendar-outline" size={30} color="#34D399" />
                                </View>
                                <Text className="text-white font-sans-bold text-2xl text-center">From Your Meal Plan</Text>
                                <Text className="text-surface-400 font-sans text-center mt-3 leading-5">
                                    This adds every ingredient from the next 7 days of planned meals, merged and sorted into aisles.
                                </Text>
                            </View>
                            <View className="flex-row gap-3">
                                <Pressable
                                    onPress={() => setIsConfirmModalVisible(false)}
                                    className="flex-1 bg-surface-800 py-4 rounded-2xl items-center"
                                    disabled={isGenerating}
                                >
                                    <Text className="text-white font-sans-bold">Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={confirmGenerate}
                                    className="flex-[2] bg-emerald-500 py-4 rounded-2xl items-center flex-row justify-center"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text className="text-[#FFFFFF] font-sans-bold">Generate List</Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ── NO MEAL PLANS PROMPT ── */}
            {isMealPlanEmptyVisible && (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000 }}>
                    <Animated.View entering={FadeIn.duration(200)} className="w-[85%]">
                        <View className="p-6 rounded-[32px] bg-surface-900 border border-emerald-500/30">
                            <View className="items-center mb-6">
                                <View className="w-16 h-16 bg-emerald-500/15 rounded-[22px] items-center justify-center mb-4">
                                    <Ionicons name="calendar-outline" size={30} color="#34D399" />
                                </View>
                                <Text className="text-white font-sans-bold text-2xl text-center">Nothing Planned Yet</Text>
                                <Text className="text-surface-400 font-sans text-center mt-3 leading-5">
                                    You don't have any meals planned for the next 7 days. Want to set up your week first?
                                </Text>
                            </View>
                            <View className="flex-col gap-3">
                                <Pressable
                                    onPress={() => {
                                        setIsMealPlanEmptyVisible(false);
                                        trackEvent("meal_prep_opened", { source: "shopping_list" });
                                        router.push("/library/meal-prep");
                                    }}
                                    className="w-full bg-emerald-500 py-4 rounded-2xl items-center flex-row justify-center"
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text className="text-[#FFFFFF] font-sans-bold">Create a Meal Plan</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setIsMealPlanEmptyVisible(false)}
                                    className="w-full bg-surface-950 border border-surface-800 py-4 rounded-2xl items-center"
                                >
                                    <Text className="text-surface-400 font-sans-semibold">Not Now</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ── TRASH CONFIRM ── */}
            {isTrashModalVisible && (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000 }}>
                    <Animated.View entering={FadeIn.duration(200)} className="w-[85%]">
                        <View className="p-6 rounded-[32px] bg-surface-900 border border-accent/30">
                            <View className="items-center mb-6">
                                <View className="w-16 h-16 bg-accent/15 rounded-[22px] items-center justify-center mb-4">
                                    <Ionicons name="trash-outline" size={30} color="#FF6B35" />
                                </View>
                                <Text className="text-white font-sans-bold text-2xl text-center">Clear Shopping List</Text>
                                <Text className="text-surface-400 font-sans text-center mt-3 leading-5">
                                    {doneCount > 0
                                        ? "Clear only the items you've picked up, or empty the entire list?"
                                        : "Are you sure you want to empty your entire shopping list?"}
                                </Text>
                            </View>
                            <View className="flex-col gap-3">
                                {doneCount > 0 && (
                                    <Pressable
                                        onPress={async () => {
                                            setIsTrashModalVisible(false);
                                            await clearChecked();
                                            trackEvent("shopping_list_cleared", { scope: "checked" });
                                        }}
                                        className="w-full bg-surface-800 py-4 rounded-2xl items-center"
                                    >
                                        <Text className="text-white font-sans-bold">Clear Picked Up ({doneCount})</Text>
                                    </Pressable>
                                )}
                                <Pressable
                                    onPress={async () => {
                                        setIsTrashModalVisible(false);
                                        await clearAll();
                                        setIsManualEntryStarted(false);
                                        trackEvent("shopping_list_cleared", { scope: "all" });
                                    }}
                                    className="w-full bg-accent py-4 rounded-2xl items-center"
                                >
                                    <Text className="text-[#FFFFFF] font-sans-bold">Clear Entire List</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setIsTrashModalVisible(false)}
                                    className="w-full bg-surface-950 border border-surface-800 py-4 rounded-2xl items-center"
                                >
                                    <Text className="text-surface-400 font-sans-semibold">Cancel</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ── RECIPE PICKER ── */}
            <Modal visible={isRecipePickerVisible} animationType="none" transparent onRequestClose={() => setIsRecipePickerVisible(false)}>
                <View className="flex-1 bg-black/60 justify-end">
                    <Pressable className="flex-1" onPress={() => setIsRecipePickerVisible(false)} />
                    <Animated.View entering={SlideInUp.duration(400)} className="bg-surface-950 rounded-t-[40px] border-t border-surface-800 h-[80%]">
                        <View className="w-12 h-1 bg-surface-800 rounded-full self-center mt-4 mb-4" />
                        {isImporting ? (
                            <View className="flex-1 items-center justify-center pb-20">
                                <ActivityIndicator size="large" color="#FF6B35" />
                                <Text className="text-white font-sans-bold text-lg mt-4">Importing Recipe...</Text>
                                <Text className="text-surface-500 font-sans text-sm mt-1 text-center px-10">
                                    Saving to your recipes and sorting ingredients into aisles
                                </Text>
                            </View>
                        ) : (
                            <View className="px-6 pb-6 flex-1">
                                <Text className="text-white font-sans-bold text-2xl mb-2">From a Recipe</Text>
                                <Text className="text-surface-500 font-sans text-sm mb-6">Which recipe's ingredients do you need?</Text>

                                <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: 16, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                                    <Pressable
                                        onPress={() => setRecipeTab("mine")}
                                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: recipeTab === "mine" ? colors.elevated : "transparent" }}
                                    >
                                        <Text style={{ color: recipeTab === "mine" ? colors.text : colors.textSecondary, fontWeight: "700", fontSize: 12 }}>My Recipes</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => setRecipeTab("community")}
                                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: recipeTab === "community" ? colors.elevated : "transparent" }}
                                    >
                                        <Text style={{ color: recipeTab === "community" ? colors.text : colors.textSecondary, fontWeight: "700", fontSize: 12 }}>Community</Text>
                                    </Pressable>
                                </View>

                                <View className="flex-row items-center bg-surface-900 border border-surface-800 rounded-2xl px-4 py-3 mb-6">
                                    <Ionicons name="search" size={20} color={colors.textFaint} />
                                    <TextInput
                                        className="flex-1 text-white font-sans text-base ml-3"
                                        placeholder={recipeTab === "mine" ? "Search recipes..." : "Search community recipes..."}
                                        placeholderTextColor={colors.placeholder}
                                        value={recipeSearch}
                                        onChangeText={setRecipeSearch}
                                    />
                                    {loadingCommunity && <ActivityIndicator size="small" color="#FF6B35" className="ml-2" />}
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                                    {(recipeTab === "mine" ? filteredRecipes : communityRecipes).length === 0 ? (
                                        <View className="items-center py-10 opacity-40">
                                            <Ionicons name={recipeTab === "mine" ? "book-outline" : "globe-outline"} size={48} color={colors.text} />
                                            <Text className="text-white font-sans text-center mt-4 px-10">
                                                {recipeTab === "mine"
                                                    ? `No recipes found matching "${recipeSearch}"`
                                                    : `No community recipes found matching "${recipeSearch}"`}
                                            </Text>
                                        </View>
                                    ) : (
                                        (recipeTab === "mine" ? filteredRecipes : communityRecipes).map((item, index) => (
                                            <Animated.View key={item.id.toString()} entering={FadeInDown.delay(Math.min(index, 8) * 30)}>
                                                <Pressable onPress={() => handleSelectRecipe(item)} className="mb-3">
                                                    <View className="flex-row items-center p-3 rounded-2xl bg-surface-900/70 border border-white/5">
                                                        {item.image_url ? (
                                                            <Image source={{ uri: item.image_url }} className="w-14 h-14 rounded-xl mr-4" />
                                                        ) : (
                                                            <View className="w-14 h-14 rounded-xl bg-surface-800 items-center justify-center mr-4">
                                                                <Ionicons name="restaurant-outline" size={24} color={colors.textFaint} />
                                                            </View>
                                                        )}
                                                        <View className="flex-1">
                                                            <Text className="text-white font-sans-bold text-base" numberOfLines={1}>{item.title}</Text>
                                                            <Text className="text-surface-500 font-sans text-xs mt-1">{item.servings} servings</Text>
                                                        </View>
                                                        <View className="w-10 h-10 rounded-full bg-accent/10 items-center justify-center">
                                                            <Ionicons name="chevron-forward" size={18} color="#FF6B35" />
                                                        </View>
                                                    </View>
                                                </Pressable>
                                            </Animated.View>
                                        ))
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

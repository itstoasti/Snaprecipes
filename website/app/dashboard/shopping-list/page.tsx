"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser, useRecipes } from "@/hooks/useDashboardData";
import { useShoppingList } from "@/hooks/useShoppingList";
import { DEFAULT_AISLES, aislePreset, categorizeIngredient } from "@/lib/ingredientCategorizer";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Plus, Trash2, X, Check, ShoppingCart,
  ChefHat, CalendarDays, PenLine, Search, Loader2,
  Globe, ArrowRight, BookOpen, AlertCircle, ShoppingBasket
} from "lucide-react";

/* ─── helpers ─── */
function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ─── types ─── */
interface GroupedAisle {
  aisle: string;
  emoji: string;
  tint: string;
  items: any[];
  doneCount: number;
}

interface PublicRecipe {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  source_domain?: string;
  ingredients?: any[];
}

export default function ShoppingListPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { recipes: myRecipes, loading: myRecipesLoading } = useRecipes(user?.id);
  const {
    items, loading,
    addItem, toggleItem, updateItemCategory, deleteItem,
    clearChecked, clearAll,
    addItemsFromRecipe, addItemsFromCommunityRecipe, generateFromMealPlan,
  } = useShoppingList();

  /* ─── local UI state ─── */
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddAisle, setQuickAddAisle] = useState<string | null>(null);
  const [showBuildSheet, setShowBuildSheet] = useState(false);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [recipePickerTab, setRecipePickerTab] = useState<"my" | "community">("my");
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showNoMealPlansModal, setShowNoMealPlansModal] = useState(false);
  const [showAislePicker, setShowAislePicker] = useState<string | null>(null); // item id
  const [recipeSearch, setRecipeSearch] = useState("");
  
  /* Community recipes state */
  const [communityRecipes, setCommunityRecipes] = useState<PublicRecipe[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  const [generatingMealPlan, setGeneratingMealPlan] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── fetch community recipes when tab is community ─── */
  const fetchCommunityRecipes = useCallback(async (query?: string) => {
    setCommunityLoading(true);
    try {
      let q = supabase
        .from("public_recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      if (query && query.trim()) {
        q = q.ilike("title", `%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setCommunityRecipes(data || []);
    } catch (err) {
      console.error("Failed to fetch community recipes:", err);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showRecipePicker && recipePickerTab === "community") {
      fetchCommunityRecipes(recipeSearch);
    }
  }, [showRecipePicker, recipePickerTab, recipeSearch, fetchCommunityRecipes]);

  /* ─── computed ─── */
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.is_checked).length;
  const progress = totalItems > 0 ? checkedItems / totalItems : 0;
  const isEmpty = totalItems === 0;

  /* Group items by aisle */
  const groups: GroupedAisle[] = (() => {
    const map: Record<string, any[]> = {};
    for (const it of items) {
      const cat = it.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(it);
    }
    // Sort aisles by DEFAULT_AISLES order
    const aisleOrder = DEFAULT_AISLES.map((a) => a.name);
    return Object.keys(map)
      .sort((a, b) => {
        const ai = aisleOrder.indexOf(a);
        const bi = aisleOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map((aisle) => {
        const preset = aislePreset(aisle);
        const aisleItems = map[aisle];
        return {
          aisle,
          emoji: preset.emoji,
          tint: preset.tint,
          items: aisleItems,
          doneCount: aisleItems.filter((i: any) => i.is_checked).length,
        };
      });
  })();

  /* ─── toast helper ─── */
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /* ─── quick add ─── */
  const handleQuickAdd = async () => {
    const name = quickAddText.trim();
    if (!name) return;
    const aisle = quickAddAisle || undefined;
    await addItem(name, undefined, undefined, aisle);
    setQuickAddText("");
    setQuickAddAisle(null);
    showToast(`Added "${name}"`);
  };

  /* ─── from my recipe ─── */
  const handleAddFromMyRecipe = async (recipeId: string) => {
    setShowRecipePicker(false);
    await addItemsFromRecipe(recipeId);
    showToast("Ingredients added from recipe!");
  };

  /* ─── from community recipe ─── */
  const handleAddFromCommunityRecipe = async (publicRecipe: PublicRecipe) => {
    setShowRecipePicker(false);
    const count = await addItemsFromCommunityRecipe(publicRecipe);
    if (count > 0) {
      showToast(`Added ${count} ingredients from "${publicRecipe.title}"`);
    } else {
      showToast("No ingredients found in this recipe");
    }
  };

  /* ─── from meal plan (7-day) ─── */
  const handleGenerateFromMealPlan = async () => {
    setShowBuildSheet(false);
    setGeneratingMealPlan(true);
    const start = formatDate(new Date());
    const end = formatDate(new Date(Date.now() + 7 * 86400000));
    const count = await generateFromMealPlan(start, end);
    setGeneratingMealPlan(false);
    
    if (count === 0) {
      // Show high contrast suggestion modal instead of silent/unreadable toast
      setShowNoMealPlansModal(true);
    } else {
      showToast(`Added ${count} items from your 7-day meal plan!`);
    }
  };

  /* ─── filtered my recipes ─── */
  const filteredMyRecipes = (myRecipes || []).filter((r: any) =>
    r.title?.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  if (userLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-800 rounded w-48" />
          <div className="h-4 bg-surface-800 rounded w-32" />
          <div className="h-12 bg-surface-800 rounded-2xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-44 md:pb-12 relative min-h-screen">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hub"
            className="w-10 h-10 rounded-full bg-surface-900 border border-surface-700 flex items-center justify-center text-surface-300 hover:text-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-surface-200 flex items-center gap-2">
              Groceries
              <ShoppingCart className="w-5 h-5 text-rose-400" />
            </h1>
            <p className="text-xs text-surface-500">
              {totalItems > 0
                ? `${totalItems} item${totalItems !== 1 ? "s" : ""} · aisle by aisle`
                : "Your grocery list is empty"}
            </p>
          </div>
        </div>
        {totalItems > 0 && (
          <button
            onClick={() => setShowTrashModal(true)}
            className="p-2.5 rounded-full bg-surface-900 border border-surface-700 text-surface-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── Progress Band ─── */}
      {totalItems > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-surface-900 border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-surface-400">
              {checkedItems === totalItems ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" /> Cart fully loaded
                </span>
              ) : (
                `${checkedItems} of ${totalItems} in the cart`
              )}
            </span>
            <span className="text-xs text-surface-500 font-medium">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {isEmpty && !generatingMealPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-surface-900 border border-surface-750 flex items-center justify-center mx-auto mb-6">
            <ShoppingBasket className="w-8 h-8 text-surface-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-surface-300 mb-2">
            Build your grocery list
          </h2>
          <p className="text-sm text-surface-500 mb-8 max-w-xs mx-auto">
            Add items from your meal plan, a recipe, or type them in manually.
          </p>

          <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
            {/* From Meal Plan */}
            <button
              onClick={handleGenerateFromMealPlan}
              className="flex items-center gap-4 p-4 rounded-2xl bg-surface-900 border border-surface-700 hover:border-emerald-500/50 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-200 text-sm">From Meal Plan</h3>
                <p className="text-xs text-surface-500">Next 7 days of meals</p>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-600 ml-auto" />
            </button>

            {/* From a Recipe */}
            <button
              onClick={() => setShowRecipePicker(true)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-surface-900 border border-surface-700 hover:border-blue-500/50 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-200 text-sm">From a Recipe</h3>
                <p className="text-xs text-surface-500">My recipes & Community recipes</p>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-600 ml-auto" />
            </button>

            {/* Add Manually */}
            <button
              onClick={() => inputRef.current?.focus()}
              className="flex items-center gap-4 p-4 rounded-2xl bg-surface-900 border border-surface-700 hover:border-violet-500/50 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <PenLine className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-200 text-sm">Add Manually</h3>
                <p className="text-xs text-surface-500">Type items one by one</p>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-600 ml-auto" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── Generating spinner ─── */}
      {generatingMealPlan && (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-surface-400 text-sm">Checking your 7-day meal plan...</p>
        </div>
      )}

      {/* ─── Aisle Groups ─── */}
      {!isEmpty && (
        <div className="space-y-4 mb-6">
          {groups.map((group) => (
            <div key={group.aisle} className="rounded-2xl bg-surface-900 border border-surface-700 overflow-hidden">
              {/* Aisle Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.tint }} />
                  <span className="font-semibold text-sm text-surface-300">{group.aisle}</span>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: group.tint + "20", color: group.tint }}
                  >
                    {group.doneCount}/{group.items.length}
                  </span>
                </div>
              </div>

              {/* Item Rows */}
              <div className="divide-y divide-surface-800/50">
                {group.items.map((it: any) => (
                  <div
                    key={it.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      it.is_checked ? "opacity-50" : ""
                    }`}
                  >
                    {/* Check Circle */}
                    <button
                      onClick={() => toggleItem(it.id, !it.is_checked)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        it.is_checked
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-surface-600 hover:border-emerald-400"
                      }`}
                    >
                      {it.is_checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>

                    {/* Name + Aisle tap */}
                    <button
                      onClick={() => setShowAislePicker(it.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <span
                        className={`text-sm block truncate ${
                          it.is_checked ? "line-through text-surface-500" : "text-surface-200"
                        }`}
                      >
                        {it.name}
                      </span>
                    </button>

                    {/* Quantity Pill */}
                    {(it.quantity || it.unit) && (
                      <span className="text-[11px] font-medium text-surface-400 bg-surface-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {[it.quantity, it.unit].filter(Boolean).join(" ")}
                      </span>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => deleteItem(it.id)}
                      className="p-1 text-surface-600 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Quick Add Dock (fixed bottom) ─── */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-surface-950/95 backdrop-blur-lg border-t border-surface-800 px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {/* Aisle selector pill */}
          <button
            onClick={() => {
              if (!quickAddAisle) {
                setQuickAddAisle(DEFAULT_AISLES[0].name);
              } else {
                const idx = DEFAULT_AISLES.findIndex((a) => a.name === quickAddAisle);
                if (idx >= DEFAULT_AISLES.length - 1) {
                  setQuickAddAisle(null);
                } else {
                  setQuickAddAisle(DEFAULT_AISLES[idx + 1].name);
                }
              }
            }}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors border border-surface-700 flex items-center gap-1.5"
          >
            <ArrowRight className="w-3 h-3" />
            {quickAddAisle ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: aislePreset(quickAddAisle).tint }} />
                {quickAddAisle}
              </span>
            ) : (
              "Auto"
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            placeholder="Add an item..."
            className="flex-1 bg-surface-900 border border-surface-700 rounded-full px-4 py-2.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-accent transition-colors"
          />

          <button
            onClick={handleQuickAdd}
            disabled={!quickAddText.trim()}
            className="w-10 h-10 rounded-full bg-accent hover:bg-accent-light text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── FAB (when items exist) ─── */}
      {!isEmpty && (
        <button
          onClick={() => setShowBuildSheet(true)}
          className="fixed bottom-32 md:bottom-16 right-5 z-40 w-14 h-14 rounded-full bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/25 flex items-center justify-center transition-all hover:scale-105"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ─── Toast Notification (high contrast) ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-36 md:bottom-20 left-1/2 -translate-x-1/2 z-50 bg-surface-900 border border-surface-700 text-surface-100 px-5 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-2.5"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ MODALS ═══════════ */}

      {/* ─── No Meal Plans Prompt Modal ─── */}
      <AnimatePresence>
        {showNoMealPlansModal && (
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNoMealPlansModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-surface-100 mb-2">
                No Meals Planned
              </h3>
              <p className="text-sm text-surface-400 leading-relaxed mb-6">
                You don't have any meals scheduled for the next 7 days. Plan your meals first, then your shopping list will auto-generate!
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setShowNoMealPlansModal(false);
                    router.push("/dashboard/meal-prep");
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <CalendarDays className="w-4 h-4" />
                  Create a Meal Plan
                </button>
                <button
                  onClick={() => setShowNoMealPlansModal(false)}
                  className="w-full py-3 px-4 rounded-2xl text-surface-400 hover:text-surface-200 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Build List Sheet ─── */}
      <AnimatePresence>
        {showBuildSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBuildSheet(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-surface-900 border-t border-surface-700 rounded-t-3xl p-6 pb-10"
            >
              <div className="w-10 h-1 rounded-full bg-surface-700 mx-auto mb-5" />
              <h3 className="text-lg font-display font-bold text-surface-200 mb-4">Add Items</h3>
              <div className="space-y-3">
                <button
                  onClick={handleGenerateFromMealPlan}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-surface-200 block">From Meal Plan</span>
                    <span className="text-xs text-surface-500">Next 7 days of meals</span>
                  </div>
                </button>
                <button
                  onClick={() => { setShowBuildSheet(false); setShowRecipePicker(true); }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-surface-200 block">From a Recipe</span>
                    <span className="text-xs text-surface-500">My recipes & Community recipes</span>
                  </div>
                </button>
                <button
                  onClick={() => { setShowBuildSheet(false); inputRef.current?.focus(); }}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-surface-200 block">Add Manually</span>
                    <span className="text-xs text-surface-500">Type items one by one</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Recipe Picker Modal (Tabs: My Recipes vs Community) ─── */}
      <AnimatePresence>
        {showRecipePicker && (
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pb-20 md:pb-4" onClick={() => setShowRecipePicker(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-surface-800 flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-surface-200">Choose a Recipe</h3>
                <button onClick={() => setShowRecipePicker(false)} className="p-2 rounded-full hover:bg-surface-800 text-surface-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs: My Recipes vs Community */}
              <div className="flex border-b border-surface-800 px-5 pt-2 gap-4">
                <button
                  onClick={() => setRecipePickerTab("my")}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                    recipePickerTab === "my"
                      ? "border-accent text-accent"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  My Recipes
                </button>
                <button
                  onClick={() => setRecipePickerTab("community")}
                  className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                    recipePickerTab === "community"
                      ? "border-accent text-accent"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Community
                </button>
              </div>

              {/* Search input */}
              <div className="px-5 py-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder={recipePickerTab === "my" ? "Search my recipes..." : "Search community recipes..."}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Recipe List based on active tab */}
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                {recipePickerTab === "my" ? (
                  /* My Recipes */
                  myRecipesLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    </div>
                  ) : filteredMyRecipes.length === 0 ? (
                    <div className="text-center py-10 text-surface-500 text-sm">
                      No personal recipes found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredMyRecipes.map((r: any) => (
                        <button
                          key={r.id}
                          onClick={() => handleAddFromMyRecipe(r.id)}
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-surface-800 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-750 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {r.image_url ? (
                              <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ChefHat className="w-5 h-5 text-surface-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-surface-200 block truncate group-hover:text-accent transition-colors">{r.title}</span>
                            <span className="text-xs text-surface-500">{r.source_domain || "Personal recipe"}</span>
                          </div>
                          <Plus className="w-4 h-4 text-surface-500 group-hover:text-accent shrink-0" />
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  /* Community Recipes */
                  communityLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    </div>
                  ) : communityRecipes.length === 0 ? (
                    <div className="text-center py-10 text-surface-500 text-sm">
                      No community recipes found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {communityRecipes.map((cr) => (
                        <button
                          key={cr.id}
                          onClick={() => handleAddFromCommunityRecipe(cr)}
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-surface-800 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-750 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {cr.image_url ? (
                              <img src={cr.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ChefHat className="w-5 h-5 text-surface-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-surface-200 block truncate group-hover:text-accent transition-colors">{cr.title}</span>
                            <span className="text-xs text-surface-500">{cr.source_domain || "Community recipe"}</span>
                          </div>
                          <Plus className="w-4 h-4 text-surface-500 group-hover:text-accent shrink-0" />
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Aisle Picker Modal ─── */}
      <AnimatePresence>
        {showAislePicker && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAislePicker(null)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-surface-900 border-t border-surface-700 rounded-t-3xl p-5 pb-10"
            >
              <div className="w-10 h-1 rounded-full bg-surface-700 mx-auto mb-4" />
              <h3 className="text-base font-display font-bold text-surface-200 mb-3">Move to Aisle</h3>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_AISLES.map((a) => (
                  <button
                    key={a.name}
                    onClick={async () => {
                      if (showAislePicker) {
                        await updateItemCategory(showAislePicker, a.name);
                        setShowAislePicker(null);
                        showToast(`Moved to ${a.name}`);
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-750 transition-colors text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.tint }} />
                    <span className="text-sm text-surface-300 font-medium">{a.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Trash Modal ─── */}
      <AnimatePresence>
        {showTrashModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTrashModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            >
              <h3 className="text-lg font-display font-bold text-surface-200 mb-4 text-center">Clear List</h3>
              <div className="space-y-3">
                {checkedItems > 0 && (
                  <button
                    onClick={async () => {
                      await clearChecked();
                      setShowTrashModal(false);
                      showToast(`Cleared ${checkedItems} picked-up items`);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-surface-800 hover:bg-surface-750 text-surface-200 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    Clear Picked Up ({checkedItems})
                  </button>
                )}
                <button
                  onClick={async () => {
                    await clearAll();
                    setShowTrashModal(false);
                    showToast("Entire list cleared");
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Entire List
                </button>
                <button
                  onClick={() => setShowTrashModal(false)}
                  className="w-full py-3 px-4 rounded-2xl text-surface-400 text-sm font-medium transition-colors hover:text-surface-200 text-center"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser, useSavesThisMonth, useProStatus } from "@/hooks/useDashboardData";
import PaywallModal from "@/components/PaywallModal";
import { 
  Globe, Search, Heart, Bookmark, Check, ChevronLeft, 
  ChefHat, ExternalLink, Clock, Users, X, Sparkles, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PublicRecipe {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  image_url?: string;
  servings?: number;
  prep_time?: string;
  cook_time?: string;
  save_count: number;
  source_domain?: string;
  source_url?: string;
  ingredients?: any[];
  steps?: any[];
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export default function CommunityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { isPro } = useProStatus(user?.id);
  const { count: savesCount, limit } = useSavesThisMonth(user?.id);

  const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<PublicRecipe | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCommunityRecipes = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      let q = supabase
        .from("public_recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);

      if (query && query.trim()) {
        q = q.ilike("title", `%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      setRecipes(data || []);
    } catch (err) {
      console.error("Failed to fetch community recipes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunityRecipes();
  }, [fetchCommunityRecipes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchCommunityRecipes(val);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchCommunityRecipes("");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveToLibrary = async (recipeToSave: PublicRecipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!user) {
      router.push("/auth");
      return;
    }

    if (!isPro && savesCount >= limit) {
      setIsPaywallOpen(true);
      return;
    }

    setSavingId(recipeToSave.id);

    try {
      // 1. Insert recipe into personal recipes table
      const { data: recipeRow, error: recipeErr } = await supabase
        .from("recipes")
        .insert({
          owner_id: user.id,
          title: recipeToSave.title,
          description: recipeToSave.description || null,
          image_url: recipeToSave.image_url || null,
          source_url: recipeToSave.source_url || null,
          source_domain: recipeToSave.source_domain || null,
          prep_time: recipeToSave.prep_time || null,
          cook_time: recipeToSave.cook_time || null,
          servings: recipeToSave.servings || null,
          calories: recipeToSave.calories || null,
          protein: recipeToSave.protein || null,
          fat: recipeToSave.fat || null,
          carbs: recipeToSave.carbs || null,
          is_public: false,
        })
        .select()
        .single();

      if (recipeErr) throw recipeErr;

      // 2. Insert ingredients if available
      if (recipeToSave.ingredients && recipeToSave.ingredients.length > 0) {
        const ingPayload = recipeToSave.ingredients.map((ing: any, idx: number) => ({
          owner_id: user.id,
          recipe_id: recipeRow.id,
          text: ing.text || ing.name || "",
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          name: ing.name || ing.text || "Ingredient",
          order_index: idx,
        }));
        await supabase.from("ingredients").insert(ingPayload);
      }

      // 3. Insert steps if available
      if (recipeToSave.steps && recipeToSave.steps.length > 0) {
        const stepsPayload = recipeToSave.steps.map((st: any, idx: number) => ({
          owner_id: user.id,
          recipe_id: recipeRow.id,
          text: st.text || "",
          step_number: st.stepNumber || st.step_number || idx + 1,
          order_index: idx,
        }));
        await supabase.from("steps").insert(stepsPayload);
      }

      // 4. Increment save_count on public_recipes
      const newCount = (recipeToSave.save_count || 0) + 1;
      await supabase
        .from("public_recipes")
        .update({ save_count: newCount })
        .eq("id", recipeToSave.id);

      // Update local UI
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeToSave.id ? { ...r, save_count: newCount } : r))
      );
      setSavedRecipeIds((prev) => new Set(prev).add(recipeToSave.id));
      showToast(`Saved "${recipeToSave.title}" to your library!`);
    } catch (err: any) {
      console.error("Error saving community recipe:", err);
      alert(err.message || "Failed to save recipe to library.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/hub"
          className="w-10 h-10 rounded-full bg-surface-900 border border-surface-700 flex items-center justify-center text-surface-300 hover:text-accent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-surface-300 flex items-center gap-2">
            Community
            <Globe className="w-6 h-6 text-orange-500 inline-block" />
          </h1>
          <p className="text-xs md:text-sm text-surface-500">
            Shared by the SnapRecipes world
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search community recipes..."
            className="w-full pl-12 pr-10 py-3 rounded-2xl bg-surface-900 border border-surface-700 text-surface-300 placeholder-surface-500 focus:outline-none focus:border-accent text-sm md:text-base transition-colors"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-surface-300 text-surface-950 px-6 py-3 rounded-full shadow-2xl font-medium text-sm flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-emerald-600" />
            <span>{toastMessage}</span>
            <Link href="/dashboard" className="text-accent underline font-semibold ml-1">
              View Library
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-surface-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-surface-800 rounded w-3/4" />
                <div className="h-3 bg-surface-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-surface-900 border border-surface-700 rounded-3xl">
          <Globe className="w-16 h-16 text-surface-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-surface-300 mb-2">No recipes found</h3>
          <p className="text-surface-500 text-sm max-w-sm mx-auto">
            Try a different search query or explore again later!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {recipes.map((item) => {
            const isSaved = savedRecipeIds.has(item.id);
            const isSaving = savingId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedRecipe(item)}
                className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col group relative"
              >
                {/* Image Container */}
                <div className="relative aspect-square w-full bg-surface-800 overflow-hidden">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-850 to-surface-800">
                      <ChefHat className="w-10 h-10 text-surface-600" />
                    </div>
                  )}


                  {/* Save Count Badge */}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs text-white font-medium flex items-center gap-1">
                    <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
                    <span>{item.save_count || 0}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm md:text-base text-surface-300 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-surface-500 mt-1 line-clamp-1">
                      {item.source_domain || "Shared Recipe"}
                    </p>
                  </div>

                  {(item.cook_time || item.servings) && (
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-surface-800 text-[11px] text-surface-500">
                      {item.cook_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.cook_time}
                        </span>
                      )}
                      {item.servings && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.servings} servings
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-900 border border-surface-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface-950/80 text-surface-300 hover:text-white backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Recipe Header Image */}
              <div className="relative h-52 w-full bg-surface-800">
                {selectedRecipe.image_url ? (
                  <Image
                    src={selectedRecipe.image_url}
                    alt={selectedRecipe.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-850">
                    <ChefHat className="w-16 h-16 text-surface-600" />
                  </div>
                )}
              </div>

              {/* Recipe Title - below image for readability */}
              <div className="px-6 pt-5">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 inline-block mb-3">
                  {selectedRecipe.source_domain || "Community Recipe"}
                </span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-surface-200 leading-tight">
                  {selectedRecipe.title}
                </h2>
              </div>

              {/* Modal Body */}
              <div className="px-6 pb-28 md:pb-6 pt-4 space-y-6">
                {selectedRecipe.description && (
                  <p className="text-surface-400 text-sm leading-relaxed">
                    {selectedRecipe.description}
                  </p>
                )}

                {/* Quick Info Grid */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-850 border border-surface-750 text-center">
                  <div>
                    <span className="text-xs text-surface-500 block">Prep Time</span>
                    <span className="text-sm font-semibold text-surface-300">
                      {selectedRecipe.prep_time || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-surface-500 block">Cook Time</span>
                    <span className="text-sm font-semibold text-surface-300">
                      {selectedRecipe.cook_time || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-surface-500 block">Servings</span>
                    <span className="text-sm font-semibold text-surface-300">
                      {selectedRecipe.servings || "—"}
                    </span>
                  </div>
                </div>

                {/* Ingredients */}
                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div>
                    <h3 className="font-display font-bold text-lg text-surface-300 mb-3">
                      Ingredients
                    </h3>
                    <ul className="space-y-2">
                      {selectedRecipe.ingredients.map((ing: any, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 text-sm text-surface-400 py-1.5 border-b border-surface-800 last:border-0"
                        >
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          <span>{ing.text || ing.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps */}
                {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                  <div>
                    <h3 className="font-display font-bold text-lg text-surface-300 mb-3">
                      Instructions
                    </h3>
                    <ol className="space-y-4">
                      {selectedRecipe.steps.map((step: any, idx: number) => (
                        <li key={idx} className="flex gap-4 text-sm text-surface-400">
                          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-surface-800 flex items-center justify-between gap-4">
                  {selectedRecipe.source_url ? (
                    <a
                      href={selectedRecipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-surface-500 hover:text-accent flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Original Source
                    </a>
                  ) : (
                    <div />
                  )}

                  <button
                    onClick={() => {
                      handleSaveToLibrary(selectedRecipe);
                      setSelectedRecipe(null);
                    }}
                    disabled={savedRecipeIds.has(selectedRecipe.id)}
                    className={`px-6 py-3 rounded-full font-semibold text-sm transition-all flex items-center gap-2 ${
                      savedRecipeIds.has(selectedRecipe.id)
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-accent hover:bg-accent-light text-white shadow-lg hover:shadow-accent/25"
                    }`}
                  >
                    {savedRecipeIds.has(selectedRecipe.id) ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved in Library
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        Save to My Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paywall Modal */}
      {user && (
        <PaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          userId={user.id}
          userEmail={user.email}
        />
      )}
    </div>
  );
}

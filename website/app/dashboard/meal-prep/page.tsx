"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, Search, X, ChefHat, CalendarDays, BookOpen, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useMealPlans, useDatesWithPlans } from "@/hooks/useMealPlans";
import { useUser, useRecipes } from "@/hooks/useDashboardData";

// --- Date Helpers ---
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getDayAbbrev(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getDayNum(date: Date): number {
  return date.getDate();
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

const MEAL_SECTIONS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '☀️' },
  { key: 'lunch', label: 'Lunch', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { key: 'snack', label: 'Snacks', emoji: '🍿' },
];

export default function MealPrepPage() {
  const { user } = useUser();
  const { recipes } = useRecipes(user?.id);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateStr = formatDate(selectedDate);
  
  const { plans, loading: plansLoading, addPlan, updateServings, removePlan } = useMealPlans(user?.id ?? null, selectedDateStr);
  
  // Dates for the strip
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => addDays(today, i));
  }, []);

  const startStr = formatDate(dates[0]);
  const endStr = formatDate(dates[dates.length - 1]);
  const { datesWithPlans } = useDatesWithPlans(user?.id ?? null, startStr, endStr);

  const dateStripRef = useRef<HTMLDivElement>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMealType, setAddingMealType] = useState('');
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addServings, setAddServings] = useState(2);
  const [modalTab, setModalTab] = useState<"my" | "community">("my");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedCommunityRecipe, setSelectedCommunityRecipe] = useState<any | null>(null);
  
  // Community recipes state
  const [communityRecipes, setCommunityRecipes] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  const fetchCommunityRecipes = useCallback(async (query?: string) => {
    setCommunityLoading(true);
    try {
      let q = supabase.from("public_recipes").select("*").order("created_at", { ascending: false }).limit(50);
      if (query && query.trim()) {
        q = q.ilike("title", `%${query.trim()}%`);
      }
      const { data } = await q;
      setCommunityRecipes(data || []);
    } catch (err) {
      console.error("Failed to fetch community recipes:", err);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAddModal && modalTab === "community") {
      fetchCommunityRecipes(addSearchQuery);
    }
  }, [showAddModal, modalTab, addSearchQuery, fetchCommunityRecipes]);

  const filteredMyRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter(r => r.title.toLowerCase().includes(addSearchQuery.toLowerCase()));
  }, [recipes, addSearchQuery]);

  const handleAddClick = (mealKey: string) => {
    setAddingMealType(mealKey);
    setAddSearchQuery('');
    setAddServings(2);
    setModalTab('my');
    setSelectedRecipeId(null);
    setSelectedCommunityRecipe(null);
    setShowAddModal(true);
  };

  const handleAddToPlan = async () => {
    if (!user) return;
    setIsAddingPlan(true);
    try {
      let targetRecipeId = selectedRecipeId;

      if (modalTab === "community" && selectedCommunityRecipe) {
        // Clone/save community recipe to personal recipes so meal_plans FK works
        const { data: recipeRow, error: recipeErr } = await supabase
          .from("recipes")
          .insert({
            owner_id: user.id,
            title: selectedCommunityRecipe.title,
            description: selectedCommunityRecipe.description || null,
            image_url: selectedCommunityRecipe.image_url || null,
            source_url: selectedCommunityRecipe.source_url || null,
            source_domain: selectedCommunityRecipe.source_domain || null,
            prep_time: selectedCommunityRecipe.prep_time || null,
            cook_time: selectedCommunityRecipe.cook_time || null,
            servings: selectedCommunityRecipe.servings || null,
            calories: selectedCommunityRecipe.calories || null,
            protein: selectedCommunityRecipe.protein || null,
            fat: selectedCommunityRecipe.fat || null,
            carbs: selectedCommunityRecipe.carbs || null,
            is_public: false,
          })
          .select()
          .single();

        if (recipeErr) throw recipeErr;
        targetRecipeId = recipeRow.id;

        // Copy ingredients if available
        if (selectedCommunityRecipe.ingredients && selectedCommunityRecipe.ingredients.length > 0) {
          const ingPayload = selectedCommunityRecipe.ingredients.map((ing: any, idx: number) => ({
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
      }

      if (targetRecipeId) {
        await addPlan(targetRecipeId, addingMealType, addServings);
        setShowAddModal(false);
      }
    } catch (err) {
      console.error("Error adding to plan:", err);
    } finally {
      setIsAddingPlan(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-surface-300">Meal Prep</h1>
      </header>

      {/* Date Strip */}
      <div 
        ref={dateStripRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {dates.map((d) => {
          const isSelected = selectedDateStr === formatDate(d);
          const hasPlan = datesWithPlans.has(formatDate(d));
          const today = isToday(d);

          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDate(d)}
              className={`min-w-[4rem] w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                isSelected 
                  ? "bg-accent text-white shadow-md scale-105" 
                  : "bg-surface-900 text-surface-400 hover:bg-surface-800"
              }`}
            >
              <span className={`text-xs font-medium mb-1 ${isSelected ? "text-white/80" : "text-surface-500"}`}>
                {getDayAbbrev(d)}
              </span>
              <span className={`text-xl font-bold ${isSelected ? "text-white" : "text-surface-300"}`}>
                {getDayNum(d)}
              </span>
              <div className="h-4 flex items-center justify-center mt-1">
                {today && <span className={`text-[10px] font-bold ${isSelected ? "text-white" : "text-accent"}`}>TODAY</span>}
                {!today && hasPlan && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-accent"}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Meal Sections */}
      <div className="space-y-8">
        {MEAL_SECTIONS.map((section) => {
          const sectionPlans = plans.filter(p => p.meal_type === section.key);
          
          return (
            <section key={section.key} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold text-surface-300 flex items-center gap-2">
                  <span>{section.emoji}</span> {section.label}
                </h2>
                <button
                  onClick={() => handleAddClick(section.key)}
                  className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {plansLoading ? (
                <div className="animate-pulse bg-surface-900 rounded-xl h-24 border border-surface-700"></div>
              ) : sectionPlans.length > 0 ? (
                <div className="space-y-3">
                  {sectionPlans.map((plan) => (
                    <div key={plan.id} className="bg-surface-900 border border-surface-700 rounded-xl p-3 flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-surface-800 flex-shrink-0 relative overflow-hidden">
                        {plan.recipes?.image_url ? (
                          <Image src={plan.recipes.image_url} alt={plan.recipes.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center">
                            <ChefHat className="w-6 h-6 text-surface-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-surface-300 truncate">{plan.recipes?.title || "Unknown Recipe"}</h3>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-surface-800 rounded-full border border-surface-700">
                          <button 
                            onClick={() => updateServings(plan.id, Math.max(1, plan.servings - 1))}
                            className="p-1.5 text-surface-500 hover:text-surface-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-surface-300">
                            {plan.servings}
                          </span>
                          <button 
                            onClick={() => updateServings(plan.id, Math.min(20, plan.servings + 1))}
                            className="p-1.5 text-surface-500 hover:text-surface-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button 
                          onClick={() => removePlan(plan.id)}
                          className="p-2 text-surface-500 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-surface-500 text-sm italic opacity-70">
                  No {section.label.toLowerCase()} planned
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Add Recipe Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm z-[100]"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-x-0 bottom-0 z-[110] bg-surface-900 border-t border-surface-700 rounded-t-3xl max-h-[85vh] flex flex-col pb-16 md:pb-0 md:max-w-md md:mx-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl md:border"
            >
              {/* Handle bar for mobile */}
              <div className="w-12 h-1.5 bg-surface-700 rounded-full mx-auto my-3 md:hidden" />
              
              <div className="p-4 border-b border-surface-700 flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold text-surface-300 capitalize">
                  Add to {addingMealType}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-surface-500 hover:text-surface-300 bg-surface-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs: My Recipes vs Community */}
              <div className="flex border-b border-surface-800 px-4 pt-2 gap-4 bg-surface-900">
                <button
                  onClick={() => {
                    setModalTab("my");
                    setSelectedCommunityRecipe(null);
                  }}
                  className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    modalTab === "my"
                      ? "border-accent text-accent"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  My Recipes
                </button>
                <button
                  onClick={() => {
                    setModalTab("community");
                    setSelectedRecipeId(null);
                  }}
                  className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    modalTab === "community"
                      ? "border-accent text-accent"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Community
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-surface-700 bg-surface-900">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                  <input
                    type="text"
                    placeholder={modalTab === "my" ? "Search your recipes..." : "Search community recipes..."}
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-800 border-none rounded-xl text-surface-300 placeholder-surface-500 focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
              </div>

              {/* Scrollable Recipe List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[45vh]">
                {modalTab === "my" ? (
                  filteredMyRecipes.length === 0 ? (
                    <div className="text-center py-8 text-surface-500 text-sm">
                      No personal recipes found.
                    </div>
                  ) : (
                    filteredMyRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => {
                          setSelectedRecipeId(recipe.id);
                          setSelectedCommunityRecipe(null);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors border text-left ${
                          selectedRecipeId === recipe.id 
                            ? "bg-accent/10 border-accent text-accent" 
                            : "bg-surface-950 border-transparent hover:border-surface-700 text-surface-300"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-surface-800 flex-shrink-0 relative overflow-hidden">
                           {recipe.image_url ? (
                             <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
                           ) : (
                             <div className="w-full h-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center">
                               <ChefHat className="w-5 h-5 text-surface-500" />
                             </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">{recipe.title}</h4>
                          <p className="text-xs text-surface-500">{recipe.source_domain || recipe.cook_time || "Personal Recipe"}</p>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  communityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    </div>
                  ) : communityRecipes.length === 0 ? (
                    <div className="text-center py-8 text-surface-500 text-sm">
                      No community recipes found.
                    </div>
                  ) : (
                    communityRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => {
                          setSelectedCommunityRecipe(recipe);
                          setSelectedRecipeId(null);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors border text-left ${
                          selectedCommunityRecipe?.id === recipe.id 
                            ? "bg-accent/10 border-accent text-accent" 
                            : "bg-surface-950 border-transparent hover:border-surface-700 text-surface-300"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-surface-800 flex-shrink-0 relative overflow-hidden">
                           {recipe.image_url ? (
                             <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
                           ) : (
                             <div className="w-full h-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center">
                               <ChefHat className="w-5 h-5 text-surface-500" />
                             </div>
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">{recipe.title}</h4>
                          <p className="text-xs text-surface-500">{recipe.source_domain || "Community Recipe"}</p>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>

              {/* Selected Recipe Footer Controls */}
              {(selectedRecipeId || selectedCommunityRecipe) && (
                <div className="p-4 pb-20 md:pb-4 border-t border-surface-700 bg-surface-950 rounded-b-3xl mt-auto">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-surface-300 text-sm">Servings</span>
                    <div className="flex items-center bg-surface-800 rounded-full border border-surface-700">
                      <button 
                        onClick={() => setAddServings(Math.max(1, addServings - 1))}
                        className="p-2 text-surface-500 hover:text-surface-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium text-surface-300 text-sm">
                        {addServings}
                      </span>
                      <button 
                        onClick={() => setAddServings(Math.min(20, addServings + 1))}
                        className="p-2 text-surface-500 hover:text-surface-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleAddToPlan}
                    disabled={isAddingPlan}
                    className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-semibold shadow-md shadow-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAddingPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding to Plan...
                      </>
                    ) : (
                      "Add to Plan"
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

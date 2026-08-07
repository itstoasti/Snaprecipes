import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useDashboardData";
import { categorizeIngredient } from "@/lib/ingredientCategorizer";
import { aggregateIngredients, Ingredient } from "@/lib/ingredientAggregation";

export interface ShoppingItem {
  id: string;
  owner_id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  is_checked: boolean;
  category: string | null;
  source_recipe_id: string | null;
  created_at: string;
}

export function useShoppingList() {
  const { user } = useUser();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user?.id]);

  const addItem = async (name: string, quantity?: string | null, unit?: string | null, category?: string | null) => {
    if (!user?.id) return null;
    const itemCategory = category || categorizeIngredient(name);
    
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({
        owner_id: user.id,
        name,
        quantity: quantity || null,
        unit: unit || null,
        category: itemCategory,
        is_checked: false
      })
      .select()
      .single();
      
    if (!error && data) {
      setItems(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  const toggleItem = async (id: string, isChecked: boolean) => {
    const { error } = await supabase
      .from("shopping_items")
      .update({ is_checked: isChecked })
      .eq("id", id);
      
    if (!error) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_checked: isChecked } : item));
    }
  };

  const updateItemCategory = async (id: string, category: string) => {
    const { error } = await supabase
      .from("shopping_items")
      .update({ category })
      .eq("id", id);
      
    if (!error) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, category } : item));
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("id", id);
      
    if (!error) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const clearChecked = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("owner_id", user.id)
      .eq("is_checked", true);
      
    if (!error) {
      setItems(prev => prev.filter(item => !item.is_checked));
    }
  };

  const clearAll = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("owner_id", user.id);
      
    if (!error) {
      setItems([]);
    }
  };

  const addItemsFromRecipe = async (recipeId: string) => {
    if (!user?.id) return;
    const { data: ingredients, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("recipe_id", recipeId);
      
    if (error || !ingredients) return;
    
    const itemsToInsert = ingredients.map(ing => ({
      owner_id: user.id,
      name: ing.name,
      quantity: ing.quantity || null,
      unit: ing.unit || null,
      category: categorizeIngredient(ing.name),
      source_recipe_id: recipeId,
      is_checked: false
    }));
    
    if (itemsToInsert.length > 0) {
      const { data, error: insertError } = await supabase
        .from("shopping_items")
        .insert(itemsToInsert)
        .select();
        
      if (!insertError && data) {
        setItems(prev => [...prev, ...data]);
      }
    }
  };

  const generateFromMealPlan = async (startDate: string, endDate: string): Promise<number> => {
    if (!user?.id) return 0;
    
    // Fetch meal plans with recipes and ingredients
    const { data: mealPlans, error } = await supabase
      .from("meal_plans")
      .select('*, recipes(*, ingredients(*))')
      .eq("owner_id", user.id)
      .gte("planned_date", startDate)
      .lte("planned_date", endDate);
      
    if (error || !mealPlans || mealPlans.length === 0) return 0;
    
    // Flatten to { ingredient, mealPlanServings, recipeServings }
    const ingredientsWithRecipe: { ingredient: Ingredient; mealPlanServings: number; recipeServings: number }[] = [];
    
    for (const plan of mealPlans) {
      if (!plan.recipes || !plan.recipes.ingredients) continue;
      
      const mealPlanServings = plan.servings || plan.recipes.servings || 4; // Fallback
      const recipeServings = plan.recipes.servings || 4;
      
      for (const ingredient of plan.recipes.ingredients) {
        ingredientsWithRecipe.push({
          ingredient: {
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            recipe_id: ingredient.recipe_id
          },
          mealPlanServings,
          recipeServings
        });
      }
    }
    
    if (ingredientsWithRecipe.length === 0) return 0;
    
    // Aggregate
    const aggregated = aggregateIngredients(ingredientsWithRecipe);
    
    // Insert
    const itemsToInsert = aggregated.map(agg => ({
      owner_id: user.id,
      name: agg.name as string,
      quantity: agg.quantity || null,
      unit: agg.unit || null,
      category: categorizeIngredient(agg.name),
      source_recipe_id: agg.source_recipe_id || null,
      is_checked: false
    }));
    
    if (itemsToInsert.length > 0) {
      const { data, error: insertError } = await supabase
        .from("shopping_items")
        .insert(itemsToInsert)
        .select();
        
      if (!insertError && data) {
        setItems(prev => [...prev, ...data]);
        return data.length;
      }
    }
    return 0;
  };

  const addItemsFromCommunityRecipe = async (recipe: { ingredients?: any[] }): Promise<number> => {
    if (!user?.id || !recipe.ingredients || recipe.ingredients.length === 0) return 0;
    
    const itemsToInsert = recipe.ingredients.map(ing => ({
      owner_id: user.id,
      name: ing.name || ing.text || "Ingredient",
      quantity: ing.quantity || null,
      unit: ing.unit || null,
      category: categorizeIngredient(ing.name || ing.text),
      source_recipe_id: null,
      is_checked: false
    }));
    
    if (itemsToInsert.length > 0) {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert(itemsToInsert)
        .select();
        
      if (!error && data) {
        setItems(prev => [...prev, ...data]);
        return data.length;
      }
    }
    return 0;
  };

  return {
    items,
    loading,
    addItem,
    toggleItem,
    updateItemCategory,
    deleteItem,
    clearChecked,
    clearAll,
    addItemsFromRecipe,
    addItemsFromCommunityRecipe,
    generateFromMealPlan,
    refetch: fetchItems
  };
}

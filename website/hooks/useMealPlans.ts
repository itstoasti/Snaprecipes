"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface MealPlan {
  id: string;
  owner_id: string;
  recipe_id: string;
  planned_date: string;
  meal_type: string;
  servings: number;
  created_at?: string;
  recipes?: any; // joined recipe data
}

export function useMealPlans(userId: string | null, date: string) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*, recipes(*)')
      .eq('owner_id', userId)
      .eq('planned_date', date)
      .order('created_at', { ascending: true });
    
    if (!error) setPlans(data || []);
    setLoading(false);
  }, [userId, date]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const addPlan = async (recipeId: string, mealType: string, servings: number = 2) => {
    if (!userId) return null;
    const newPlan = {
      id: crypto.randomUUID(),
      owner_id: userId,
      recipe_id: recipeId,
      planned_date: date,
      meal_type: mealType,
      servings,
    };
    // Optimistic update
    const { data, error } = await supabase
      .from('meal_plans')
      .insert(newPlan)
      .select('*, recipes(*)')
      .single();
    
    if (!error && data) {
      setPlans(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  const updateServings = async (planId: string, newServings: number) => {
    // Optimistic update
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, servings: newServings } : p));
    await supabase.from('meal_plans').update({ servings: newServings }).eq('id', planId);
  };

  const removePlan = async (planId: string) => {
    // Optimistic update
    setPlans(prev => prev.filter(p => p.id !== planId));
    await supabase.from('meal_plans').delete().eq('id', planId);
  };

  return { plans, loading, refetch: fetchPlans, addPlan, updateServings, removePlan };
}

// Separate hook to get dates that have plans (for dot indicators on the date strip)
export function useDatesWithPlans(userId: string | null, startDate: string, endDate: string) {
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('meal_plans')
        .select('planned_date')
        .eq('owner_id', userId)
        .gte('planned_date', startDate)
        .lte('planned_date', endDate);
      
      if (data) {
        setDates(new Set(data.map(d => d.planned_date)));
      }
      setLoading(false);
    };
    fetch();
  }, [userId, startDate, endDate]);

  return { datesWithPlans: dates, loading };
}

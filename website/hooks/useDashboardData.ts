"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) {
        router.push("/auth");
        return;
      }
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      setUser(freshUser || s.user);
      setSession(s);
      setLoading(false);
    };
    init();
  }, [router]);

  return { user, session, loading };
}

export function useRecipes(userId: string | null) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setRecipes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, [userId]);

  return { recipes, loading, refetch: fetchRecipes };
}

export function useProStatus(userId: string | null) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPro = async () => {
      if (!userId) {
        setIsPro(false);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/check-pro?user_id=${userId}`);
        const data = await res.json();
        setIsPro(data.isPro || false);
      } catch (err) {
        setIsPro(false);
      }
      setLoading(false);
    };
    checkPro();
  }, [userId]);

  return { isPro, loading };
}

export function useSavesThisMonth(userId: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    const fetchSaves = async () => {
      if (!userId) {
        setCount(0);
        setLoading(false);
        return;
      }
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: exactCount, error } = await supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .gte("created_at", startOfMonth);

      if (!error && exactCount !== null) {
        setCount(exactCount);
      }
      setLoading(false);
    };
    fetchSaves();
  }, [userId]);

  return { count, loading, limit };
}

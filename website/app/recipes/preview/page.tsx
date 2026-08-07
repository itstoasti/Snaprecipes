"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import ExtractionLoader from "@/components/ExtractionLoader";

function extractRecipeSection(content: string, maxChars: number = 40000): string {
    if (content.length <= maxChars) return content;

    // We want to find the ACTUAL recipe section.
    // Navigation links look like "[Jump to Ingredients](#ingredients)"
    // Real headers look like "## Ingredients" or "### Instructions" or stand alone on a line.
    const markers = [
        /\n#+\s*Ingredients\b/i,
        /\n\s*\*\*Ingredients\*\*/i,
        /\n\s*Ingredients\s*(?:\n|:)/i,
        /\n#+\s*Directions\b/i,
        /\n#+\s*Instructions\b/i,
        /\n\s*\*\*Instructions\*\*/i,
        /\n\s*Instructions\s*(?:\n|:)/i,
        /\n#+\s*Steps\b/i,
        /\n#+\s*How\s+to\s+Make\b/i,
    ];

    let earliestRecipeStart = -1;
    for (const marker of markers) {
        const match = content.search(marker);
        if (match !== -1 && (earliestRecipeStart === -1 || match < earliestRecipeStart)) {
            earliestRecipeStart = match;
        }
    }

    if (earliestRecipeStart !== -1) {
        // Start 1500 chars before the marker to capture title/description
        const windowStart = Math.max(0, earliestRecipeStart - 1500);
        return content.substring(windowStart, windowStart + maxChars);
    }

    // Fallback: search for stand-alone ingredients word
    const fallbackMatch = content.search(/\bIngredients\b/i);
    if (fallbackMatch !== -1) {
        const windowStart = Math.max(0, fallbackMatch - 1500);
        return content.substring(windowStart, windowStart + maxChars);
    }

    return content.substring(0, maxChars);
}

// Client component that reads search params
function RecipePreviewClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const url = searchParams.get("url");

    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState(0);
    const [recipe, setRecipe] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Auth Modal State
    const [saving, setSaving] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [shareToCommunity, setShareToCommunity] = useState(true);
    const [isPro, setIsPro] = useState(false);

    const loadingSteps = [
        "Analyzing source URL...",
        "Reading recipe structure...",
        "Extracting ingredients...",
        "Formatting instructions...",
        "Adding some magic...",
        "Sprinkling a pinch of salt...",
        "Simmering gently...",
        "Letting the flavors meld...",
        "Almost ready...",
        "Perfecting the details...",
        "Garnishing the final product..."
    ];

    const executeSave = async (user: any, recipeToSave: any) => {
        if (!recipeToSave) return;
        setSaving(true);

        try {
            // 1. Insert into recipes
            const { data: recipeRow, error: recipeError } = await supabase
                .from("recipes")
                .insert({
                    owner_id: user.id,
                    title: recipeToSave.title,
                    description: recipeToSave.description || null,
                    image_url: recipeToSave.imageUrl || recipeToSave.image_url || null,
                    source_url: url || null,
                    source_type: "url",
                    servings: recipeToSave.servings || 4,
                    prep_time: recipeToSave.prepTime || recipeToSave.prep_time || null,
                    cook_time: recipeToSave.cookTime || recipeToSave.cook_time || null,
                    calories: recipeToSave.calories || null,
                    protein: recipeToSave.protein || null,
                    fat: recipeToSave.fat || null,
                    carbs: recipeToSave.carbs || null,
                    sugar: recipeToSave.sugar || null,
                    fiber: recipeToSave.fiber || null,
                    sodium: recipeToSave.sodium || null
                })
                .select()
                .single();

            if (recipeError) throw recipeError;

            // 2. Insert ingredients
            if (recipeToSave.ingredients && recipeToSave.ingredients.length > 0) {
                const ingredientsPayload = recipeToSave.ingredients.map((ing: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: ing.text,
                    quantity: ing.quantity || null,
                    unit: ing.unit || null,
                    name: ing.name || ing.text || "Ingredient",
                    order_index: idx
                }));

                const { error: ingError } = await supabase
                    .from("ingredients")
                    .insert(ingredientsPayload);

                if (ingError) throw ingError;
            }

            // 3. Insert steps
            if (recipeToSave.steps && recipeToSave.steps.length > 0) {
                const stepsPayload = recipeToSave.steps.map((step: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: step.text,
                    step_number: step.stepNumber || step.step_number || (idx + 1)
                }));

                const { error: stepError } = await supabase
                    .from("steps")
                    .insert(stepsPayload);

                if (stepError) throw stepError;
            }

            // Free user app/user metadata check. If false, we auto-share.
            if (!isPro || shareToCommunity) {
                // Call the RPC to share with community
                await supabase.rpc("share_to_community_rpc", {
                    recipe_data: recipeToSave
                });
            }

            // Redirect to the newly created recipe page in dashboard
            router.push(`/dashboard/recipes/${recipeRow.id}?isNew=true`);
        } catch (err: any) {
            console.error("Save error:", err);
            throw err;
        }
    };

    // Auth state listener
    useEffect(() => {
        const getFreshUser = async () => {
            const { data: { session: activeSession } } = await supabase.auth.getSession();
            if (activeSession) {
                const { data: { user: freshUser } } = await supabase.auth.getUser();
                if (freshUser) {
                    activeSession.user = freshUser;
                }
                // Check pro status via RevenueCat server-side API
                try {
                    const proRes = await fetch(`/api/check-pro?user_id=${activeSession.user.id}`);
                    const proData = await proRes.json();
                    setIsPro(proData.isPro);
                } catch (e) {
                    console.warn("Failed to check pro status:", e);
                }
            }
            setSession(activeSession);
        };

        getFreshUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, activeSession) => {
            if (activeSession) {
                const { data: { user: freshUser } } = await supabase.auth.getUser();
                if (freshUser) {
                    activeSession.user = freshUser;
                }
                // Check pro status via RevenueCat server-side API
                try {
                    const proRes = await fetch(`/api/check-pro?user_id=${activeSession.user.id}`);
                    const proData = await proRes.json();
                    setIsPro(proData.isPro);
                } catch (e) {
                    console.warn("Failed to check pro status:", e);
                }
            } else {
                setIsPro(false);
            }
            setSession(activeSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Loading step animator
    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(() => {
            setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [loading]);

    // Perform Extraction
    useEffect(() => {
        if (!url) {
            setError("No URL provided for extraction.");
            setLoading(false);
            return;
        }

        const extract = async () => {
            try {
                const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
                const currentSession = (await supabase.auth.getSession()).data.session;
                if (!currentSession) {
                    const target = `/recipes/preview?url=${encodeURIComponent(url)}`;
                    router.push(`/auth?redirect=${encodeURIComponent(target)}`);
                    return;
                }
                const token = currentSession.access_token;

                const response = await fetch("/api/extract", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ url }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || `Extraction failed with status ${response.status}`);
                }
                
                // Handle response layout (Edge Function returns validated single recipe or list)
                let extracted = data;
                if (data.recipes && Array.isArray(data.recipes)) {
                    extracted = data.recipes[0];
                } else if (Array.isArray(data)) {
                    extracted = data[0];
                }

                if (!extracted || !extracted.title) {
                    throw new Error("We couldn't extract any structured recipe data from this webpage.");
                }

                setRecipe(extracted);
                await executeSave(currentSession.user, extracted);
            } catch (err: any) {
                console.error("Extraction error:", err);
                setError(err.message || "Failed to parse recipe.");
            } finally {
                setLoading(false);
            }
        };

        extract();
    }, [url]);



    if (loading) {
        return <ExtractionLoader />;
    }

    if (error) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-surface-300 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-800 flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-center">Extraction Failed</h3>
                    <p className="text-sm text-surface-400 max-w-md text-center mb-8">
                        {error}
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push("/")}
                            className="px-6 py-3 bg-surface-900 hover:bg-surface-800 border border-surface-800 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                            Go Home
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-accent hover:bg-accent-light text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-20 min-h-screen bg-surface-950 text-surface-300 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-accent mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-surface-400">Saving recipe to your library...</p>
            </main>
            <Footer />
        </>
    );
}

// Main page export wrapping the client component inside a Suspense boundary
export default function PreviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-white">
                <svg className="animate-spin h-8 w-8 text-accent mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-surface-400">Loading preview page...</p>
            </div>
        }>
            <RecipePreviewClient />
        </Suspense>
    );
}

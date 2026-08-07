"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExtractionLoader from "@/components/ExtractionLoader";
import PaywallModal from "@/components/PaywallModal";
import SavesExplanationModal from "@/components/SavesExplanationModal";
function checkIsPro(user: any): boolean {
    if (!user) return false;
    const appMeta = user.app_metadata || {};
    const userMeta = user.user_metadata || {};
    
    return !!(
        appMeta.is_pro ||
        appMeta.isPro ||
        appMeta.is_premium ||
        appMeta.isPremium ||
        appMeta.pro ||
        appMeta.premium ||
        userMeta.is_pro ||
        userMeta.isPro ||
        userMeta.is_premium ||
        userMeta.isPremium ||
        userMeta.pro ||
        userMeta.premium
    );
}

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

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [recipeCollections, setRecipeCollections] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [recipeTags, setRecipeTags] = useState<any[]>([]);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    
    // Import state
    const [importUrl, setImportUrl] = useState("");
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState("");
    const [shareToCommunity, setShareToCommunity] = useState(true);
    const [isProUser, setIsProUser] = useState(false);
    
    // Cookbooks creation state
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [newCollectionColor, setNewCollectionColor] = useState("#FF6B35");

    const PRESET_COLORS = ["#FF6B35", "#FFB627", "#4EA8DE", "#560BAD", "#70E000", "#FF477E"];

    // Add recipes to cookbook state
    const [showAddRecipesModal, setShowAddRecipesModal] = useState(false);
    const [selectedRecipeIdsToAdd, setSelectedRecipeIdsToAdd] = useState<string[]>([]);
    const [addRecipeSearch, setAddRecipeSearch] = useState("");
    const [addRecipeTab, setAddRecipeTab] = useState<"library" | "community">("library");
    const [communityResults, setCommunityResults] = useState<any[]>([]);
    const [communitySearchLoading, setCommunitySearchLoading] = useState(false);

    // Subscription / Paywall / Usage state
    const [showPaywall, setShowPaywall] = useState(false);
    const [managingSubscription, setManagingSubscription] = useState(false);
    const [monthlySavesCount, setMonthlySavesCount] = useState(0);
    const [showSavesModal, setShowSavesModal] = useState(false);

    useEffect(() => {
        const checkAuthAndFetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/auth");
                return;
            }
            const { data: { user: freshUser } } = await supabase.auth.getUser();
            const resolvedUser = freshUser || session.user;
            setUser(resolvedUser);

            // Check pro status via RevenueCat server-side API
            try {
                const proRes = await fetch(`/api/check-pro?user_id=${resolvedUser.id}`);
                const proData = await proRes.json();
                setIsProUser(proData.isPro);
            } catch (e) {
                console.warn("Failed to check pro status:", e);
            }

            await fetchData(session.user.id);
        };

        checkAuthAndFetchData();
    }, [router]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("upgrade") === "true") {
                setShowPaywall(true);
                // Clean up query param so it doesn't pop up again on refresh
                router.replace("/dashboard");
            }
        }
    }, [router]);

    const fetchData = async (userId: string) => {
        setLoading(true);
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const [
                recipesRes,
                collectionsRes,
                junctionsRes,
                tagsRes,
                recipeTagsRes,
                monthlyRes
            ] = await Promise.all([
                supabase.from("recipes").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
                supabase.from("collections").select("*").eq("owner_id", userId).order("name"),
                supabase.from("recipe_collections").select("*").eq("owner_id", userId),
                supabase.from("tags").select("*").eq("owner_id", userId).order("name"),
                supabase.from("recipe_tags").select("*, tags(name)"),
                supabase.from("recipes").select("id", { count: "exact", head: true }).eq("owner_id", userId).gte("created_at", startOfMonth)
            ]);

            if (recipesRes.error) throw recipesRes.error;
            if (collectionsRes.error) throw collectionsRes.error;
            if (junctionsRes.error) throw junctionsRes.error;
            if (tagsRes.error) throw tagsRes.error;
            if (recipeTagsRes.error) throw recipeTagsRes.error;

            setRecipes(recipesRes.data || []);
            setCollections(collectionsRes.data || []);
            setRecipeCollections(junctionsRes.data || []);
            setTags(tagsRes.data || []);
            setRecipeTags(recipeTagsRes.data || []);
            if (monthlyRes.count !== null) {
                setMonthlySavesCount(monthlyRes.count);
            }

        } catch (err: any) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCollectionName.trim();
        if (!trimmed) return;

        try {
            const { data, error } = await supabase
                .from("collections")
                .insert({
                    owner_id: user.id,
                    name: trimmed,
                    color: newCollectionColor,
                    icon_name: "folder"
                })
                .select()
                .single();

            if (error) throw error;

            setCollections([...collections, data]);
            setNewCollectionName("");
            setIsCreatingCollection(false);
        } catch (err: any) {
            console.error("Error creating cookbook:", err);
            alert(err.message || "Failed to create cookbook.");
        }
    };

    const handleDeleteCollection = async (collectionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this cookbook? The recipes inside will not be deleted.")) return;

        try {
            const { error } = await supabase
                .from("collections")
                .delete()
                .eq("id", collectionId)
                .eq("owner_id", user.id);

            if (error) throw error;

            setCollections(collections.filter(c => c.id !== collectionId));
            setRecipeCollections(recipeCollections.filter(rc => rc.collection_id !== collectionId));
            if (selectedCollection === collectionId) {
                setSelectedCollection(null);
            }
        } catch (err: any) {
            console.error("Error deleting cookbook:", err);
            alert(err.message || "Failed to delete cookbook.");
        }
    };

    const handleAddRecipesToCollection = async () => {
        if (!selectedCollection || selectedRecipeIdsToAdd.length === 0) return;

        try {
            const payload = selectedRecipeIdsToAdd.map((recipeId) => ({
                recipe_id: recipeId,
                collection_id: selectedCollection,
                owner_id: user.id
            }));

            const { data, error } = await supabase
                .from("recipe_collections")
                .insert(payload)
                .select();

            if (error) throw error;

            setRecipeCollections([...recipeCollections, ...(data || [])]);
            setSelectedRecipeIdsToAdd([]);
            setAddRecipeSearch("");
            setShowAddRecipesModal(false);
        } catch (err: any) {
            console.error("Error adding recipes to cookbook:", err);
            alert(err.message || "Failed to add recipes to cookbook.");
        }
    };

    const handleCommunitySearch = async (query: string) => {
        setAddRecipeSearch(query);
        if (!query.trim()) {
            setCommunityResults([]);
            return;
        }
        setCommunitySearchLoading(true);
        try {
            const { data, error } = await supabase
                .from("public_recipes")
                .select("*")
                .or(`title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
                .limit(20);
            if (error) throw error;
            setCommunityResults(data || []);
        } catch (err) {
            console.error("Error searching community recipes:", err);
        } finally {
            setCommunitySearchLoading(false);
        }
    };

    const handleSaveCommunityRecipeToCollection = async (publicRecipe: any) => {
        if (!user || !selectedCollection) return;
        if (!isProUser && monthlySavesCount >= 10) {
            setShowSavesModal(true);
            return;
        }
        try {
            // Insert recipe into user's library
            const { data: recipeRow, error: recipeError } = await supabase
                .from("recipes")
                .insert({
                    owner_id: user.id,
                    title: publicRecipe.title,
                    description: publicRecipe.description || null,
                    image_url: publicRecipe.image_url || null,
                    source_url: publicRecipe.source_url || null,
                    source_domain: publicRecipe.source_domain || null,
                    prep_time: publicRecipe.prep_time || null,
                    cook_time: publicRecipe.cook_time || null,
                    servings: publicRecipe.servings || null,
                    calories: publicRecipe.calories || null,
                    protein: publicRecipe.protein || null,
                    fat: publicRecipe.fat || null,
                    carbs: publicRecipe.carbs || null,
                    is_public: false
                })
                .select()
                .single();
            if (recipeError) throw recipeError;

            // Insert ingredients
            if (publicRecipe.ingredients && publicRecipe.ingredients.length > 0) {
                const ingredientsPayload = publicRecipe.ingredients.map((ing: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: ing.text,
                    quantity: ing.quantity || null,
                    unit: ing.unit || null,
                    name: ing.name || ing.text || "Ingredient",
                    order_index: idx
                }));
                await supabase.from("ingredients").insert(ingredientsPayload);
            }

            // Insert steps
            if (publicRecipe.steps && publicRecipe.steps.length > 0) {
                const stepsPayload = publicRecipe.steps.map((step: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: step.text,
                    step_number: step.stepNumber || step.step_number || (idx + 1),
                    order_index: idx
                }));
                await supabase.from("steps").insert(stepsPayload);
            }

            // Insert tags
            if (publicRecipe.tags && publicRecipe.tags.length > 0) {
                for (const tagName of publicRecipe.tags) {
                    const cleanName = tagName.trim().toLowerCase();
                    if (!cleanName) continue;
                    let tagId;
                    const { data: existingTag } = await supabase
                        .from("tags")
                        .select("id")
                        .eq("owner_id", user.id)
                        .eq("name", cleanName)
                        .maybeSingle();
                    if (existingTag?.id) {
                        tagId = existingTag.id;
                    } else {
                        const { data: newTag } = await supabase
                            .from("tags")
                            .insert({ owner_id: user.id, name: cleanName })
                            .select()
                            .single();
                        if (newTag) tagId = newTag.id;
                    }
                    if (tagId) {
                        await supabase.from("recipe_tags").insert({
                            owner_id: user.id,
                            recipe_id: recipeRow.id,
                            tag_id: tagId
                        });
                    }
                }
            }

            // Add to the cookbook
            const { data: junctionData, error: junctionError } = await supabase
                .from("recipe_collections")
                .insert({
                    recipe_id: recipeRow.id,
                    collection_id: selectedCollection,
                    owner_id: user.id
                })
                .select();
            if (junctionError) throw junctionError;

            // Update local state
            setRecipes([...recipes, recipeRow]);
            setRecipeCollections([...recipeCollections, ...(junctionData || [])]);
            setMonthlySavesCount((prev) => prev + 1);
            // Remove from community results so it disappears
            setCommunityResults(communityResults.filter(r => r.id !== publicRecipe.id));
        } catch (err: any) {
            console.error("Error saving community recipe:", err);
            alert(err.message || "Failed to save recipe.");
        }
    };

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setImportError("");
        const trimmedUrl = importUrl.trim();
        if (!trimmedUrl) return;

        if (!isProUser && monthlySavesCount >= 10) {
            setShowSavesModal(true);
            return;
        }

        try {
            new URL(trimmedUrl);
        } catch (_) {
            setImportError("Please enter a valid recipe URL");
            return;
        }

        setImporting(true);
        try {
            const currentSession = (await supabase.auth.getSession()).data.session;
            const token = currentSession?.access_token || "";

            const response = await fetch("/api/extract", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ url: trimmedUrl }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || `Failed to extract recipe (Status: ${response.status})`);
            }
            
            let recipe = data;
            if (data.recipes && Array.isArray(data.recipes)) {
                recipe = data.recipes[0];
            } else if (Array.isArray(data)) {
                recipe = data[0];
            }

            if (!recipe || !recipe.title) {
                throw new Error("Failed to parse structured recipe from URL.");
            }

            // Save directly to user account
            const { data: recipeRow, error: recipeError } = await supabase
                .from("recipes")
                .insert({
                    owner_id: user.id,
                    title: recipe.title,
                    description: recipe.description || null,
                    image_url: recipe.imageUrl || recipe.image_url || null,
                    source_url: trimmedUrl || null,
                    source_type: "url",
                    servings: recipe.servings || 4,
                    prep_time: recipe.prepTime || recipe.prep_time || null,
                    cook_time: recipe.cookTime || recipe.cook_time || null,
                    calories: recipe.calories || null,
                    protein: recipe.protein || null,
                    fat: recipe.fat || null,
                    carbs: recipe.carbs || null,
                    sugar: recipe.sugar || null,
                    fiber: recipe.fiber || null,
                    sodium: recipe.sodium || null
                })
                .select()
                .single();

            if (recipeError) throw recipeError;

            // Ingredients
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                const ingredientsPayload = recipe.ingredients.map((ing: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: ing.text,
                    quantity: ing.quantity || null,
                    unit: ing.unit || null,
                    name: ing.name || ing.text || "Ingredient",
                    order_index: idx
                }));
                await supabase.from("ingredients").insert(ingredientsPayload);
            }

            // Steps
            if (recipe.steps && recipe.steps.length > 0) {
                const stepsPayload = recipe.steps.map((step: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: step.text,
                    step_number: step.stepNumber || step.step_number || (idx + 1)
                }));
                await supabase.from("steps").insert(stepsPayload);
            }

            // Tags
            if (recipe.tags && recipe.tags.length > 0) {
                for (const tag of recipe.tags) {
                    const cleanTag = tag.trim().toLowerCase();
                    if (!cleanTag) continue;

                    // Insert or select tag
                    let { data: existingTag } = await supabase
                        .from("tags")
                        .select("*")
                        .eq("owner_id", user.id)
                        .eq("name", cleanTag)
                        .maybeSingle();

                    if (!existingTag) {
                        const { data: newTag } = await supabase
                            .from("tags")
                            .insert({ owner_id: user.id, name: cleanTag })
                            .select()
                            .single();
                        existingTag = newTag;
                    }

                    if (existingTag) {
                        await supabase
                            .from("recipe_tags")
                            .insert({
                                owner_id: user.id,
                                recipe_id: recipeRow.id,
                                tag_id: existingTag.id
                            });
                    }
                }
            }

            // Community share rules
            const isPro = !!user.app_metadata?.is_pro;
            if (!isPro || shareToCommunity) {
                await supabase.rpc("share_to_community_rpc", {
                    recipe_data: recipe
                });
            }

            // Clear input and redirect
            setMonthlySavesCount((prev) => prev + 1);
            setImportUrl("");
            router.push(`/dashboard/recipes/${recipeRow.id}?isNew=true`);
        } catch (err: any) {
            console.error("Direct import error:", err);
            if (err?.name === "AbortError") {
                setImportError("Extraction timed out. The recipe site may be slow or unresponsive. Please try again.");
            } else {
                setImportError(err.message || "Failed to extract recipe.");
            }
        } finally {
            setImporting(false);
        }
    };

    // Filter recipes based on search, collection, and tag
    const filteredRecipes = recipes.filter((recipe) => {
        // Search query check
        const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (recipe.description && recipe.description.toLowerCase().includes(searchQuery.toLowerCase()));

        // Cookbook filter check
        let matchesCollection = true;
        if (selectedCollection) {
            const recipeIdsInCollection = recipeCollections
                .filter((rc) => rc.collection_id === selectedCollection)
                .map((rc) => rc.recipe_id);
            matchesCollection = recipeIdsInCollection.includes(recipe.id);
        }

        // Tag filter check
        let matchesTag = true;
        if (selectedTag) {
            const recipeIdsWithTag = recipeTags
                .filter((rt) => rt.tag_id === selectedTag)
                .map((rt) => rt.recipe_id);
            matchesTag = recipeIdsWithTag.includes(recipe.id);
        }

        return matchesSearch && matchesCollection && matchesTag;
    });

    // isProUser is now a state variable set from RevenueCat API

    return (
        <>
            {importing && <ExtractionLoader />}
            <Navbar />
            <main className="pt-4 md:pt-24 pb-32 md:pb-20 min-h-screen bg-surface-950 text-surface-300">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div>
                                <span className="text-accent font-semibold text-sm uppercase tracking-wider">My Library</span>
                                <h1 className="text-3xl md:text-4xl font-bold mt-1">Recipe Dashboard</h1>
                            </div>
                            {!isProUser && (
                                <button
                                    type="button"
                                    onClick={() => setShowSavesModal(true)}
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-900 border border-surface-750 hover:border-surface-600 transition-all cursor-pointer shadow-sm group mt-1"
                                >
                                    <span className={`w-2 h-2 rounded-full ${monthlySavesCount >= 10 ? "bg-red-500 animate-pulse" : "bg-accent"}`} />
                                    <span className="text-xs font-bold text-surface-300 group-hover:text-white uppercase tracking-wider">
                                        Saves: {monthlySavesCount}/10 Free
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Import Bar */}
                        <div className="w-full md:max-w-xl">
                            <form onSubmit={handleImportSubmit} className="relative flex flex-col sm:flex-row gap-2 p-1.5 bg-surface-900 border border-surface-800 rounded-2xl glass shadow-lg">
                                <input
                                    type="text"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    placeholder="Paste URL to import..."
                                    className="flex-1 px-4 py-2.5 bg-transparent text-surface-300 font-sans text-sm outline-none placeholder:text-surface-500 rounded-xl"
                                    disabled={importing}
                                />
                                <button
                                    type="submit"
                                    disabled={importing || !importUrl.trim()}
                                    className="px-6 py-2.5 bg-accent hover:bg-accent-light text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {importing ? (
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Import</span>
                                        </>
                                    )}
                                </button>
                            </form>
                            
                            {/* Pro share toggle */}
                            {importUrl.trim() && !importing && (
                                <div className="flex items-center gap-2 mt-2 ml-3">
                                    <input
                                        type="checkbox"
                                        id="shareToggle"
                                        checked={shareToCommunity}
                                        onChange={(e) => setShareToCommunity(e.target.checked)}
                                        disabled={!isProUser}
                                        className="rounded border-surface-800 bg-surface-950 text-accent focus:ring-accent"
                                    />
                                    <label htmlFor="shareToggle" className="text-xs text-surface-400 cursor-pointer select-none">
                                        Share with community {!isProUser && <span className="text-[10px] text-surface-500 font-semibold">(Required on Free Tier)</span>}
                                    </label>
                                </div>
                            )}

                            {importError && (
                                <p className="text-red-400 text-xs mt-2 ml-3 font-medium">{importError}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-4 gap-8">
                        {/* Sidebar filters (1/4 size) */}
                        <div className="space-y-6">
                            {/* Search box */}
                            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 shadow-sm">
                                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-widest mb-2">Search Recipes</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-surface-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Type to filter..."
                                        className="w-full bg-surface-950 border border-surface-800 rounded-xl pl-9 pr-4 py-2 text-sm text-surface-300 focus:outline-none focus:border-accent"
                                    />
                                </div>
                            </div>

                            {/* Cookbooks List */}
                            <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest">Cookbooks</h3>
                                    <button
                                        onClick={() => setIsCreatingCollection(!isCreatingCollection)}
                                        className="w-5 h-5 rounded bg-surface-950 border border-surface-800 flex items-center justify-center text-xs font-bold text-surface-400 hover:text-white hover:border-surface-700 transition-all cursor-pointer"
                                        title="Create New Cookbook"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Create Cookbook Inline Form */}
                                {isCreatingCollection && (
                                    <form onSubmit={handleCreateCollection} className="mb-4 p-3 bg-surface-950/50 border border-surface-800/80 rounded-xl space-y-3">
                                        <div>
                                            <label className="text-[9px] uppercase tracking-wider text-surface-500 font-bold block mb-1">Cookbook Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={newCollectionName}
                                                onChange={(e) => setNewCollectionName(e.target.value)}
                                                placeholder="e.g. Desserts"
                                                className="w-full bg-surface-950 border border-surface-800 rounded-lg px-2.5 py-1.5 text-xs text-surface-300 focus:outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] uppercase tracking-wider text-surface-500 font-bold block mb-1.5">Color Tag</label>
                                            <div className="flex justify-between items-center gap-1">
                                                {PRESET_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setNewCollectionColor(color)}
                                                        className={`w-4 h-4 rounded-full transition-all cursor-pointer ${newCollectionColor === color ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-1.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingCollection(false)}
                                                className="px-2.5 py-1 bg-surface-900 border border-surface-800 hover:bg-surface-800 text-[10px] text-surface-400 hover:text-white rounded-md font-semibold cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-2.5 py-1 bg-accent hover:bg-accent-light text-[10px] text-white rounded-md font-semibold cursor-pointer"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-1">
                                    <button
                                        onClick={() => setSelectedCollection(null)}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${!selectedCollection ? "bg-accent/10 text-accent font-semibold" : "text-surface-300 hover:bg-surface-800 hover:text-white"}`}
                                    >
                                        <span>All Recipes</span>
                                        <span className="text-xs px-2 py-0.5 bg-surface-950/80 rounded-md text-surface-400 font-semibold">{recipes.length}</span>
                                    </button>
                                    {collections.map((coll) => {
                                        const count = recipeCollections.filter((rc) => rc.collection_id === coll.id).length;
                                        return (
                                            <div
                                                key={coll.id}
                                                onClick={() => setSelectedCollection(coll.id)}
                                                className={`group/item w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${selectedCollection === coll.id ? "bg-accent/10 text-accent font-semibold" : "text-surface-300 hover:bg-surface-800 hover:text-white"}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: coll.color }} />
                                                    {coll.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 bg-surface-950/80 rounded-md text-surface-400 font-semibold group-hover/item:hidden">{count}</span>
                                                    <button
                                                        onClick={(e) => handleDeleteCollection(coll.id, e)}
                                                        className="hidden group-hover/item:flex text-red-400 hover:text-red-300 w-5 h-5 rounded hover:bg-red-950/40 items-center justify-center cursor-pointer transition-all text-xs"
                                                        title="Delete Cookbook"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tags List */}
                            {tags.length > 0 && (
                                <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
                                    <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">Popular Tags</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onClick={() => setSelectedTag(null)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${!selectedTag ? "bg-accent border-accent text-white" : "bg-surface-950 border-surface-800 text-surface-400 hover:text-white hover:border-surface-700"}`}
                                        >
                                            All Tags
                                        </button>
                                        {tags.slice(0, 15).map((tag) => {
                                            const count = recipeTags.filter((rt) => rt.tag_id === tag.id).length;
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => setSelectedTag(tag.id)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${selectedTag === tag.id ? "bg-accent border-accent text-white" : "bg-surface-950 border-surface-800 text-surface-400 hover:text-white hover:border-surface-700"}`}
                                                >
                                                    #{tag.name} <span className="text-[10px] text-surface-500">({count})</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Subscription */}
                            <div className={`relative rounded-2xl p-5 border-2 transition-all ${isProUser ? "bg-surface-900 border-surface-800" : "bg-gradient-to-b from-[#FFF5F0] via-surface-900 to-surface-900 border-accent/60 shadow-lg shadow-accent/10"}`}>
                                {isProUser ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Pro Active</span>
                                        </div>
                                        <p className="text-xs text-surface-500 mb-3">Manage your billing, update payment info, or cancel anytime.</p>
                                        <button
                                            onClick={async () => {
                                                setManagingSubscription(true);
                                                try {
                                                    const res = await fetch("/api/customer-portal", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ userId: user.id }),
                                                    });
                                                    const data = await res.json();
                                                    if (data.url) {
                                                        window.location.href = data.url;
                                                    } else {
                                                        alert(data.error || "Could not open billing portal.");
                                                    }
                                                } catch (err) {
                                                    console.error("Portal error:", err);
                                                    alert("Failed to open billing portal.");
                                                } finally {
                                                    setManagingSubscription(false);
                                                }
                                            }}
                                            disabled={managingSubscription}
                                            className="w-full py-2.5 bg-surface-800 hover:bg-surface-750 border border-surface-700 rounded-xl text-xs font-semibold text-surface-300 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {managingSubscription ? (
                                                <svg className="animate-spin h-3.5 w-3.5 text-surface-300" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Manage Subscription
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Top Floating Badge */}
                                        <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-accent text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md shadow-accent/30 flex items-center gap-1">
                                            <span>✨</span> UNLOCK PRO
                                        </div>

                                        {/* Large Bold Headline */}
                                        <div className="mt-1 mb-2">
                                            <h3 className="text-lg font-black text-surface-300 leading-tight">
                                                Upgrade to <span className="text-accent">Pro</span>
                                            </h3>
                                            <p className="text-xs text-surface-450 mt-1 leading-relaxed">
                                                Get full access to all cooking tools:
                                            </p>
                                        </div>

                                        {/* Feature List */}
                                        <ul className="space-y-2 mb-5 text-xs text-surface-300 font-semibold">
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent text-sm font-bold leading-none mt-0.5">✓</span>
                                                <span>Unlimited recipe saves</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent text-sm font-bold leading-none mt-0.5">✓</span>
                                                <span>Keep recipes 100% private</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent text-sm font-bold leading-none mt-0.5">✓</span>
                                                <span>Smart grocery lists & meal plans</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-accent text-sm font-bold leading-none mt-0.5">✓</span>
                                                <span>Calorie & macro tracker</span>
                                            </li>
                                        </ul>

                                        {/* Big Action Button */}
                                        <button
                                            onClick={() => setShowPaywall(true)}
                                            className="w-full py-3 bg-accent hover:bg-accent-light text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Go Pro Now
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Grid list (3/4 size) */}
                        <div className="lg:col-span-3">
                            {/* Cookbook Header & Add Recipe Button */}
                            {!loading && (
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-800/40">
                                    <div className="flex items-center gap-3">
                                        {selectedCollection ? (
                                            <>
                                                <span 
                                                    className="w-3.5 h-3.5 rounded-full" 
                                                    style={{ backgroundColor: collections.find(c => c.id === selectedCollection)?.color || "#FF6B35" }} 
                                                />
                                                <h2 className="text-xl font-bold">
                                                    {collections.find(c => c.id === selectedCollection)?.name}
                                                </h2>
                                                <span className="text-xs px-2.5 py-0.5 bg-surface-900 rounded-md border border-surface-800 text-surface-400 font-semibold">
                                                    {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xl">📚</span>
                                                <h2 className="text-xl font-bold">All Recipes</h2>
                                                <span className="text-xs px-2.5 py-0.5 bg-surface-900 rounded-md border border-surface-800 text-surface-400 font-semibold">
                                                    {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {selectedCollection && (
                                        <button
                                            onClick={() => setShowAddRecipesModal(true)}
                                            className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                        >
                                            <span>+</span> Add Recipes
                                        </button>
                                    )}
                                </div>
                            )}

                            {loading ? (
                                <div className="text-center py-20">
                                    <svg className="animate-spin h-10 w-10 text-accent mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <p className="text-surface-400">Loading your recipes...</p>
                                </div>
                            ) : filteredRecipes.length === 0 ? (
                                <div className="text-center py-20 bg-surface-900 border border-surface-800/80 rounded-3xl p-8 shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">No recipes found</h3>
                                    <p className="text-surface-400 max-w-sm mx-auto mb-6 text-sm">
                                        {searchQuery || selectedCollection || selectedTag
                                            ? "Try adjusting your filters or search query to find what you are looking for."
                                            : "Import your first recipe using the input box above to build your digital library."}
                                    </p>
                                    {(searchQuery || selectedCollection || selectedTag) && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSelectedCollection(null);
                                                setSelectedTag(null);
                                            }}
                                            className="px-5 py-2.5 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-xs font-semibold transition-colors"
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredRecipes.map((recipe) => {
                                        // Find tags for this recipe
                                        const tagsForRecipe = recipeTags
                                            .filter((rt) => rt.recipe_id === recipe.id)
                                            .map((rt) => rt.tags?.name)
                                            .filter(Boolean);

                                        return (
                                            <div
                                                key={recipe.id}
                                                onClick={() => router.push(`/dashboard/recipes/${recipe.id}`)}
                                                className="group cursor-pointer recipe-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border border-surface-800/60"
                                            >
                                                {/* Cover Image */}
                                                <div className="h-44 relative bg-surface-900 overflow-hidden">
                                                    {recipe.image_url ? (
                                                        <img
                                                            src={recipe.image_url}
                                                            alt={recipe.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-4xl">
                                                            🍽️
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 to-transparent" />
                                                </div>

                                                {/* Content */}
                                                <div className="p-4">
                                                    <h2 className="text-base font-bold text-surface-300 group-hover:text-accent transition-colors line-clamp-2 mb-1.5">
                                                        {recipe.title}
                                                    </h2>
                                                    {recipe.description && (
                                                        <p className="text-xs text-surface-400 line-clamp-2 mb-3 leading-relaxed">
                                                            {recipe.description}
                                                        </p>
                                                    )}

                                                    {/* Meta details */}
                                                    <div className="flex items-center gap-3 text-[10px] text-surface-500 font-semibold mb-3">
                                                        {(recipe.prep_time || recipe.prepTime) && (
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {recipe.prep_time || recipe.prepTime}
                                                            </span>
                                                        )}
                                                        {recipe.servings && (
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {recipe.servings} serving{recipe.servings > 1 ? "s" : ""}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Tags list */}
                                                    {tagsForRecipe.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2 border-t border-surface-800/40 pt-2.5">
                                                            {tagsForRecipe.slice(0, 3).map((tagName) => (
                                                                <span key={tagName} className="px-1.5 py-0.5 bg-surface-900 rounded-md text-[9px] text-surface-400 capitalize border border-surface-800">
                                                                    #{tagName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            {/* Add Recipes to Cookbook Modal */}
            {showAddRecipesModal && selectedCollection && (() => {
                const currentCollection = collections.find(c => c.id === selectedCollection);
                const currentCollectionName = currentCollection?.name || "";
                const currentCollectionColor = currentCollection?.color || "#FF6B35";
                const linkedRecipeIds = recipeCollections
                    .filter((rc) => rc.collection_id === selectedCollection)
                    .map((rc) => rc.recipe_id);
                const eligibleRecipes = recipes.filter(r => !linkedRecipeIds.includes(r.id));
                const searchTerm = addRecipeSearch.toLowerCase().trim();
                const displayedRecipes = searchTerm
                    ? eligibleRecipes.filter(r =>
                        r.title.toLowerCase().includes(searchTerm) ||
                        (r.description && r.description.toLowerCase().includes(searchTerm)) ||
                        (r.source_domain && r.source_domain.toLowerCase().includes(searchTerm))
                    )
                    : eligibleRecipes;

                return (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 pb-20 md:pb-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowAddRecipesModal(false);
                                setSelectedRecipeIdsToAdd([]);
                                setAddRecipeSearch("");
                                setAddRecipeTab("library");
                                setCommunityResults([]);
                            }
                        }}
                    >
                        <div className="bg-surface-950 border border-surface-800/80 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[82vh] md:max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="px-6 pt-6 pb-4 border-b border-surface-800/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: currentCollectionColor }} />
                                        <div>
                                            <h3 className="text-lg font-bold text-surface-300">Add to {currentCollectionName}</h3>
                                            <p className="text-xs text-surface-450 mt-0.5">
                                                {eligibleRecipes.length} recipe{eligibleRecipes.length !== 1 ? "s" : ""} available
                                                {selectedRecipeIdsToAdd.length > 0 && (
                                                    <span className="text-accent font-semibold"> · {selectedRecipeIdsToAdd.length} selected</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowAddRecipesModal(false);
                                            setSelectedRecipeIdsToAdd([]);
                                            setAddRecipeSearch("");
                                            setAddRecipeTab("library");
                                            setCommunityResults([]);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-900 hover:bg-surface-800 text-surface-400 hover:text-surface-300 transition-all cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={addRecipeSearch}
                                        onChange={(e) => addRecipeTab === "community" ? handleCommunitySearch(e.target.value) : setAddRecipeSearch(e.target.value)}
                                        placeholder={addRecipeTab === "community" ? "Search community recipes..." : "Search your recipes..."}
                                        className="w-full bg-surface-900 border border-surface-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-surface-300 placeholder-surface-500 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all"
                                    />
                                    {addRecipeSearch && (
                                        <button
                                            onClick={() => { setAddRecipeSearch(""); setCommunityResults([]); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Tab Toggle */}
                                <div className="flex mt-3 bg-surface-900 rounded-xl p-1 border border-surface-800">
                                    <button
                                        onClick={() => { setAddRecipeTab("library"); setAddRecipeSearch(""); setCommunityResults([]); }}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${addRecipeTab === "library" ? "bg-surface-800 text-surface-300 shadow-sm" : "text-surface-500 hover:text-surface-300"}`}
                                    >
                                        My Library
                                    </button>
                                    <button
                                        onClick={() => { setAddRecipeTab("community"); setAddRecipeSearch(""); }}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${addRecipeTab === "community" ? "bg-surface-800 text-surface-300 shadow-sm" : "text-surface-500 hover:text-surface-300"}`}
                                    >
                                        Community
                                    </button>
                                </div>
                            </div>

                            {/* Recipe List */}
                            <div className="flex-1 overflow-y-auto px-3 py-3">
                                {addRecipeTab === "community" ? (
                                    <>
                                        {!addRecipeSearch.trim() ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <span className="text-4xl mb-3">🌍</span>
                                                <p className="text-sm font-semibold text-surface-300 mb-1">Search the community</p>
                                                <p className="text-xs text-surface-500">Type above to find recipes shared by others.</p>
                                            </div>
                                        ) : communitySearchLoading ? (
                                            <div className="flex items-center justify-center py-16">
                                                <svg className="animate-spin h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            </div>
                                        ) : communityResults.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <span className="text-4xl mb-3">🔍</span>
                                                <p className="text-sm font-semibold text-surface-300 mb-1">No results</p>
                                                <p className="text-xs text-surface-500">Try a different search term.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {communityResults.map((cr) => (
                                                    <div
                                                        key={cr.id}
                                                        className="flex items-center gap-4 p-3 rounded-2xl border-2 border-transparent bg-surface-900/40 hover:bg-surface-900/80 hover:border-surface-800 transition-all group"
                                                    >
                                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-950 flex-shrink-0">
                                                            {cr.image_url ? (
                                                                <img src={cr.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-2xl bg-surface-900">🍽️</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-semibold text-surface-300 group-hover:text-accent truncate transition-colors">{cr.title}</h4>
                                                            {cr.description && <p className="text-[11px] text-surface-500 line-clamp-1 mt-0.5">{cr.description}</p>}
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {cr.source_domain && <span className="text-[10px] text-surface-600 truncate max-w-[120px]">{cr.source_domain}</span>}
                                                                {cr.tags && cr.tags.length > 0 && (
                                                                    <div className="flex gap-1">
                                                                        {cr.tags.slice(0, 2).map((t: string) => (
                                                                            <span key={t} className="px-1.5 py-0.5 bg-surface-800/80 rounded text-[9px] text-surface-450 capitalize">{t}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSaveCommunityRecipeToCollection(cr)}
                                                            className="px-3 py-1.5 bg-accent hover:bg-accent-light text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex-shrink-0 shadow-sm"
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {eligibleRecipes.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <span className="text-4xl mb-3">🎉</span>
                                                <p className="text-sm font-semibold text-surface-300 mb-1">All caught up!</p>
                                                <p className="text-xs text-surface-500">Every recipe in your library is already in this cookbook.</p>
                                            </div>
                                        ) : displayedRecipes.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <span className="text-4xl mb-3">🔍</span>
                                                <p className="text-sm font-semibold text-surface-300 mb-1">No matches</p>
                                                <p className="text-xs text-surface-500">Try a different search term.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {displayedRecipes.map((recipeItem) => {
                                                    const isChecked = selectedRecipeIdsToAdd.includes(recipeItem.id);
                                                    const itemTags = recipeTags
                                                        .filter((rt: any) => rt.recipe_id === recipeItem.id)
                                                        .map((rt: any) => {
                                                            const tag = tags.find((t: any) => t.id === rt.tag_id);
                                                            return tag?.name;
                                                        })
                                                        .filter(Boolean);

                                                    return (
                                                        <div
                                                            key={recipeItem.id}
                                                            onClick={() => {
                                                                if (isChecked) {
                                                                    setSelectedRecipeIdsToAdd(selectedRecipeIdsToAdd.filter(id => id !== recipeItem.id));
                                                                } else {
                                                                    setSelectedRecipeIdsToAdd([...selectedRecipeIdsToAdd, recipeItem.id]);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
                                                                isChecked
                                                                    ? "bg-accent/10 border-accent/60 shadow-sm shadow-accent/10"
                                                                    : "bg-surface-900/40 border-transparent hover:bg-surface-900/80 hover:border-surface-800"
                                                            }`}
                                                        >
                                                            {/* Selection Indicator */}
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                                                isChecked
                                                                    ? "bg-accent border-accent"
                                                                    : "border-surface-700 group-hover:border-surface-500"
                                                            }`}>
                                                                {isChecked && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>

                                                            {/* Thumbnail */}
                                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-950 flex-shrink-0">
                                                                {recipeItem.image_url ? (
                                                                    <img src={recipeItem.image_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-2xl bg-surface-900">🍽️</div>
                                                                )}
                                                            </div>

                                                            {/* Recipe Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className={`text-sm font-semibold truncate transition-colors ${isChecked ? "text-accent" : "text-surface-300 group-hover:text-accent"}`}>
                                                                    {recipeItem.title}
                                                                </h4>
                                                                {recipeItem.description && (
                                                                    <p className="text-[11px] text-surface-500 line-clamp-1 mt-0.5">{recipeItem.description}</p>
                                                                )}
                                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                                    {(recipeItem.prep_time || recipeItem.prepTime) && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-surface-500">
                                                                            <svg className="w-3 h-3 text-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            {recipeItem.prep_time || recipeItem.prepTime}
                                                                        </span>
                                                                    )}
                                                                    {recipeItem.source_domain && (
                                                                        <span className="text-[10px] text-surface-600 truncate max-w-[120px]">{recipeItem.source_domain}</span>
                                                                    )}
                                                                    {itemTags.length > 0 && (
                                                                        <div className="flex gap-1">
                                                                            {itemTags.slice(0, 2).map((t: string) => (
                                                                                <span key={t} className="px-1.5 py-0.5 bg-surface-800/80 rounded text-[9px] text-surface-450 capitalize">
                                                                                    {t}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-surface-800/50 bg-surface-950/80">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => {
                                            setShowAddRecipesModal(false);
                                            setSelectedRecipeIdsToAdd([]);
                                            setAddRecipeSearch("");
                                            setAddRecipeTab("library");
                                            setCommunityResults([]);
                                        }}
                                        className="px-5 py-2.5 text-sm font-medium text-surface-400 hover:text-surface-300 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    {addRecipeTab === "library" && (
                                        <button
                                            disabled={selectedRecipeIdsToAdd.length === 0}
                                            onClick={handleAddRecipesToCollection}
                                            className="px-6 py-2.5 bg-accent hover:bg-accent-light text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-accent/20 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add {selectedRecipeIdsToAdd.length > 0 ? `${selectedRecipeIdsToAdd.length} Recipe${selectedRecipeIdsToAdd.length !== 1 ? "s" : ""}` : "Recipes"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Saves Explanation Modal */}
            <SavesExplanationModal
                isOpen={showSavesModal}
                usageCount={monthlySavesCount}
                onClose={() => setShowSavesModal(false)}
                onUpgrade={() => setShowPaywall(true)}
            />

            {/* Paywall Modal */}
            <PaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                userId={user?.id || ""}
                userEmail={user?.email}
            />
        </>
    );
}

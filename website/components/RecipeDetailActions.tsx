"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, PublicRecipe } from "@/lib/supabase";
import SavesExplanationModal from "@/components/SavesExplanationModal";
import PaywallModal from "@/components/PaywallModal";

type RecipeDetailActionsProps = {
    recipe: PublicRecipe;
};

export default function RecipeDetailActions({ recipe }: RecipeDetailActionsProps) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Usage & Modals state
    const [usageCount, setUsageCount] = useState(0);
    const [showSavesModal, setShowSavesModal] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    
    // Save state
    const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

    // Collections mapping states
    const [collections, setCollections] = useState<any[]>([]);
    const [linkedCollections, setLinkedCollections] = useState<string[]>([]);
    const [showCollectionManager, setShowCollectionManager] = useState(false);
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [newCollectionColor, setNewCollectionColor] = useState("#FF6B35");

    const PRESET_COLORS = ["#FF6B35", "#FFB627", "#4EA8DE", "#560BAD", "#70E000", "#FF477E"];

    useEffect(() => {
        const initAuthAndCheckSave = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }
                const activeUser = session.user;
                setUser(activeUser);

                // 1. Check if recipe is already saved (match by title or source_url)
                const query = supabase
                    .from("recipes")
                    .select("id")
                    .eq("owner_id", activeUser.id);
                
                if (recipe.source_url) {
                    query.eq("source_url", recipe.source_url);
                } else {
                    query.eq("title", recipe.title);
                }

                const { data: savedData, error: savedError } = await query.maybeSingle();
                
                if (savedData?.id) {
                    setSavedRecipeId(savedData.id);
                    // Fetch collections and linked collections
                    await fetchCollectionsData(activeUser.id, savedData.id);
                }
            } catch (err) {
                console.error("Error checking saved state:", err);
            } finally {
                setLoading(false);
            }
        };

        initAuthAndCheckSave();
    }, [recipe]);

    const fetchCollectionsData = async (userId: string, recipeId: string) => {
        try {
            const [collectionsRes, linkedRes] = await Promise.all([
                supabase.from("collections").select("*").eq("owner_id", userId).order("name"),
                supabase.from("recipe_collections").select("collection_id").eq("recipe_id", recipeId).eq("owner_id", userId)
            ]);

            if (collectionsRes.data) setCollections(collectionsRes.data);
            if (linkedRes.data) setLinkedCollections(linkedRes.data.map(r => r.collection_id));
        } catch (err) {
            console.error("Error fetching cookbooks data:", err);
        }
    };

    const handleSaveToLibrary = async () => {
        if (!user) {
            const target = `/recipes/${recipe.slug || recipe.id}`;
            router.push(`/auth?redirect=${encodeURIComponent(target)}`);
            return;
        }

        const isPro = !!(user.app_metadata?.is_pro || user.user_metadata?.is_pro);
        if (!isPro) {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { count } = await supabase
                .from("recipes")
                .select("id", { count: "exact", head: true })
                .eq("owner_id", user.id)
                .gte("created_at", startOfMonth);

            const currentCount = count || 0;
            setUsageCount(currentCount);

            if (currentCount >= 5) {
                setShowSavesModal(true);
                return;
            }
        }

        setSaving(true);

        try {
            // 1. Insert recipe
            const { data: recipeRow, error: recipeError } = await supabase
                .from("recipes")
                .insert({
                    owner_id: user.id,
                    title: recipe.title,
                    description: recipe.description || null,
                    image_url: recipe.image_url || null,
                    source_url: recipe.source_url || null,
                    source_domain: recipe.source_domain || null,
                    prep_time: recipe.prep_time || null,
                    cook_time: recipe.cook_time || null,
                    servings: recipe.servings || null,
                    calories: recipe.calories || null,
                    protein: recipe.protein || null,
                    fat: recipe.fat || null,
                    carbs: recipe.carbs || null,
                    sugar: recipe.sugar || null,
                    fiber: recipe.fiber || null,
                    sodium: recipe.sodium || null,
                    is_public: false
                })
                .select()
                .single();

            if (recipeError) throw recipeError;

            // 2. Insert ingredients
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

                const { error: ingError } = await supabase
                    .from("ingredients")
                    .insert(ingredientsPayload);

                if (ingError) throw ingError;
            }

            // 3. Insert steps
            if (recipe.steps && recipe.steps.length > 0) {
                const stepsPayload = recipe.steps.map((step: any, idx: number) => ({
                    owner_id: user.id,
                    recipe_id: recipeRow.id,
                    text: step.text,
                    step_number: step.stepNumber || step.step_number || (idx + 1),
                    order_index: idx
                }));

                const { error: stepError } = await supabase
                    .from("steps")
                    .insert(stepsPayload);

                if (stepError) throw stepError;
            }

            // 4. Insert tags
            if (recipe.tags && recipe.tags.length > 0) {
                for (const tagName of recipe.tags) {
                    const cleanName = tagName.trim().toLowerCase();
                    if (!cleanName) continue;

                    // Find or create tag
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
                        const { data: newTag, error: tagCreateError } = await supabase
                            .from("tags")
                            .insert({ owner_id: user.id, name: cleanName })
                            .select()
                            .single();
                        
                        if (!tagCreateError && newTag) {
                            tagId = newTag.id;
                        }
                    }

                    // Map tag to recipe
                    if (tagId) {
                        await supabase
                            .from("recipe_tags")
                            .insert({
                                owner_id: user.id,
                                recipe_id: recipeRow.id,
                                tag_id: tagId
                            });
                    }
                }
            }

            setSavedRecipeId(recipeRow.id);
            await fetchCollectionsData(user.id, recipeRow.id);
        } catch (err: any) {
            console.error("Error saving recipe:", err);
            alert(err.message || "Failed to save recipe to library.");
        } finally {
            setSaving(false);
        }
    };

    const handleCollectionToggle = async (collectionId: string) => {
        if (!user || !savedRecipeId) return;
        const isLinked = linkedCollections.includes(collectionId);
        
        try {
            if (isLinked) {
                await supabase
                    .from("recipe_collections")
                    .delete()
                    .eq("recipe_id", savedRecipeId)
                    .eq("collection_id", collectionId)
                    .eq("owner_id", user.id);
                setLinkedCollections(linkedCollections.filter(id => id !== collectionId));
            } else {
                await supabase
                    .from("recipe_collections")
                    .insert({
                        recipe_id: savedRecipeId,
                        collection_id: collectionId,
                        owner_id: user.id
                    });
                setLinkedCollections([...linkedCollections, collectionId]);
            }
        } catch (err) {
            console.error("Error toggling cookbook association:", err);
        }
    };

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !savedRecipeId) return;
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
            await handleCollectionToggle(data.id);
            setNewCollectionName("");
            setIsCreatingCollection(false);
        } catch (err: any) {
            console.error("Error creating cookbook:", err);
            alert(err.message || "Failed to create cookbook.");
        }
    };

    if (loading) {
        return (
            <div className="h-10 w-24 bg-surface-900 border border-surface-850 rounded-2xl animate-pulse" />
        );
    }

    // Default "Save in App" CTA for logged-out users
    if (!user) {
        return (
            <a
                href="https://play.google.com/store/apps/details?id=com.deanfieldz.yummy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 bg-accent hover:bg-accent-light rounded-2xl font-semibold transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 w-fit text-sm text-white"
            >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                </svg>
                Save in App
            </a>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative">
            {savedRecipeId ? (
                <>
                    <div className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-950/40 border border-emerald-900/60 text-emerald-450 rounded-2xl font-semibold text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved in Library
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowCollectionManager(!showCollectionManager)}
                            className="w-full sm:w-auto px-5 py-3 bg-surface-900 border border-surface-800 hover:border-surface-700 text-surface-300 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                            📁 Manage Cookbooks
                            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showCollectionManager ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Collections Popover Manager */}
                        {showCollectionManager && (
                            <div className="absolute left-0 mt-2 z-30 w-64 p-4 bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl space-y-3 animate-fadeIn">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Add to Cookbooks</h4>
                                    <button 
                                        onClick={() => setShowCollectionManager(false)}
                                        className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>

                                {isCreatingCollection ? (
                                    <form onSubmit={handleCreateCollection} className="space-y-2">
                                        <input
                                            type="text"
                                            required
                                            value={newCollectionName}
                                            onChange={(e) => setNewCollectionName(e.target.value)}
                                            placeholder="Cookbook name..."
                                            className="w-full bg-surface-950 border border-surface-850 rounded px-2 py-1 text-xs text-surface-300 focus:outline-none focus:border-accent"
                                        />
                                        <div className="flex justify-between items-center gap-1.5 py-0.5">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setNewCollectionColor(color)}
                                                    className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${newCollectionColor === color ? "ring-2 ring-white scale-110" : "opacity-75 hover:opacity-100"}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-1.5 text-[9px] pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingCollection(false)}
                                                className="px-2 py-0.5 bg-surface-850 border border-surface-800 hover:bg-surface-800 text-surface-400 hover:text-surface-300 rounded"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-2 py-0.5 bg-accent hover:bg-accent-light text-white rounded font-bold"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {collections.length === 0 && (
                                                <p className="text-xs text-surface-500 italic py-2">No cookbooks created yet.</p>
                                            )}
                                            {collections.map((coll) => {
                                                const isActive = linkedCollections.includes(coll.id);
                                                return (
                                                    <div 
                                                        key={coll.id}
                                                        onClick={() => handleCollectionToggle(coll.id)}
                                                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${isActive ? "bg-surface-950/60 border-accent/50 text-accent font-medium" : "bg-surface-950/20 border-surface-850 text-surface-400 hover:text-surface-300 hover:bg-surface-950/40"}`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: coll.color }} />
                                                        <span className="text-xs flex-1 truncate">{coll.name}</span>
                                                        {isActive && (
                                                            <span className="text-[10px] text-accent font-bold">✓</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setIsCreatingCollection(true)}
                                            className="w-full text-center py-1.5 border border-dashed border-surface-800 hover:border-surface-700 hover:bg-surface-950/30 text-[10px] text-surface-450 hover:text-surface-300 font-semibold rounded-xl transition-all cursor-pointer"
                                        >
                                            + Create New Cookbook
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <button
                    disabled={saving}
                    onClick={handleSaveToLibrary}
                    className="w-full sm:w-auto px-6 py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-2xl transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Saving...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Save to My Library
                        </>
                    )}
                </button>
            )}

            <SavesExplanationModal
                isOpen={showSavesModal}
                usageCount={usageCount}
                onClose={() => setShowSavesModal(false)}
                onUpgrade={() => setShowPaywall(true)}
            />

            <PaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                userId={user?.id || ""}
                userEmail={user?.email}
            />
        </div>
    );
}

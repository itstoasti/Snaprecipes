"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { scaleIngredientText } from "@/lib/scaleQuantity";

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    // Data State
    const [user, setUser] = useState<any>(null);
    const [recipe, setRecipe] = useState<any>(null);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [steps, setSteps] = useState<any[]>([]);
    
    // Serving Scaler state
    const [servingMultiplier, setServingMultiplier] = useState(1);
    
    // Collections & Tags linking
    const [allCollections, setAllCollections] = useState<any[]>([]);
    const [linkedCollections, setLinkedCollections] = useState<string[]>([]); // collection IDs
    const [allTags, setAllTags] = useState<any[]>([]);
    const [linkedTags, setLinkedTags] = useState<string[]>([]); // tag IDs

    // UI state
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);
    
    // Manage Collections states
    const [showCollectionManager, setShowCollectionManager] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [newCollectionColor, setNewCollectionColor] = useState("#FF6B35");
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);

    const PRESET_COLORS = ["#FF6B35", "#FFB627", "#4EA8DE", "#560BAD", "#70E000", "#FF477E"];

    // Edit form states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [prepTime, setPrepTime] = useState("");
    const [cookTime, setCookTime] = useState("");
    const [servings, setServings] = useState(4);
    const [imageUrl, setImageUrl] = useState("");
    
    // Nutrition states
    const [calories, setCalories] = useState<string>("");
    const [protein, setProtein] = useState<string>("");
    const [fat, setFat] = useState<string>("");
    const [carbs, setCarbs] = useState<string>("");
    const [sugar, setSugar] = useState<string>("");
    const [fiber, setFiber] = useState<string>("");
    const [sodium, setSodium] = useState<string>("");

    // Dynamic list states for edit mode
    const [editIngredients, setEditIngredients] = useState<{ id?: string; text: string; section?: string }[]>([]);
    const [editSteps, setEditSteps] = useState<{ id?: string; text: string }[]>([]);

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/auth");
                return;
            }
            setUser(session.user);
            await fetchRecipeData(session.user.id);
        };
        checkAuthAndLoad();
    }, [id, router]);

    const fetchRecipeData = async (userId: string) => {
        setLoading(true);
        try {
            // 1. Fetch recipe
            const { data: recipeData, error: recipeErr } = await supabase
                .from("recipes")
                .select("*")
                .eq("id", id)
                .eq("owner_id", userId)
                .maybeSingle();

            if (recipeErr) throw recipeErr;
            if (!recipeData) {
                router.push("/dashboard");
                return;
            }

            setRecipe(recipeData);
            
            // Populate form states
            setTitle(recipeData.title || "");
            setDescription(recipeData.description || "");
            setPrepTime(recipeData.prep_time || "");
            setCookTime(recipeData.cook_time || "");
            setServings(recipeData.servings || 4);
            setImageUrl(recipeData.image_url || "");
            setCalories(recipeData.calories != null ? recipeData.calories.toString() : "");
            setProtein(recipeData.protein != null ? recipeData.protein.toString() : "");
            setFat(recipeData.fat != null ? recipeData.fat.toString() : "");
            setCarbs(recipeData.carbs != null ? recipeData.carbs.toString() : "");
            setSugar(recipeData.sugar != null ? recipeData.sugar.toString() : "");
            setFiber(recipeData.fiber != null ? recipeData.fiber.toString() : "");
            setSodium(recipeData.sodium != null ? recipeData.sodium.toString() : "");

            // Fetch remaining details in parallel
            const [
                ingRes,
                stepRes,
                linkedCollRes,
                linkedTagRes,
                allCollRes,
                allTagRes
            ] = await Promise.all([
                supabase.from("ingredients").select("*").eq("recipe_id", id).eq("owner_id", userId).order("order_index", { ascending: true }),
                supabase.from("steps").select("*").eq("recipe_id", id).eq("owner_id", userId).order("step_number", { ascending: true }),
                supabase.from("recipe_collections").select("collection_id").eq("recipe_id", id).eq("owner_id", userId),
                supabase.from("recipe_tags").select("tag_id").eq("recipe_id", id).eq("owner_id", userId),
                supabase.from("collections").select("*").eq("owner_id", userId).order("name"),
                supabase.from("tags").select("*").eq("owner_id", userId).order("name")
            ]);

            if (ingRes.error) throw ingRes.error;
            if (stepRes.error) throw stepRes.error;

            setIngredients(ingRes.data || []);
            setEditIngredients(
                (ingRes.data || []).map((ing) => ({
                    id: ing.id,
                    text: ing.text,
                    section: ing.section || ""
                }))
            );

            setSteps(stepRes.data || []);
            setEditSteps(
                (stepRes.data || []).map((step) => ({
                    id: step.id,
                    text: step.text
                }))
            );

            setLinkedCollections((linkedCollRes.data || []).map((rc) => rc.collection_id));
            setLinkedTags((linkedTagRes.data || []).map((rt) => rt.tag_id));
            setAllCollections(allCollRes.data || []);
            setAllTags(allTagRes.data || []);

        } catch (err: any) {
            console.error("Error fetching recipe details:", err);
            router.push("/dashboard");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRecipeChanges = async () => {
        if (!title.trim()) {
            alert("Recipe title cannot be empty");
            return;
        }

        setSaving(true);
        try {
            // 1. Update recipe row
            const { error: updateErr } = await supabase
                .from("recipes")
                .update({
                    title: title.trim(),
                    description: description.trim() || null,
                    prep_time: prepTime.trim() || null,
                    cook_time: cookTime.trim() || null,
                    servings: servings,
                    image_url: imageUrl.trim() || null,
                    calories: calories ? parseInt(calories) : null,
                    protein: protein ? parseFloat(protein) : null,
                    fat: fat ? parseFloat(fat) : null,
                    carbs: carbs ? parseFloat(carbs) : null,
                    sugar: sugar ? parseFloat(sugar) : null,
                    fiber: fiber ? parseFloat(fiber) : null,
                    sodium: sodium ? parseFloat(sodium) : null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", id)
                .eq("owner_id", user.id);

            if (updateErr) throw updateErr;

            // 2. Refresh ingredients: delete existing ones and write new ones
            const { error: delIngErr } = await supabase
                .from("ingredients")
                .delete()
                .eq("recipe_id", id)
                .eq("owner_id", user.id);

            if (delIngErr) throw delIngErr;

            if (editIngredients.length > 0) {
                const ingredientsPayload = editIngredients
                    .filter((ing) => ing.text.trim())
                    .map((ing, idx) => ({
                        owner_id: user.id,
                        recipe_id: id,
                        text: ing.text.trim(),
                        name: ing.text.trim(), // default
                        order_index: idx,
                        section: ing.section?.trim() || null
                    }));

                const { error: insIngErr } = await supabase
                    .from("ingredients")
                    .insert(ingredientsPayload);

                if (insIngErr) throw insIngErr;
            }

            // 3. Refresh steps: delete existing ones and write new ones
            const { error: delStepErr } = await supabase
                .from("steps")
                .delete()
                .eq("recipe_id", id)
                .eq("owner_id", user.id);

            if (delStepErr) throw delStepErr;

            if (editSteps.length > 0) {
                const stepsPayload = editSteps
                    .filter((step) => step.text.trim())
                    .map((step, idx) => ({
                        owner_id: user.id,
                        recipe_id: id,
                        text: step.text.trim(),
                        step_number: idx + 1
                    }));

                const { error: insStepErr } = await supabase
                    .from("steps")
                    .insert(stepsPayload);

                if (insStepErr) throw insStepErr;
            }

            // Refetch fresh data and toggle edit mode off
            await fetchRecipeData(user.id);
            setEditMode(false);
        } catch (err: any) {
            console.error("Error saving recipe:", err);
            alert(err.message || "Failed to update recipe.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRecipe = async () => {
        setSaving(true);
        try {
            // Delete recipe (cascade deletes junctions, ingredients, and steps)
            const { error } = await supabase
                .from("recipes")
                .delete()
                .eq("id", id)
                .eq("owner_id", user.id);

            if (error) throw error;
            router.push("/dashboard");
        } catch (err: any) {
            console.error("Delete error:", err);
            alert(err.message || "Failed to delete recipe.");
            setSaving(false);
        }
    };

    // Toggle collections
    const handleCollectionToggle = async (collectionId: string) => {
        const isLinked = linkedCollections.includes(collectionId);
        try {
            if (isLinked) {
                // Delete association
                await supabase
                    .from("recipe_collections")
                    .delete()
                    .eq("recipe_id", id)
                    .eq("collection_id", collectionId)
                    .eq("owner_id", user.id);
                setLinkedCollections(linkedCollections.filter((cid) => cid !== collectionId));
            } else {
                // Insert association
                await supabase
                    .from("recipe_collections")
                    .insert({
                        recipe_id: id,
                        collection_id: collectionId,
                        owner_id: user.id
                    });
                setLinkedCollections([...linkedCollections, collectionId]);
            }
        } catch (err) {
            console.error("Error toggling cookbook mapping:", err);
        }
    };



    const handleCreateCollectionDetail = async (e: React.FormEvent) => {
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

            setAllCollections([...allCollections, data]);
            await handleCollectionToggle(data.id);
            
            setNewCollectionName("");
            setIsCreatingCollection(false);
        } catch (err: any) {
            console.error("Error creating cookbook:", err);
            alert(err.message || "Failed to create cookbook.");
        }
    };

    // Dynamic Edit controls for ingredients
    const addIngredientField = () => {
        setEditIngredients([...editIngredients, { text: "", section: "" }]);
    };

    const removeIngredientField = (index: number) => {
        setEditIngredients(editIngredients.filter((_, i) => i !== index));
    };

    const updateIngredientField = (index: number, text: string) => {
        const copy = [...editIngredients];
        copy[index].text = text;
        setEditIngredients(copy);
    };

    const updateIngredientSectionField = (index: number, section: string) => {
        const copy = [...editIngredients];
        copy[index].section = section;
        setEditIngredients(copy);
    };

    // Dynamic Edit controls for steps
    const addStepField = () => {
        setEditSteps([...editSteps, { text: "" }]);
    };

    const removeStepField = (index: number) => {
        setEditSteps(editSteps.filter((_, i) => i !== index));
    };

    const updateStepField = (index: number, text: string) => {
        const copy = [...editSteps];
        copy[index].text = text;
        setEditSteps(copy);
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-surface-300 px-6">
                    <svg className="animate-spin h-8 w-8 text-accent mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-sm text-surface-400">Loading recipe details...</p>
                </main>
            </>
        );
    }

    if (!recipe) return null;

    // Group ingredients for rendering in read-only mode
    const groupedIngredients: { [key: string]: any[] } = {};
    ingredients.forEach((ing) => {
        const section = ing.section || "Ingredients";
        if (!groupedIngredients[section]) {
            groupedIngredients[section] = [];
        }
        groupedIngredients[section].push(ing);
    });

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-20 min-h-screen bg-surface-950 text-surface-300">
                <div className="max-w-5xl mx-auto px-6">
                    {/* Navigation */}
                    <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-surface-900">
                        <Link href="/dashboard" className="text-sm text-surface-400 hover:text-accent transition-colors flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Dashboard
                        </Link>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeletePrompt(true)}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900 hover:text-white transition-colors cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>

                    {editMode ? (
                        /* EDIT MODE INTERFACE */
                        <div className="space-y-8 bg-surface-900/40 p-8 rounded-3xl border border-surface-900 shadow-xl">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                📝 Edit Recipe Details
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Recipe Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-sm focus:outline-none focus:border-accent text-surface-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Cover Image URL</label>
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-sm focus:outline-none focus:border-accent text-surface-300"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-sm focus:outline-none focus:border-accent text-surface-300 h-24"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Prep Time</label>
                                    <input
                                        type="text"
                                        value={prepTime}
                                        onChange={(e) => setPrepTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-sm focus:outline-none focus:border-accent text-surface-300"
                                        placeholder="15 mins"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Cook Time</label>
                                    <input
                                        type="text"
                                        value={cookTime}
                                        onChange={(e) => setCookTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-sm focus:outline-none focus:border-accent text-surface-300"
                                        placeholder="30 mins"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Servings</label>
                                    <input
                                        type="number"
                                        value={servings}
                                        onChange={(e) => setServings(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-surface-950 border border-surface-800 rounded-xl text-sm focus:outline-none focus:border-accent text-surface-300"
                                    />
                                </div>
                            </div>

                            {/* Nutrition Fields */}
                            <div className="bg-surface-950/40 p-6 rounded-2xl border border-surface-800">
                                <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Nutritional Data (per serving)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                                    {[
                                        { label: "Calories (kcal)", val: calories, set: setCalories },
                                        { label: "Protein (g)", val: protein, set: setProtein },
                                        { label: "Fat (g)", val: fat, set: setFat },
                                        { label: "Carbs (g)", val: carbs, set: setCarbs },
                                        { label: "Sugar (g)", val: sugar, set: setSugar },
                                        { label: "Fiber (g)", val: fiber, set: setFiber },
                                        { label: "Sodium (mg)", val: sodium, set: setSodium }
                                    ].map((field) => (
                                        <div key={field.label}>
                                            <label className="block text-[10px] text-surface-400 font-semibold mb-1">{field.label}</label>
                                            <input
                                                type="number"
                                                value={field.val}
                                                onChange={(e) => field.set(e.target.value)}
                                                className="w-full px-3 py-2 bg-surface-950 border border-surface-800 rounded-xl text-xs text-surface-300 focus:outline-none focus:border-accent"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Ingredients Editor */}
                            <div>
                                <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4 pb-2 border-b border-surface-800">Ingredients Editor</h3>
                                <div className="space-y-3">
                                    {editIngredients.map((ing, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <input
                                                type="text"
                                                value={ing.section || ""}
                                                onChange={(e) => updateIngredientSectionField(idx, e.target.value)}
                                                placeholder="Section (e.g. Sauce, optional)"
                                                className="w-1/4 px-3 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-xs text-surface-300 focus:outline-none focus:border-accent"
                                            />
                                            <input
                                                type="text"
                                                value={ing.text}
                                                onChange={(e) => updateIngredientField(idx, e.target.value)}
                                                placeholder="2 cups flour"
                                                className="flex-1 px-4 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-xs text-surface-300 focus:outline-none focus:border-accent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeIngredientField(idx)}
                                                className="p-2.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded-xl hover:bg-red-900 hover:text-white transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addIngredientField}
                                    className="mt-4 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-xs font-semibold rounded-xl text-surface-300 hover:text-white transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Ingredient Line
                                </button>
                            </div>

                            {/* Dynamic Steps Editor */}
                            <div>
                                <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4 pb-2 border-b border-surface-800">Directions Editor</h3>
                                <div className="space-y-3">
                                    {editSteps.map((step, idx) => (
                                        <div key={idx} className="flex gap-3 items-start">
                                            <span className="w-7 h-7 rounded-full bg-surface-950 flex items-center justify-center text-xs font-bold text-accent border border-surface-800 flex-shrink-0 mt-1.5">
                                                {idx + 1}
                                            </span>
                                            <textarea
                                                value={step.text}
                                                onChange={(e) => updateStepField(idx, e.target.value)}
                                                placeholder="Preheat oven to 350 degrees..."
                                                className="flex-1 px-4 py-2.5 bg-surface-950 border border-surface-800 rounded-xl text-xs text-surface-300 focus:outline-none focus:border-accent h-16"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeStepField(idx)}
                                                className="p-2.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded-xl hover:bg-red-900 hover:text-white transition-colors mt-1.5"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addStepField}
                                    className="mt-4 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-xs font-semibold rounded-xl text-surface-300 hover:text-white transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Direction Step
                                </button>
                            </div>

                            {/* Submit Save changes */}
                            <div className="flex gap-4 pt-4 border-t border-surface-800/60 justify-end">
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-6 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-sm font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveRecipeChanges}
                                    disabled={saving}
                                    className="px-6 py-3 bg-accent hover:bg-accent-light text-white font-semibold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-accent/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {saving && (
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    )}
                                    {saving ? "Saving Changes..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* READ ONLY DETAIL VIEW */
                        <>
                            {/* Hero Card */}
                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                {/* image */}
                                <div className="relative rounded-3xl overflow-hidden bg-surface-800 aspect-[4/3] border border-surface-800 shadow-xl">
                                    {recipe.image_url ? (
                                        <img
                                            src={recipe.image_url}
                                            alt={recipe.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl bg-surface-900">
                                            🍽️
                                        </div>
                                    )}
                                </div>

                                {/* meta data info */}
                                <div className="flex flex-col justify-center">
                                    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">{recipe.title}</h1>
                                    {recipe.description && (
                                        <p className="text-surface-400 text-sm mb-6 leading-relaxed">{recipe.description}</p>
                                    )}

                                    <div className="flex flex-wrap gap-3 mb-6">
                                        {recipe.prep_time && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 rounded-xl border border-surface-800 text-xs">
                                                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Prep: {recipe.prep_time}</span>
                                            </div>
                                        )}
                                        {recipe.cook_time && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 rounded-xl border border-surface-800 text-xs">
                                                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                                </svg>
                                                <span>Cook: {recipe.cook_time}</span>
                                            </div>
                                        )}
                                        {recipe.servings && (
                                            <div className="flex items-center gap-3 px-3.5 py-1.5 bg-surface-900 rounded-xl border border-surface-800 text-xs shadow-sm">
                                                <div className="flex items-center gap-1.5 font-semibold text-surface-300">
                                                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span>Servings: <strong className="text-white font-bold">{Math.round(recipe.servings * servingMultiplier)}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-1 pl-2 border-l border-surface-750">
                                                    {[0.5, 1, 2, 4].map((m) => (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            onClick={() => setServingMultiplier(m)}
                                                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                                servingMultiplier === m
                                                                    ? "bg-accent text-white shadow-sm"
                                                                    : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-750"
                                                            }`}
                                                        >
                                                            {m}x
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Source Url Link */}
                                    {recipe.source_url && (
                                        <div className="mb-6">
                                            <a
                                                href={recipe.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-semibold"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                View Original Source
                                            </a>
                                        </div>
                                    )}

                                    {/* Tag Mapping Display */}
                                    <div className="mb-5">
                                        <p className="text-[10px] text-surface-500 uppercase tracking-widest font-bold mb-2">Recipe Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {allTags.filter(tag => linkedTags.includes(tag.id)).length > 0 ? (
                                                allTags.filter(tag => linkedTags.includes(tag.id)).map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-accent/15 border-accent text-accent capitalize"
                                                    >
                                                        #{tag.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-surface-500 italic">No tags linked to this recipe.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Collection Mapping Display & Manager */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] text-surface-500 uppercase tracking-widest font-bold">Cookbooks</p>
                                            <button
                                                onClick={() => {
                                                    setShowCollectionManager(!showCollectionManager);
                                                    setIsCreatingCollection(false);
                                                }}
                                                className="text-[10px] text-accent hover:text-accent-light font-semibold hover:underline cursor-pointer"
                                            >
                                                {showCollectionManager ? "Done" : "Manage"}
                                            </button>
                                        </div>

                                        {showCollectionManager ? (
                                            <div className="p-3 bg-surface-950/60 border border-surface-800 rounded-xl space-y-3">
                                                {isCreatingCollection ? (
                                                    <form onSubmit={handleCreateCollectionDetail} className="space-y-2">
                                                        <div>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={newCollectionName}
                                                                onChange={(e) => setNewCollectionName(e.target.value)}
                                                                placeholder="Cookbook name..."
                                                                className="w-full bg-surface-900 border border-surface-800 rounded px-2 py-1 text-[10px] text-surface-300 focus:outline-none focus:border-accent"
                                                            />
                                                        </div>
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
                                                                className="px-2 py-0.5 bg-surface-900 border border-surface-850 hover:bg-surface-800 text-surface-400 hover:text-white rounded"
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
                                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                                            {allCollections.length === 0 && <span className="text-[10px] text-surface-500">No cookbooks created yet.</span>}
                                                            {allCollections.map((coll) => {
                                                                const isActive = linkedCollections.includes(coll.id);
                                                                return (
                                                                    <button
                                                                        key={coll.id}
                                                                        onClick={() => handleCollectionToggle(coll.id)}
                                                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${isActive ? "bg-surface-900 border-accent/60 text-white" : "bg-surface-900/40 border-surface-800/80 text-surface-450 hover:text-white"}`}
                                                                    >
                                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: coll.color }} />
                                                                        <span>{coll.name}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <button
                                                            onClick={() => setIsCreatingCollection(true)}
                                                            className="w-full text-center py-1 border border-dashed border-surface-800 hover:border-surface-700 hover:bg-surface-900/30 text-[9px] text-surface-450 hover:text-white font-bold rounded transition-all cursor-pointer"
                                                        >
                                                            + Create New Cookbook
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {allCollections.filter(c => linkedCollections.includes(c.id)).length > 0 ? (
                                                    allCollections.filter(c => linkedCollections.includes(c.id)).map((coll) => (
                                                        <span
                                                            key={coll.id}
                                                            className="px-2.5 py-0.5 rounded-xl text-[10px] font-semibold border bg-surface-900 border-surface-800 text-surface-200 flex items-center gap-1.5"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: coll.color }} />
                                                            <span>{coll.name}</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-surface-500 italic">Not in any cookbooks.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Nutrition facts display */}
                            {recipe.calories != null && (
                                <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-8 shadow-sm">
                                    <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                                        <span className="text-xl">📊</span> Nutrition Facts <span className="text-xs text-surface-500 font-normal">(Per Serving)</span>
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                        <div className="p-3 bg-surface-950 rounded-xl">
                                            <p className="text-2xl font-bold">{recipe.calories}</p>
                                            <p className="text-xs text-surface-400 mt-1">Calories</p>
                                        </div>
                                        {recipe.protein != null && (
                                            <div className="p-3 bg-surface-950 rounded-xl">
                                                <p className="text-2xl font-bold text-accent">{recipe.protein}g</p>
                                                <p className="text-xs text-surface-400 mt-1">Protein</p>
                                            </div>
                                        )}
                                        {recipe.fat != null && (
                                            <div className="p-3 bg-surface-950 rounded-xl">
                                                <p className="text-2xl font-bold text-yellow-400">{recipe.fat}g</p>
                                                <p className="text-xs text-surface-400 mt-1">Fat</p>
                                            </div>
                                        )}
                                        {recipe.carbs != null && (
                                            <div className="p-3 bg-surface-950 rounded-xl">
                                                <p className="text-2xl font-bold text-blue-400">{recipe.carbs}g</p>
                                                <p className="text-xs text-surface-400 mt-1">Carbs</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(recipe.sugar != null || recipe.fiber != null || recipe.sodium != null) && (
                                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-surface-800/40 text-center">
                                            {recipe.sugar != null && (
                                                <div>
                                                    <p className="text-sm font-semibold text-surface-300">{recipe.sugar}g</p>
                                                    <p className="text-[10px] text-surface-500">Sugar</p>
                                                </div>
                                            )}
                                            {recipe.fiber != null && (
                                                <div>
                                                    <p className="text-sm font-semibold text-surface-300">{recipe.fiber}g</p>
                                                    <p className="text-[10px] text-surface-500">Fiber</p>
                                                </div>
                                            )}
                                            {recipe.sodium != null && (
                                                <div>
                                                    <p className="text-sm font-semibold text-surface-300">{recipe.sodium}mg</p>
                                                    <p className="text-[10px] text-surface-500">Sodium</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ingredients & Steps Grid */}
                            <div className="grid md:grid-cols-5 gap-8">
                                {/* Ingredients */}
                                <div className="md:col-span-2">
                                    <h3 className="text-xl font-bold mb-4 pb-2 border-b border-surface-800/60 flex items-center gap-2">
                                        <span className="text-accent">🍳</span> Ingredients
                                    </h3>
                                    <div className="space-y-6">
                                        {Object.keys(groupedIngredients).map((section) => (
                                            <div key={section} className="space-y-2">
                                                {section !== "Ingredients" && (
                                                    <h4 className="text-xs font-bold text-accent uppercase tracking-wider mt-4">{section}</h4>
                                                )}
                                                <ul className="space-y-2.5">
                                                    {groupedIngredients[section].map((ing) => (
                                                        <li key={ing.id} className="text-sm text-surface-300 pl-2.5 border-l-2 border-surface-800 leading-relaxed">
                                                            {scaleIngredientText(ing.text, servingMultiplier)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Directions */}
                                <div className="md:col-span-3">
                                    <h3 className="text-xl font-bold mb-4 pb-2 border-b border-surface-800/60 flex items-center gap-2">
                                        <span className="text-accent">📖</span> Directions
                                    </h3>
                                    <ol className="space-y-4">
                                        {steps.map((step, idx) => (
                                            <li key={step.id} className="flex gap-4">
                                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-900 border border-surface-800 flex items-center justify-center text-xs font-bold text-accent">
                                                    {step.step_number || (idx + 1)}
                                                </span>
                                                <p className="text-sm text-surface-300 leading-relaxed pt-0.5">{step.text}</p>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />

            {/* DELETE CONFIRMATION MODAL */}
            {showDeletePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface-900 border border-surface-800 p-6 rounded-3xl max-w-sm w-full mx-4 shadow-xl text-center glass">
                        <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900 flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-bold mb-2">Delete Recipe?</h3>
                        <p className="text-sm text-surface-400 mb-6">
                            Are you sure you want to permanently delete this recipe from your library? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeletePrompt(false)}
                                className="flex-1 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-sm font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteRecipe}
                                disabled={saving}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecipeImage from "@/components/RecipeImage";
import { supabase, PublicRecipe } from "@/lib/supabase";

function BreadcrumbJsonLd() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.snaprecipes.xyz"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Recipes",
                "item": "https://www.snaprecipes.xyz/recipes"
            }
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                const { data, error } = await supabase
                    .from("public_recipes")
                    .select("*")
                    .not("image_url", "is", null)
                    .order("created_at", { ascending: false })
                    .limit(100);

                if (error) throw error;
                setRecipes(data || []);
            } catch (err) {
                console.error("Error fetching recipes:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, []);

    // Filter recipes based on search query
    const filteredRecipes = recipes.filter((recipe) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const matchesTitle = recipe.title?.toLowerCase().includes(query);
        const matchesDesc = recipe.description?.toLowerCase().includes(query);
        const matchesTags = recipe.tags?.some(tag => tag.toLowerCase().includes(query));

        return matchesTitle || matchesDesc || matchesTags;
    });

    return (
        <>
            <BreadcrumbJsonLd />
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen bg-surface-950 text-surface-400">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Community</span>
                        <h1 className="text-4xl md:text-5xl font-black text-surface-300 mt-4 mb-4">Browse Recipes</h1>
                        <p className="text-surface-500 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                            Delicious recipes discovered and extracted by the Snap Recipes community. <span className="text-surface-300 font-bold">No ads, just recipes.</span>
                        </p>

                        {/* Premium Search Bar */}
                        <div className="max-w-md mx-auto relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title, ingredients, or tags..."
                                className="w-full bg-surface-900 border border-surface-700/60 rounded-2xl pl-10 pr-4 py-3 text-sm text-surface-300 placeholder-surface-500 focus:outline-none focus:border-accent transition-colors shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-500 hover:text-accent transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-surface-500">Loading community library...</p>
                        </div>
                    ) : filteredRecipes.length === 0 ? (
                        <div className="text-center py-20 bg-surface-900 rounded-3xl border border-surface-700/60 p-8 shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-surface-950 border border-surface-700/60 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-surface-300 mb-2">No matching recipes found</h3>
                            <p className="text-sm text-surface-500 max-w-sm mx-auto">Try searching for other keywords like "chicken", "vegetarian", or check your spelling.</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRecipes.map((recipe) => (
                                <Link
                                    key={recipe.id}
                                    href={`/recipes/${recipe.slug || recipe.id}`}
                                    className="group bg-surface-900 border border-surface-700/60 rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-lg border-surface-700/60 shadow-sm"
                                >
                                    {/* Image */}
                                    <div className="h-48 relative bg-surface-950 overflow-hidden">
                                        {recipe.image_url ? (
                                            <RecipeImage src={recipe.image_url} alt={recipe.title} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl bg-surface-950">
                                                🍽️
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/20 to-transparent" />
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h2 className="text-base font-bold mb-2 group-hover:text-accent transition-colors line-clamp-2 text-surface-300">
                                            {recipe.title}
                                        </h2>
                                        {recipe.description && (
                                            <p className="text-surface-500 text-xs mb-3 line-clamp-2 leading-relaxed">{recipe.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-surface-500 font-medium">
                                            {recipe.prep_time && (
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Prep {recipe.prep_time}
                                                </span>
                                            )}
                                            {recipe.cook_time && (
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                                                    Cook {recipe.cook_time}
                                                </span>
                                            )}
                                            {recipe.servings && (
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {recipe.servings} servings
                                                </span>
                                            )}
                                        </div>
                                        {recipe.tags && recipe.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3 border-t border-surface-800 pt-3">
                                                {recipe.tags.slice(0, 4).map((tag) => (
                                                    <span key={tag} className="px-2 py-0.5 bg-surface-800 border border-surface-700/60 rounded-md text-[10px] text-surface-500 capitalize font-semibold">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

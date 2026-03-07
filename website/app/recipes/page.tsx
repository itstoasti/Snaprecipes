import { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecipeImage from "@/components/RecipeImage";
import { supabase, PublicRecipe } from "@/lib/supabase";

export const metadata: Metadata = {
    title: "Browse Recipes | No ads, just recipes",
    description: "No life stories, no ads, just recipes. Discover delicious recipes shared by the Snap Recipes community.",
    openGraph: {
        title: "Browse Recipes | No ads, just recipes",
        description: "No life stories, no ads, just recipes. Shared by the Snap Recipes community.",
    },
};

// Revalidate every 60 seconds so new recipes appear without redeploying
export const revalidate = 60;

async function getRecipes(): Promise<PublicRecipe[]> {
    const { data, error } = await supabase
        .from("public_recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching recipes:", error);
        return [];
    }
    return data || [];
}

function BreadcrumbJsonLd() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://snaprecipes.xyz"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Recipes",
                "item": "https://snaprecipes.xyz/recipes"
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

export default async function RecipesPage() {
    const recipes = await getRecipes();

    return (
        <>
            <BreadcrumbJsonLd />
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <span className="text-accent font-semibold text-sm uppercase tracking-wider">Community</span>
                        <h1 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Browse Recipes</h1>
                        <p className="text-surface-400 text-lg max-w-2xl mx-auto">
                            Delicious recipes discovered and extracted by the Snap Recipes community. <span className="text-white font-medium">No life stories, no ads, just recipes.</span>
                        </p>
                    </div>

                    {/* Recipe Grid */}
                    {recipes.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 rounded-full bg-surface-800 flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No recipes yet</h3>
                            <p className="text-surface-400">Be the first to contribute! Download the app and save a recipe.</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recipes.map((recipe) => (
                                <Link
                                    key={recipe.id}
                                    href={`/recipes/${recipe.slug || recipe.id}`}
                                    className="group recipe-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-accent/10"
                                >
                                    {/* Image */}
                                    <div className="h-48 relative bg-surface-800">
                                        {recipe.image_url ? (
                                            <RecipeImage src={recipe.image_url} alt={recipe.title} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-16 h-16 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-surface-900/80 to-transparent" />
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h2 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors line-clamp-2">
                                            {recipe.title}
                                        </h2>
                                        {recipe.description && (
                                            <p className="text-surface-400 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-surface-500">
                                            {recipe.prep_time && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Prep {recipe.prep_time}
                                                </span>
                                            )}
                                            {recipe.cook_time && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                                                    Cook {recipe.cook_time}
                                                </span>
                                            )}
                                            {recipe.servings && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {recipe.servings} servings
                                                </span>
                                            )}
                                        </div>
                                        {recipe.tags && recipe.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {recipe.tags.slice(0, 4).map((tag) => (
                                                    <span key={tag} className="px-2 py-0.5 bg-surface-800 rounded-full text-[11px] text-surface-400 capitalize">
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

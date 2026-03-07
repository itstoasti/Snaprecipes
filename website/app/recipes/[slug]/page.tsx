import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecipeImage from "@/components/RecipeImage";
import { supabase, PublicRecipe } from "@/lib/supabase";

export const revalidate = 60;

type Props = {
    params: Promise<{ slug: string }>;
};

async function getRecipe(slug: string): Promise<PublicRecipe | null> {
    const { data, error } = await supabase
        .from("public_recipes")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error || !data) return null;
    return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const recipe = await getRecipe(slug);
    if (!recipe) return { title: "Recipe Not Found" };

    const description = recipe.description
        || `${recipe.title} - ${recipe.ingredients?.length || 0} ingredients, ${recipe.steps?.length || 0} steps.${recipe.prep_time ? ` Prep: ${recipe.prep_time}.` : ""}${recipe.cook_time ? ` Cook: ${recipe.cook_time}.` : ""}`;

    return {
        title: recipe.title,
        description,
        openGraph: {
            title: `${recipe.title} | Snap Recipes`,
            description,
            type: "article",
            url: `https://snaprecipes.xyz/recipes/${slug}`,
            images: recipe.image_url ? [{ url: recipe.image_url, width: 1200, height: 630, alt: recipe.title }] : undefined,
            siteName: "Snap Recipes",
        },
        twitter: {
            card: "summary_large_image",
            title: `${recipe.title} | Snap Recipes`,
            description,
            images: recipe.image_url ? [recipe.image_url] : undefined,
        },
    };
}

function RecipeJsonLd({ recipe }: { recipe: PublicRecipe }) {
    const slug = recipe.slug || recipe.id;
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: recipe.title,
        description: recipe.description || undefined,
        image: recipe.image_url || undefined,
        recipeIngredient: recipe.ingredients?.map((i) => i.text) || [],
        recipeInstructions: recipe.steps?.map((s) => ({
            "@type": "HowToStep",
            text: s.text,
        })) || [],
        recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
        prepTime: recipe.prep_time ? parseDurationToISO(recipe.prep_time) : undefined,
        cookTime: recipe.cook_time ? parseDurationToISO(recipe.cook_time) : undefined,
        recipeCategory: recipe.tags?.[0] || undefined,
        keywords: recipe.tags?.join(", ") || undefined,
        url: `https://snaprecipes.xyz/recipes/${slug}`,
        publisher: {
            "@type": "Organization",
            name: "Snap Recipes",
            url: "https://snaprecipes.xyz",
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

function BreadcrumbJsonLd({ recipe }: { recipe: PublicRecipe }) {
    const slug = recipe.slug || recipe.id;
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
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": recipe.title,
                "item": `https://snaprecipes.xyz/recipes/${slug}`
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

// Convert "15 min" / "1 hour 30 min" etc. to ISO 8601 duration
function parseDurationToISO(duration: string): string | undefined {
    if (!duration) return undefined;
    const lower = duration.toLowerCase();
    const hours = lower.match(/(\d+)\s*(?:hr|hour)/)?.[1];
    const minutes = lower.match(/(\d+)\s*(?:min|minute)/)?.[1];
    if (!hours && !minutes) return undefined;
    return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}`;
}

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.deanfieldz.yummy";

export default async function RecipePage({ params }: Props) {
    const { slug } = await params;
    const recipe = await getRecipe(slug);
    if (!recipe) notFound();

    return (
        <>
            <RecipeJsonLd recipe={recipe} />
            <BreadcrumbJsonLd recipe={recipe} />
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen">
                <div className="max-w-4xl mx-auto px-6">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-surface-500 mb-8">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/recipes" className="hover:text-white transition-colors">Recipes</Link>
                        <span>/</span>
                        <span className="text-surface-400 truncate max-w-[200px]">{recipe.title}</span>
                    </nav>

                    {/* Hero */}
                    <div className="grid lg:grid-cols-2 gap-8 mb-12">
                        {/* Image */}
                        <div className="relative rounded-3xl overflow-hidden bg-surface-800 aspect-[4/3]">
                            {recipe.image_url ? (
                                <RecipeImage src={recipe.image_url} alt={`${recipe.title} - Step by step recipe instruction`} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-24 h-24 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col justify-center">
                            <h1 className="text-3xl md:text-4xl font-bold mb-4">{recipe.title}</h1>
                            {recipe.description && (
                                <p className="text-surface-400 text-lg mb-6">{recipe.description}</p>
                            )}

                            {/* Meta */}
                            <div className="flex flex-wrap gap-4 mb-6">
                                {recipe.prep_time && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-surface-900 rounded-xl border border-surface-800">
                                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <div>
                                            <p className="text-[11px] text-surface-500 uppercase">Prep</p>
                                            <p className="text-sm font-semibold">{recipe.prep_time}</p>
                                        </div>
                                    </div>
                                )}
                                {recipe.cook_time && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-surface-900 rounded-xl border border-surface-800">
                                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
                                        <div>
                                            <p className="text-[11px] text-surface-500 uppercase">Cook</p>
                                            <p className="text-sm font-semibold">{recipe.cook_time}</p>
                                        </div>
                                    </div>
                                )}
                                {recipe.servings && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-surface-900 rounded-xl border border-surface-800">
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <div>
                                            <p className="text-[11px] text-surface-500 uppercase">Servings</p>
                                            <p className="text-sm font-semibold">{recipe.servings}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {recipe.tags && recipe.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {recipe.tags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 bg-surface-800 rounded-full text-xs text-surface-400 capitalize">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Save in App CTA */}
                            <a
                                href={PLAY_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-6 py-3 bg-accent hover:bg-accent-light rounded-2xl font-semibold transition-all hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 w-fit"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                                </svg>
                                Save in App
                            </a>
                        </div>
                    </div>

                    {/* Ingredients & Steps */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Ingredients */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28 bg-surface-900 rounded-2xl border border-surface-800 p-6">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Ingredients
                                </h2>
                                <ul className="space-y-3">
                                    {recipe.ingredients?.map((ing, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm">
                                            <span className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                                            <span className="text-surface-300">{ing.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                Instructions
                            </h2>
                            <div className="space-y-6">
                                {recipe.steps?.map((step, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                            {step.stepNumber || i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-surface-300 leading-relaxed">{step.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Source attribution */}
                            {recipe.source_domain && (
                                <div className="mt-10 pt-6 border-t border-surface-800">
                                    <p className="text-surface-500 text-sm">
                                        Originally from <span className="text-surface-400">{recipe.source_domain}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-16 text-center p-8 gradient-border rounded-3xl">
                        <h3 className="text-2xl font-bold mb-3">Want to save this recipe?</h3>
                        <p className="text-surface-400 mb-6">Get Snap Recipes to save, organize, and cook with this recipe on your phone.</p>
                        <a
                            href={PLAY_STORE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-accent hover:bg-accent-light rounded-2xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-accent/25 hover:-translate-y-1"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z" />
                            </svg>
                            Download Snap Recipes Free
                        </a>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

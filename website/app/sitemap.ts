import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://snaprecipes.xyz",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://snaprecipes.xyz/recipes",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Dynamic recipe pages — use slug for SEO-friendly URLs
  const { data: recipes } = await supabase
    .from("public_recipes")
    .select("id, slug, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const recipePages: MetadataRoute.Sitemap = (recipes || []).map((recipe) => ({
    url: `https://snaprecipes.xyz/recipes/${recipe.slug || recipe.id}`,
    lastModified: new Date(recipe.created_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...recipePages];
}

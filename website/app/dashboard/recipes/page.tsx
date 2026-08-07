"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useRecipes } from "@/hooks/useDashboardData";
import { Search, Clock, Utensils } from "lucide-react";
import { motion } from "framer-motion";

export default function RecipesPage() {
  const { user, loading: userLoading } = useUser();
  const { recipes, loading: recipesLoading } = useRecipes(user?.id);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecipes = recipes.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDomain = (url: string) => {
    if (!url) return "Recipe";
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return "Recipe";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="sticky top-0 z-10 bg-surface-950/80 backdrop-blur-md pt-4 pb-6 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <h1 className="text-3xl font-display text-surface-300 font-semibold mb-4">My Recipes</h1>
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-surface-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-surface-700 rounded-xl leading-5 bg-surface-900 text-surface-300 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm"
            placeholder="Search your saved recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {(userLoading || recipesLoading) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="recipe-card bg-surface-900 rounded-2xl border border-surface-700 overflow-hidden animate-pulse">
              <div className="w-full aspect-[4/3] bg-surface-800"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-surface-800 rounded w-3/4"></div>
                <div className="h-4 bg-surface-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecipes.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {filteredRecipes.map((recipe, idx) => (
            <motion.div 
              key={recipe.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/dashboard/recipes/${recipe.id}`} className="block group h-full">
                <div className="recipe-card h-full bg-surface-900 rounded-2xl border border-surface-700 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-800 flex items-center justify-center">
                    {recipe.image_url ? (
                      <Image 
                        src={recipe.image_url} 
                        alt={recipe.title || "Recipe image"} 
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-surface-800 to-surface-700 flex flex-col items-center justify-center text-surface-500">
                        <Utensils size={32} className="mb-2 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-display font-medium text-surface-300 text-sm md:text-base line-clamp-2 mb-2 group-hover:text-accent transition-colors">
                      {recipe.title || "Untitled Recipe"}
                    </h3>
                    <div className="mt-auto flex items-center justify-between text-xs text-surface-500 pt-2 border-t border-surface-800/50">
                      <span className="truncate max-w-[60%] font-medium">{getDomain(recipe.url)}</span>
                      {recipe.prep_time && (
                        <span className="flex items-center flex-shrink-0 ml-2">
                          <Clock size={12} className="mr-1" />
                          {recipe.prep_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-20 h-20 bg-surface-900 rounded-full flex items-center justify-center text-surface-500 mb-6 border border-surface-700">
            <Search size={32} />
          </div>
          <h2 className="text-xl font-display font-medium text-surface-300 mb-2">No recipes found</h2>
          <p className="text-surface-400 max-w-md">
            {searchQuery 
              ? `We couldn't find any recipes matching "${searchQuery}". Try a different search term.` 
              : "You haven't saved any recipes yet. Download the mobile app or use the extension to start saving!"}
          </p>
        </div>
      )}
    </div>
  );
}

-- SQL Migration: Tag Existing public_recipes
-- Run this in your Supabase SQL Editor to tag all current community recipes by diet types and core ingredients.

WITH tagged_recipes AS (
  SELECT id,
    ARRAY(
      SELECT DISTINCT tag
      FROM (
        -- Diet Categories
        SELECT 'vegan' AS tag WHERE lower(title) ~ '\bvegan\b' OR ingredients::text ~* '\bvegan\b'
        UNION ALL
        SELECT 'vegetarian' AS tag WHERE lower(title) ~ '\bvegetarian\b' OR ingredients::text ~* '\bvegetarian\b'
        UNION ALL
        SELECT 'keto' AS tag WHERE lower(title) ~ '\bketo\b' OR ingredients::text ~* '\bketo\b'
        UNION ALL
        SELECT 'gluten-free' AS tag WHERE lower(title) ~ '\bgluten[- ]free\b' OR ingredients::text ~* '\bgluten[- ]free\b'
        UNION ALL
        SELECT 'dairy-free' AS tag WHERE lower(title) ~ '\bdairy[- ]free\b' OR ingredients::text ~* '\bdairy[- ]free\b'
        UNION ALL
        SELECT 'low-carb' AS tag WHERE lower(title) ~ '\blow[- ]carb\b' OR ingredients::text ~* '\blow[- ]carb\b'
        UNION ALL
        SELECT 'paleo' AS tag WHERE lower(title) ~ '\bpaleo\b' OR ingredients::text ~* '\bpaleo\b'
        
        -- Core Ingredients
        UNION ALL
        SELECT 'chicken' AS tag WHERE lower(title) ~ '\bchicken\b' OR ingredients::text ~* '\bchicken\b'
        UNION ALL
        SELECT 'beef' AS tag WHERE lower(title) ~ '\bbeef\b' OR lower(title) ~ '\bsteak\b' OR ingredients::text ~* '\bbeef\b' OR ingredients::text ~* '\bsteak\b'
        UNION ALL
        SELECT 'pork' AS tag WHERE lower(title) ~ '\bpork\b' OR ingredients::text ~* '\bpork\b'
        UNION ALL
        SELECT 'salmon' AS tag WHERE lower(title) ~ '\bsalmon\b' OR ingredients::text ~* '\bsalmon\b'
        UNION ALL
        SELECT 'tuna' AS tag WHERE lower(title) ~ '\btuna\b' OR ingredients::text ~* '\btuna\b'
        UNION ALL
        SELECT 'shrimp' AS tag WHERE lower(title) ~ '\bshrimp\b' OR ingredients::text ~* '\bshrimp\b'
        UNION ALL
        SELECT 'tofu' AS tag WHERE lower(title) ~ '\btofu\b' OR ingredients::text ~* '\btofu\b'
        UNION ALL
        SELECT 'pasta' AS tag WHERE lower(title) ~ '\bpasta\b' OR ingredients::text ~* '\bpasta\b'
        UNION ALL
        SELECT 'rice' AS tag WHERE lower(title) ~ '\brice\b' OR ingredients::text ~* '\brice\b'
        UNION ALL
        SELECT 'potatoes' AS tag WHERE lower(title) ~ '\bpotatoes?\b' OR ingredients::text ~* '\bpotatoes?\b'
        
        -- Broad Categories
        UNION ALL
        SELECT 'fish' AS tag WHERE lower(title) ~ '\b(fish|salmon|tuna|cod|halibut|tilapia|trout|snapper|haddock|bass)\b' OR ingredients::text ~* '\b(fish|salmon|tuna|cod|halibut|tilapia|trout|snapper|haddock|bass)\b'
        UNION ALL
        SELECT 'seafood' AS tag WHERE lower(title) ~ '\b(seafood|fish|salmon|tuna|cod|halibut|tilapia|trout|snapper|haddock|bass|shrimp|prawn|crab|lobster|scallop|mussel|clam|oyster|squid|octopus)\b' OR ingredients::text ~* '\b(seafood|fish|salmon|tuna|cod|halibut|tilapia|trout|snapper|haddock|bass|shrimp|prawn|crab|lobster|scallop|mussel|clam|oyster|squid|octopus)\b'
        UNION ALL
        SELECT 'meat' AS tag WHERE lower(title) ~ '\b(meat|beef|steak|pork|lamb|veal|venison)\b' OR ingredients::text ~* '\b(meat|beef|steak|pork|lamb|veal|venison)\b'
        UNION ALL
        SELECT 'poultry' AS tag WHERE lower(title) ~ '\b(poultry|chicken|turkey|duck)\b' OR ingredients::text ~* '\b(poultry|chicken|turkey|duck)\b'
      ) sub
      WHERE tag IS NOT NULL
    ) AS new_tags
  FROM public_recipes
)
UPDATE public_recipes p
SET tags = t.new_tags
FROM tagged_recipes t
WHERE p.id = t.id;

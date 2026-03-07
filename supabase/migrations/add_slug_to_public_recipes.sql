-- Migration: Add slug column to public_recipes
-- Run this in Supabase SQL Editor

-- 1. Add slug column
ALTER TABLE public_recipes ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_public_recipes_slug ON public_recipes (slug);

-- 3. Backfill existing recipes with slugs generated from titles
UPDATE public_recipes
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- 4. Verify the backfill worked
SELECT id, title, slug FROM public_recipes;

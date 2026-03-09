-- Migration to auto-generate slugs for recipes and public_recipes if they are missing

-- 0. Enable the unaccent extension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 1. Function to slugify a string
CREATE OR REPLACE FUNCTION slugify("value" TEXT)
RETURNS TEXT AS $$
  WITH "unaccented" AS (
    SELECT unaccent("value") AS "value"
  ),
  "lowercase" AS (
    SELECT lower("value") AS "value"
    FROM "unaccented"
  ),
  "removed_quotes" AS (
    SELECT regexp_replace("value", '[''"]+', '', 'gi') AS "value"
    FROM "lowercase"
  ),
  "hyphenated" AS (
    SELECT regexp_replace("value", '[^a-z0-9\\-_]+', '-', 'gi') AS "value"
    FROM "removed_quotes"
  ),
  "trimmed" AS (
    SELECT regexp_replace(regexp_replace("value", '\-+$', ''), '^\-', '') AS "value"
    FROM "hyphenated"
  )
  SELECT "value" FROM "trimmed";
$$ LANGUAGE SQL STRICT IMMUTABLE;

-- 2. Add slug column to recipes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='slug') THEN
    ALTER TABLE recipes ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- 3. Trigger function to auto-generate slug
CREATE OR REPLACE FUNCTION generate_recipe_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  random_suffix TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := slugify(NEW.title);
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'recipe';
    END IF;
    -- Always append a random suffix to ensure uniqueness and avoid collisions easily
    random_suffix := substr(md5(random()::text), 1, 6);
    final_slug := base_slug || '-' || random_suffix;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply to recipes table
DROP TRIGGER IF EXISTS trigger_generate_recipe_slug ON recipes;
CREATE TRIGGER trigger_generate_recipe_slug
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION generate_recipe_slug();

-- 5. Apply to public_recipes table
DROP TRIGGER IF EXISTS trigger_generate_public_recipe_slug ON public_recipes;
CREATE TRIGGER trigger_generate_public_recipe_slug
  BEFORE INSERT OR UPDATE ON public_recipes
  FOR EACH ROW
  EXECUTE FUNCTION generate_recipe_slug();

-- 6. Retroactively generate slugs for any missing ones in recipes
UPDATE recipes SET title = title WHERE slug IS NULL;

-- 7. Retroactively generate slugs for any missing ones in public_recipes
UPDATE public_recipes SET title = title WHERE slug IS NULL;

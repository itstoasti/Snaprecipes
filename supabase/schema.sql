-- SnapRecipes Cloud Database Schema (Supabase Postgres)
-- Run this entire script in the Supabase SQL Editor to create tables and RLS policies

-- Enable UUID extension just in case (already enabled by default on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Tables Creation
-- ==========================================

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  servings INTEGER NOT NULL DEFAULT 4,
  prep_time TEXT,
  cook_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF6B35',
  icon_name TEXT NOT NULL DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE recipe_collections (
  owner_id UUID REFERENCES auth.users NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (recipe_id, collection_id)
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE recipe_tags (
  owner_id UUID REFERENCES auth.users NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (recipe_id, tag_id)
);

-- ==========================================
-- 2. Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

-- Recipes Policies
CREATE POLICY "Users can fully manage their own recipes"
ON recipes FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Ingredients Policies
CREATE POLICY "Users can fully manage their own ingredients"
ON ingredients FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Steps Policies
CREATE POLICY "Users can fully manage their own steps"
ON steps FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Collections Policies
CREATE POLICY "Users can fully manage their own collections"
ON collections FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Recipe Collections Junction Policies
CREATE POLICY "Users can fully manage their own recipe_collections"
ON recipe_collections FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Tags Policies
CREATE POLICY "Users can fully manage their own tags"
ON tags FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Recipe Tags Junction Policies
CREATE POLICY "Users can fully manage their own recipe_tags"
ON recipe_tags FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- ==========================================
-- 3. Automatic updated_at trigger for recipes
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. Community Recipe Library (public_recipes)
-- ==========================================
-- Anonymized, shared recipe data contributed by free-tier users.
-- No owner_id — fully decoupled from user accounts.

CREATE TABLE public_recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    servings INT,
    prep_time TEXT,
    cook_time TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]',
    steps JSONB NOT NULL DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    source_url TEXT,
    source_domain TEXT,
    quality_score FLOAT DEFAULT 0,
    save_count INT DEFAULT 1,
    content_hash TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_public_recipes_tags ON public_recipes USING GIN (tags);
CREATE INDEX idx_public_recipes_domain ON public_recipes (source_domain);
CREATE INDEX idx_public_recipes_score ON public_recipes (quality_score DESC);
CREATE INDEX idx_public_recipes_hash ON public_recipes (content_hash);

ALTER TABLE public_recipes ENABLE ROW LEVEL SECURITY;

-- Anyone can read community recipes (for future Discover tab)
CREATE POLICY "Anyone can read public recipes"
ON public_recipes FOR SELECT
TO anon, authenticated
USING (true);

-- Only the service role (Edge Functions / server) can insert/update
CREATE POLICY "Service role can manage public recipes"
ON public_recipes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RPC to increment save_count when a duplicate recipe is extracted
CREATE OR REPLACE FUNCTION increment_save_count(hash TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public_recipes SET save_count = save_count + 1 WHERE content_hash = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

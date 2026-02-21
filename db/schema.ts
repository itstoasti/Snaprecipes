// SnapRecipes — Local SQLite Database Schema
// Uses raw expo-sqlite with typed helpers (no Drizzle to avoid extra dep complexity)

export interface Recipe {
    id: number;
    title: string;
    description: string | null;
    image_url: string | null;
    source_url: string | null;
    source_type: "url" | "camera" | "manual";
    servings: number;
    prep_time: string | null;
    cook_time: string | null;
    created_at: string;
    updated_at: string;
    sync_status: "pending" | "synced" | "conflict";
}

export interface Ingredient {
    id: number;
    recipe_id: number;
    text: string;
    quantity: string | null;
    unit: string | null;
    name: string;
    order_index: number;
    checked: boolean;
}

export interface Step {
    id: number;
    recipe_id: number;
    text: string;
    step_number: number;
    checked: boolean;
}

export interface Collection {
    id: number;
    name: string;
    color: string;
    icon_name: string;
    created_at: string;
}

export interface RecipeCollection {
    recipe_id: number;
    collection_id: number;
}

export interface Tag {
    id: number;
    name: string;
}

export interface RecipeTag {
    recipe_id: number;
    tag_id: number;
}

// Structured recipe data from extraction
export interface ExtractedRecipe {
    title: string;
    description?: string;
    imageUrl?: string;
    servings?: number;
    prepTime?: string;
    cookTime?: string;
    ingredients: {
        text: string;
        quantity?: string;
        unit?: string;
        name: string;
    }[];
    steps: {
        text: string;
        stepNumber: number;
    }[];
    tags?: string[];
}

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    source_url TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual',
    servings INTEGER NOT NULL DEFAULT 4,
    prep_time TEXT,
    cook_time TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    quantity TEXT,
    unit TEXT,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    checked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF6B35',
    icon_name TEXT NOT NULL DEFAULT 'folder',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipe_collections (
    recipe_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, collection_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending'
  );
`;

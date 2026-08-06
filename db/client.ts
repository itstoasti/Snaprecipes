import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";
import { DEFAULT_AISLES } from "@/lib/ingredientCategorizer";

const DB_NAME = "snaprecipes.db";

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    // Return existing database if already initialized
    if (db) return db;

    // If initialization is in progress, wait for it
    if (dbPromise) return dbPromise;

    // Start initialization and store the promise to prevent race conditions
    dbPromise = initializeDatabase();

    try {
        db = await dbPromise;
        return db;
    } catch (error) {
        // Reset on error so next call can retry
        dbPromise = null;
        throw error;
    }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
    const database = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable WAL mode for better perf
    await database.execAsync("PRAGMA journal_mode = WAL;");
    await database.execAsync("PRAGMA foreign_keys = ON;");

    // Create tables
    await database.execAsync(CREATE_TABLES_SQL);

    // Seed default shopping aisles once (idempotent)
    try {
        const aisleCount = await database.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM shopping_categories"
        );
        if (!aisleCount || aisleCount.count === 0) {
            console.log("Seeding default shopping aisles...");
            for (let i = 0; i < DEFAULT_AISLES.length; i++) {
                const aisle = DEFAULT_AISLES[i];
                await database.runAsync(
                    "INSERT OR IGNORE INTO shopping_categories (name, emoji, tint, sort_order, is_builtin) VALUES (?, ?, ?, ?, 1)",
                    [aisle.name, aisle.emoji, aisle.tint, i]
                );
            }
        }
    } catch (error) {
        console.warn("Seeding shopping aisles failed:", error);
    }

    // Run safe auto-migrations for new columns
    try {
        const migrationTables = ['recipes', 'ingredients', 'steps', 'collections', 'tags', 'meal_plans', 'shopping_items'];
        for (const tableName of migrationTables) {
            const tableInfo = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
            if (tableInfo && !tableInfo.some(c => c.name === 'remote_id')) {
                console.log(`Migrating local database: adding remote_id to ${tableName}...`);
                // SQLite ALTER TABLE doesn't support adding UNIQUE columns directly
                await database.execAsync(`ALTER TABLE ${tableName} ADD COLUMN remote_id TEXT;`);
                await database.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_remote_id ON ${tableName}(remote_id);`);
            }
        }
    } catch (error) {
        console.warn("Auto-migration (remote_id) failed:", error);
    }

    // Migration: Add 'section' column to ingredients for grouped ingredient support
    try {
        const ingInfo = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(ingredients)`);
        if (ingInfo && !ingInfo.some(c => c.name === 'section')) {
            console.log('Migrating local database: adding section to ingredients...');
            await database.execAsync(`ALTER TABLE ingredients ADD COLUMN section TEXT;`);
        }
    } catch (error) {
        console.warn("Auto-migration (section) failed:", error);
    }

    // Migration: Add nutrition columns to recipes
    try {
        const recipeInfo = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(recipes)`);
        if (recipeInfo && !recipeInfo.some(c => c.name === 'calories')) {
            console.log('Migrating local database: adding nutrition columns to recipes...');
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN calories INTEGER;`);
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN protein REAL;`);
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN fat REAL;`);
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN carbs REAL;`);
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN sugar REAL;`);
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN fiber REAL;`);
            await database.execAsync(`ALTER TABLE recipes ADD COLUMN sodium REAL;`);
        }
    } catch (error) {
        console.warn("Auto-migration (nutrition) failed:", error);
    }

    return database;
}

export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
        dbPromise = null;
    }
}

export async function clearDatabase(): Promise<void> {
    const database = await getDatabase();
    try {
        await database.execAsync("PRAGMA foreign_keys = OFF;");
        await database.runAsync("DELETE FROM recipe_collections;");
        await database.runAsync("DELETE FROM recipe_tags;");
        await database.runAsync("DELETE FROM ingredients;");
        await database.runAsync("DELETE FROM steps;");
        await database.runAsync("DELETE FROM recipes;");
        await database.runAsync("DELETE FROM collections;");
        await database.runAsync("DELETE FROM tags;");
        await database.runAsync("DELETE FROM sync_queue;");
        await database.execAsync("PRAGMA foreign_keys = ON;");
        console.log("Local database successfully wiped.");
    } catch (e) {
        console.error("Failed to clear database:", e);
        throw e;
    }
}

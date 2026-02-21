import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";

const DB_NAME = "snaprecipes.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;
    db = await SQLite.openDatabaseAsync(DB_NAME);
    // Enable WAL mode for better perf
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
    // Create tables
    await db.execAsync(CREATE_TABLES_SQL);
    return db;
}

export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
    }
}

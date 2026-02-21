import { getDatabase } from "@/db/client";

// Background sync: push local pending changes to Supabase, pull remote updates
// This is a stub architecture — actual sync requires Supabase auth and tables setup

interface SyncQueueItem {
    id: number;
    table_name: string;
    record_id: number;
    operation: string;
    payload: string | null;
    status: string;
}

export async function pushPendingChanges(): Promise<void> {
    const db = await getDatabase();
    const pending = await db.getAllAsync<SyncQueueItem>(
        "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC"
    );

    for (const item of pending) {
        try {
            // TODO: Push to Supabase via supabase.from(item.table_name).upsert/delete
            // For now, mark as synced
            await db.runAsync(
                "UPDATE sync_queue SET status = 'synced' WHERE id = ?",
                [item.id]
            );
            // Also update the recipe's sync_status
            if (item.table_name === "recipes") {
                await db.runAsync(
                    "UPDATE recipes SET sync_status = 'synced' WHERE id = ?",
                    [item.record_id]
                );
            }
        } catch (error) {
            console.error(`Sync failed for queue item ${item.id}:`, error);
        }
    }
}

export async function pullRemoteChanges(): Promise<void> {
    // TODO: Query Supabase for recipes updated after last sync timestamp
    // Merge into local SQLite, handling conflicts
    console.log("Pull sync: not yet implemented");
}

export async function enqueueSync(
    tableName: string,
    recordId: number,
    operation: "insert" | "update" | "delete",
    payload?: Record<string, unknown>
): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO sync_queue (table_name, record_id, operation, payload)
     VALUES (?, ?, ?, ?)`,
        [tableName, recordId, operation, payload ? JSON.stringify(payload) : null]
    );
}

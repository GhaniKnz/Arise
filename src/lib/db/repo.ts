import type { EntityTable } from "dexie";
import { db, type SyncedTable } from "./index";
import type { BaseRow } from "./types";
import { nowIso, uid } from "@/lib/utils/id";

type NewRow<T extends BaseRow> = Omit<T, "id" | "createdAt" | "updatedAt"> & { id?: string };

export function stamp<T extends BaseRow>(data: NewRow<T>): T {
  const now = nowIso();
  return { ...data, id: data.id ?? uid(), createdAt: now, updatedAt: now } as T;
}

export async function insert<T extends BaseRow>(table: EntityTable<T, "id">, data: NewRow<T>): Promise<T> {
  const row = stamp<T>(data);
  await table.add(row as never);
  return row;
}

export async function patch<T extends BaseRow>(table: EntityTable<T, "id">, id: string, changes: Partial<Omit<T, "id" | "createdAt">>): Promise<void> {
  // Dexie's UpdateSpec typing is stricter than needed for flat partial updates.
  await table.update(id as never, { ...changes, updatedAt: nowIso() } as never);
}

/** Deletes rows and records tombstones so the deletion can be synced. */
export async function remove(tableName: SyncedTable, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const table = db.table(tableName);
  const deletedAt = nowIso();
  await db.transaction("rw", [table, db.tombstones], async () => {
    await table.bulkDelete(ids);
    await db.tombstones.bulkPut(ids.map((id) => ({ id, table: tableName, deletedAt })));
  });
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

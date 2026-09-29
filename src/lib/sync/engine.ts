"use client";

import type { Transaction } from "dexie";
import { useSyncExternalStore } from "react";
import { db, SYNCED_TABLES, type SyncedTable } from "@/lib/db";
import type { ProgressPhoto } from "@/lib/db/types";
import { COLUMNS, REMOTE_TABLE } from "./mapping";
import { PHOTO_BUCKET, supabase } from "./supabase";

export type SyncStatus = "off" | "signed-out" | "idle" | "syncing" | "error";

interface SyncState {
  status: SyncStatus;
  email?: string;
  lastSync?: string;
  error?: string;
}

let state: SyncState = { status: "off" };
const listeners = new Set<() => void>();
const setState = (s: Partial<SyncState>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l());
};

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

const REMOTE_TX = "__ariseRemote";
type Row = Record<string, unknown> & { id: string; updatedAt: string };

const kvGet = async <T>(key: string) => (await db.kv.get(key))?.value as T | undefined;
const kvSet = (key: string, value: unknown) => db.kv.put({ key, value });

function stripBlobs(table: SyncedTable, row: Row): Row {
  if (table !== "photos") return row;
  const { blob: _b, thumb: _t, ...rest } = row as Row & { blob?: Blob; thumb?: Blob };
  return rest as Row;
}

async function uploadPhoto(uid: string, p: ProgressPhoto): Promise<string> {
  const sb = supabase()!;
  const path = `${uid}/${p.id}.jpg`;
  const up1 = await sb.storage.from(PHOTO_BUCKET).upload(path, p.blob, { upsert: true, contentType: "image/jpeg" });
  if (up1.error) throw up1.error;
  const up2 = await sb.storage.from(PHOTO_BUCKET).upload(`${uid}/${p.id}_thumb.jpg`, p.thumb, { upsert: true, contentType: "image/jpeg" });
  if (up2.error) throw up2.error;
  return path;
}

async function push(uid: string) {
  const sb = supabase()!;
  const startedAt = new Date().toISOString();
  const since = (await kvGet<string>("sync:lastPush")) ?? "1970-01-01T00:00:00.000Z";

  for (const table of SYNCED_TABLES) {
    const rows = (await db.table(table).where("updatedAt").above(since).toArray()) as Row[];
    if (!rows.length) continue;
    if (table === "photos") {
      for (const r of rows as unknown as ProgressPhoto[]) {
        if (!r.remotePath) {
          r.remotePath = await uploadPhoto(uid, r);
          // Direct update: storing the path must not bump updatedAt.
          await db.photos.update(r.id, { remotePath: r.remotePath });
        }
      }
    }
    for (let i = 0; i < rows.length; i += 200) {
      const payload = rows.slice(i, i + 200).map((r) => ({
        user_id: uid,
        id: r.id,
        ...COLUMNS[table](r),
        data: stripBlobs(table, r),
        updated_at: r.updatedAt,
        deleted_at: null,
      }));
      const { error } = await sb.from(REMOTE_TABLE[table]).upsert(payload, { onConflict: "user_id,id" });
      if (error) throw new Error(`${REMOTE_TABLE[table]} : ${error.message}`);
    }
  }

  const tombstones = await db.tombstones.toArray();
  for (const t of tombstones) {
    const table = t.table as SyncedTable;
    if (!REMOTE_TABLE[table]) continue;
    const { error } = await sb
      .from(REMOTE_TABLE[table])
      .upsert({ user_id: uid, id: t.id, data: { id: t.id, updatedAt: t.deletedAt }, updated_at: t.deletedAt, deleted_at: t.deletedAt }, { onConflict: "user_id,id" });
    if (error) throw new Error(`${REMOTE_TABLE[table]} : ${error.message}`);
    if (table === "photos") await sb.storage.from(PHOTO_BUCKET).remove([`${uid}/${t.id}.jpg`, `${uid}/${t.id}_thumb.jpg`]);
    await db.tombstones.delete(t.id);
  }
  await kvSet("sync:lastPush", startedAt);
}

interface RemoteRow {
  id: string;
  data: Row;
  deleted_at: string | null;
  synced_at: string;
}

async function pull() {
  const sb = supabase()!;
  for (const table of SYNCED_TABLES) {
    let since = (await kvGet<string>(`sync:lastPull:${table}`)) ?? "1970-01-01T00:00:00Z";
    for (;;) {
      const { data, error } = await sb.from(REMOTE_TABLE[table]).select("id,data,deleted_at,synced_at").gt("synced_at", since).order("synced_at", { ascending: true }).limit(500);
      if (error) throw new Error(`${REMOTE_TABLE[table]} : ${error.message}`);
      const rows = (data ?? []) as RemoteRow[];
      if (!rows.length) break;

      const locals = new Map(((await db.table(table).bulkGet(rows.map((r) => r.id))) as (Row | undefined)[]).filter(Boolean).map((r) => [r!.id, r!]));
      const toPut: Row[] = [];
      const toDelete: string[] = [];
      for (const r of rows) {
        const local = locals.get(r.id);
        if (r.deleted_at) {
          if (local && String(local.updatedAt) <= String(r.data.updatedAt ?? "")) toDelete.push(r.id);
          continue;
        }
        if (!local || String(local.updatedAt) < String(r.data.updatedAt)) toPut.push(r.data);
      }
      if (table === "photos") {
        for (const p of toPut as unknown as ProgressPhoto[]) {
          if (!p.remotePath) continue;
          const [full, thumb] = await Promise.all([sb.storage.from(PHOTO_BUCKET).download(p.remotePath), sb.storage.from(PHOTO_BUCKET).download(p.remotePath.replace(/\.jpg$/, "_thumb.jpg"))]);
          if (full.data) p.blob = full.data;
          if (thumb.data) p.thumb = thumb.data;
        }
      }
      const puttable = table === "photos" ? toPut.filter((p) => (p as unknown as ProgressPhoto).blob) : toPut;
      await db.transaction("rw", db.table(table), async (tx) => {
        (tx as unknown as Record<string, boolean>)[REMOTE_TX] = true;
        if (puttable.length) await db.table(table).bulkPut(puttable);
        if (toDelete.length) await db.table(table).bulkDelete(toDelete);
      });
      since = rows.at(-1)!.synced_at;
      await kvSet(`sync:lastPull:${table}`, since);
      if (rows.length < 500) break;
    }
  }
}

let running: Promise<void> | null = null;

export async function syncNow(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  if (running) return running;
  running = (async () => {
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setState({ status: "signed-out", email: undefined });
      return;
    }
    setState({ status: "syncing", email: user.email ?? undefined, error: undefined });
    try {
      await push(user.id);
      await pull();
      setState({ status: "idle", lastSync: new Date().toISOString() });
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

let timer: number | undefined;
export function scheduleSync(delayMs = 8000) {
  if (!supabase() || state.status === "signed-out" || state.status === "off") return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delayMs);
}

let hooksInstalled = false;
/** Schedules a sync after local writes (writes applied by the sync itself are ignored). */
export function installSyncHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const name of SYNCED_TABLES) {
    const t = db.table(name);
    const onWrite = (tx: Transaction) => {
      if (!(tx as unknown as Record<string, boolean>)[REMOTE_TX]) scheduleSync();
    };
    t.hook("creating", (_pk, _obj, tx) => onWrite(tx));
    t.hook("updating", (_mods, _pk, _obj, tx) => onWrite(tx));
    t.hook("deleting", (_pk, _obj, tx) => onWrite(tx));
  }
}

export function initSyncState(signedIn: boolean, email?: string) {
  setState({ status: signedIn ? "idle" : "signed-out", email });
}

/** Forget watermarks so the next sign-in performs a full push/pull. */
export async function resetSyncWatermarks() {
  const keys = (await db.kv.toCollection().primaryKeys()) as string[];
  await db.kv.bulkDelete(keys.filter((k) => k.startsWith("sync:")));
}

/** Deletes every cloud row and photo of the signed-in user (RLS scopes it). */
export async function deleteCloudData() {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return;
  for (const table of SYNCED_TABLES) {
    const { error } = await sb.from(REMOTE_TABLE[table]).delete().eq("user_id", uid);
    if (error) throw new Error(error.message);
  }
  const files = await sb.storage.from(PHOTO_BUCKET).list(uid, { limit: 1000 });
  if (files.data?.length) await sb.storage.from(PHOTO_BUCKET).remove(files.data.map((f) => `${uid}/${f.name}`));
  await resetSyncWatermarks();
}

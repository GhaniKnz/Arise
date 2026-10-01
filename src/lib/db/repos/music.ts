import { db } from "../index";
import { insert, patch } from "../repo";
import type { MusicTrack, TrackCategory } from "../types";
import { CATALOG_BY_ID } from "@/lib/music/catalog";

/** "03 - Dark_Aria (Official).mp3" → "Dark Aria (Official)" */
export function titleFromFileName(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[_]+/g, " ")
      .replace(/^\s*\d{1,3}\s*[-.)]\s*/, "")
      .replace(/\s+/g, " ")
      .trim() || "Piste sans titre"
  );
}

/** Reads the duration of an audio file (undefined when the browser can't decode it). */
function probeDuration(file: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    const done = (v?: number) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = window.setTimeout(() => done(undefined), 5000);
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(Number.isFinite(a.duration) ? a.duration : undefined);
    };
    a.onerror = () => {
      window.clearTimeout(timer);
      done(undefined);
    };
    a.src = url;
  });
}

/** Asks the browser not to evict the stored music when space runs low. */
async function persistStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}

async function nextOrder() {
  return ((await db.tracks.orderBy("order").last())?.order ?? 0) + 1;
}

/**
 * Stores audio files on this device. With `catalogId` the file fills that
 * Solo Leveling slot (replacing a previous file); otherwise each file becomes
 * a track of `category`.
 */
export async function importTracks(files: File[], opts: { category: TrackCategory; catalogId?: string }): Promise<number> {
  await persistStorage();
  let count = 0;
  for (const file of files) {
    if (file.type && !file.type.startsWith("audio/") && !file.type.startsWith("video/")) continue;
    const durationSec = await probeDuration(file);
    const cat = opts.catalogId ? CATALOG_BY_ID.get(opts.catalogId) : undefined;
    if (cat) {
      const existing = await db.tracks.where("catalogId").equals(cat.id).first();
      if (existing) await patch(db.tracks, existing.id, { blob: file, url: undefined, durationSec });
      else await insert<MusicTrack>(db.tracks, { title: cat.title, artist: cat.artist, category: cat.category, catalogId: cat.id, blob: file, durationSec, order: await nextOrder() });
    } else {
      await insert<MusicTrack>(db.tracks, { title: titleFromFileName(file.name), category: opts.category, blob: file, durationSec, order: await nextOrder() });
    }
    count++;
  }
  return count;
}

/** Direct link to an audio file (https://…/track.mp3) you have the right to play. */
export async function addTrackUrl(url: string, title: string, category: TrackCategory, catalogId?: string) {
  const u = new URL(url.trim());
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Lien invalide : il doit commencer par https://");
  const cat = catalogId ? CATALOG_BY_ID.get(catalogId) : undefined;
  if (cat) {
    const existing = await db.tracks.where("catalogId").equals(cat.id).first();
    if (existing) return patch(db.tracks, existing.id, { url: u.toString(), blob: undefined });
  }
  await insert<MusicTrack>(db.tracks, {
    title: cat?.title ?? (title.trim() || titleFromFileName(decodeURIComponent(u.pathname.split("/").pop() ?? ""))),
    artist: cat?.artist,
    category: cat?.category ?? category,
    catalogId: cat?.id,
    url: u.toString(),
    order: await nextOrder(),
  });
}

export async function updateTrack(id: string, changes: Partial<Pick<MusicTrack, "title" | "artist" | "category">>) {
  await patch(db.tracks, id, changes);
}

/** Audio files are local only: no tombstone, nothing to sync. */
export async function deleteTrack(id: string) {
  await db.tracks.delete(id);
}

/** Swaps a track with its neighbour in the library order. */
export async function moveTrack(id: string, dir: -1 | 1) {
  const all = await db.tracks.orderBy("order").toArray();
  const i = all.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  await db.transaction("rw", db.tracks, async () => {
    await db.tracks.update(all[i].id, { order: all[j].order });
    await db.tracks.update(all[j].id, { order: all[i].order });
  });
}

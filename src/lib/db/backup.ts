import { z } from "zod";
import { db, SYNCED_TABLES } from "./index";

const FORMAT = "arise-backup";
const VERSION = 1;

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(bin)}`;
}

function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportData(includePhotos: boolean): Promise<Blob> {
  const tables: Record<string, unknown[]> = {};
  for (const name of SYNCED_TABLES) {
    if (name === "photos") {
      if (!includePhotos) continue;
      const photos = await db.photos.toArray();
      tables.photos = await Promise.all(photos.map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) })));
      continue;
    }
    tables[name] = await db.table(name).toArray();
  }
  const payload = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), tables };
  return new Blob([JSON.stringify(payload)], { type: "application/json" });
}

const BackupSchema = z.object({
  format: z.literal(FORMAT),
  version: z.number().int().min(1).max(VERSION),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export async function importData(file: File, mode: "replace" | "merge"): Promise<{ rows: number }> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error("Fichier illisible : ce n'est pas un JSON valide.");
  }
  const parsed = BackupSchema.safeParse(json);
  if (!parsed.success) throw new Error("Ce fichier n'est pas une sauvegarde ARISE.");
  const known = new Set<string>(SYNCED_TABLES);
  let rows = 0;
  await db.transaction("rw", db.tables, async () => {
    // Imported music files are device-local media, not part of backups: keep them.
    if (mode === "replace") await Promise.all(db.tables.filter((t) => t.name !== "tracks").map((t) => t.clear()));
    for (const [name, list] of Object.entries(parsed.data.tables)) {
      if (!known.has(name)) continue;
      const items = name === "photos" ? list.map((p) => ({ ...p, blob: dataUrlToBlob(String(p.blob)), thumb: dataUrlToBlob(String(p.thumb)) })) : list;
      await db.table(name).bulkPut(items);
      rows += items.length;
    }
  });
  return { rows };
}

function csv(rows: (string | number | undefined | null)[][]): string {
  return rows.map((r) => r.map((c) => (c == null ? "" : /[";\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(";")).join("\n");
}

export async function exportCsv(kind: "food" | "body" | "sets" | "daily"): Promise<Blob> {
  let content = "";
  if (kind === "food") {
    const e = await db.foodEntries.orderBy("date").toArray();
    content = csv([["date", "repas", "aliment", "marque", "grammes", "kcal", "proteines", "glucides", "lipides", "fibres"], ...e.map((x) => [x.date, x.meal, x.name, x.brand, x.grams, x.kcal, x.protein, x.carbs, x.fat, x.fiber])]);
  } else if (kind === "body") {
    const m = await db.bodyMetrics.orderBy("date").toArray();
    content = csv([["date", "poids", "masse_grasse_pct", "masse_musculaire", "taille", "poitrine", "bras", "cuisse", "hanches"], ...m.map((x) => [x.date, x.weightKg, x.bodyFatPct, x.muscleKg, x.waistCm, x.chestCm, x.armCm, x.thighCm, x.hipsCm])]);
  } else if (kind === "sets") {
    const s = await db.sets.orderBy("date").toArray();
    content = csv([["date", "seance", "exercice", "ordre", "charge_kg", "reps", "rpe", "echauffement", "validee"], ...s.map((x) => [x.date, x.sessionId, x.exerciseId, x.order + 1, x.weightKg, x.reps, x.rpe, x.warmup ? 1 : 0, x.done ? 1 : 0])]);
  } else {
    const d = await db.dailyLogs.orderBy("date").toArray();
    content = csv([["date", "pas", "eau_ml", "sommeil_min", "qualite_sommeil", "energie"], ...d.map((x) => [x.date, x.steps, x.waterMl, x.sleepMin, x.sleepQuality, x.energy])]);
  }
  return new Blob(["﻿", content], { type: "text/csv;charset=utf-8" });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Deletes training/nutrition/body history but keeps profile, routines and custom foods. */
export async function deleteHistory() {
  await db.transaction("rw", db.tables, async () => {
    for (const t of ["foodEntries", "sessions", "sets", "cardio", "bodyMetrics", "dailyLogs", "reports", "coachMessages", "photos", "cycles", "comparisons"]) await db.table(t).clear();
    await db.kv.clear();
  });
}

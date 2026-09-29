import { db } from "../index";
import { insert, patch, remove } from "../repo";
import type { BodyMetric, DailyLog, Pose, ProgressPhoto } from "../types";
import type { DayKey } from "@/lib/utils/date";

type MetricFields = Omit<BodyMetric, "id" | "createdAt" | "updatedAt" | "date">;
type LogFields = Omit<DailyLog, "id" | "createdAt" | "updatedAt" | "date">;

/** One body-metric row per day; fields are merged. `undefined` keeps, `null` clears. */
export async function upsertMetrics(date: DayKey, fields: { [K in keyof MetricFields]?: MetricFields[K] | null }) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v ?? undefined]));
  const existing = await db.bodyMetrics.where("date").equals(date).first();
  if (existing) await patch(db.bodyMetrics, existing.id, clean);
  else await insert<BodyMetric>(db.bodyMetrics, { date, ...clean });
}

export async function deleteMetrics(date: DayKey) {
  const existing = await db.bodyMetrics.where("date").equals(date).first();
  if (existing) await remove("bodyMetrics", [existing.id]);
}

/** One daily-log row per day; fields are merged. */
export async function upsertDailyLog(date: DayKey, fields: { [K in keyof LogFields]?: LogFields[K] | null }) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v ?? undefined]));
  const existing = await db.dailyLogs.where("date").equals(date).first();
  if (existing) await patch(db.dailyLogs, existing.id, clean);
  else await insert<DailyLog>(db.dailyLogs, { date, ...clean });
}

export async function addWater(date: DayKey, ml: number) {
  const existing = await db.dailyLogs.where("date").equals(date).first();
  const next = Math.max(0, (existing?.waterMl ?? 0) + ml);
  await upsertDailyLog(date, { waterMl: next });
  return next;
}

/* ─────────────── Photos ─────────────── */

async function resizeImage(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible"))), "image/jpeg", quality));
}

export async function addPhoto(opts: { date: DayKey; pose: Pose; file: Blob; weightKg?: number; waistCm?: number; bodyFatPct?: number; note?: string }) {
  const [blob, thumb] = await Promise.all([resizeImage(opts.file, 1440, 0.85), resizeImage(opts.file, 360, 0.75)]);
  return insert<ProgressPhoto>(db.photos, {
    date: opts.date,
    pose: opts.pose,
    blob,
    thumb,
    weightKg: opts.weightKg,
    waistCm: opts.waistCm,
    bodyFatPct: opts.bodyFatPct,
    note: opts.note,
  });
}

export const deletePhoto = (id: string) => remove("photos", [id]);

export async function deleteAllPhotos() {
  const ids = (await db.photos.toCollection().primaryKeys()) as string[];
  await remove("photos", ids);
}

export { resizeImage };

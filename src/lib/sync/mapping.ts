import type { SyncedTable } from "@/lib/db";

/** Postgres table name for each local table. */
export const REMOTE_TABLE: Record<SyncedTable, string> = {
  profile: "profiles",
  foods: "foods",
  favorites: "favorites",
  foodEntries: "food_entries",
  meals: "meals",
  recipes: "recipes",
  customExercises: "custom_exercises",
  routines: "routines",
  sessions: "sessions",
  sets: "workout_sets",
  cardio: "cardio_sessions",
  bodyMetrics: "body_measurements",
  photos: "progress_photos",
  dailyLogs: "daily_logs",
  reports: "weekly_reports",
  coachMessages: "coach_messages",
};

type Row = Record<string, unknown>;
const pick = (r: Row, map: Record<string, string>): Row => Object.fromEntries(Object.entries(map).map(([remote, local]) => [remote, r[local] ?? null]));

/**
 * Typed, queryable columns per table (the full row is always stored in `data`).
 * Keeping the payload in jsonb makes sync resilient to new local fields.
 */
export const COLUMNS: Record<SyncedTable, (r: Row) => Row> = {
  profile: (r) => pick(r, { name: "name", goal: "goal", start_weight_kg: "startWeightKg", target_weight_kg: "targetWeightKg" }),
  foods: (r) => pick(r, { name: "name", brand: "brand", barcode: "barcode", source: "source" }),
  favorites: (r) => pick(r, { food_id: "foodId" }),
  foodEntries: (r) => pick(r, { date: "date", meal: "meal", food_id: "foodId", name: "name", grams: "grams", kcal: "kcal", protein: "protein", carbs: "carbs", fat: "fat" }),
  meals: (r) => pick(r, { name: "name" }),
  recipes: (r) => pick(r, { name: "name", servings: "servings" }),
  customExercises: (r) => pick(r, { name: "name", primary_muscle: "primary", equipment: "equipment" }),
  routines: (r) => pick(r, { name: "name", type: "type" }),
  sessions: (r) => pick(r, { date: "date", routine_id: "routineId", name: "name", type: "type", status: "status", started_at: "startedAt", ended_at: "endedAt" }),
  sets: (r) => pick(r, { session_id: "sessionId", exercise_id: "exerciseId", date: "date", set_order: "order", weight_kg: "weightKg", reps: "reps", rpe: "rpe", warmup: "warmup", done: "done" }),
  cardio: (r) => pick(r, { date: "date", type: "type", duration_min: "durationMin", distance_km: "distanceKm", kcal: "kcal" }),
  bodyMetrics: (r) => pick(r, { date: "date", weight_kg: "weightKg", body_fat_pct: "bodyFatPct", muscle_kg: "muscleKg", waist_cm: "waistCm" }),
  photos: (r) => pick(r, { date: "date", pose: "pose", storage_path: "remotePath" }),
  dailyLogs: (r) => pick(r, { date: "date", steps: "steps", water_ml: "waterMl", sleep_min: "sleepMin", energy: "energy" }),
  reports: (r) => pick(r, { week_start: "weekStart" }),
  coachMessages: (r) => pick(r, { role: "role" }),
};

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "./index";
import type { Exercise, FoodEntry, FoodItem, Session } from "./types";
import { EXERCISES, EXERCISE_BY_ID } from "@/lib/data/exercises";
import { FOOD_BY_ID } from "@/lib/data/foods";
import { todayKey, type DayKey } from "@/lib/utils/date";

/** Current day key, refreshed when the date changes (e.g. after midnight). */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const id = window.setInterval(() => {
      const k = todayKey();
      setToday((prev) => (prev === k ? prev : k));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}

export function useProfile() {
  return useLiveQuery(async () => (await db.profile.get("me")) ?? null, []);
}

export function useDayEntries(date: DayKey) {
  return useLiveQuery(() => db.foodEntries.where("date").equals(date).sortBy("createdAt"), [date]);
}

export function useDailyLog(date: DayKey) {
  return useLiveQuery(async () => (await db.dailyLogs.where("date").equals(date).first()) ?? null, [date]);
}

export function useMetrics() {
  return useLiveQuery(() => db.bodyMetrics.orderBy("date").toArray(), []);
}

export function useRoutines() {
  return useLiveQuery(() => db.routines.orderBy("name").toArray(), []);
}

export function useRoutine(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.routines.get(id)) ?? null) : null), [id]);
}

export function useActiveSession() {
  return useLiveQuery(async () => (await db.sessions.where("status").equals("active").first()) ?? null, []);
}

export function useSession(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.sessions.get(id)) ?? null) : null), [id]);
}

export function useSessionSets(sessionId: string | undefined) {
  return useLiveQuery(async () => (sessionId ? db.sets.where("sessionId").equals(sessionId).toArray() : []), [sessionId]);
}

export function useDoneSessions() {
  return useLiveQuery(async () => {
    const all = await db.sessions.where("status").equals("done").toArray();
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, []);
}

export function useExerciseSets(exerciseId: string | undefined) {
  return useLiveQuery(async () => {
    if (!exerciseId) return { sets: [], sessions: new Map<string, Session>() };
    const sets = (await db.sets.where("exerciseId").equals(exerciseId).toArray()).filter((s) => s.done);
    const ids = [...new Set(sets.map((s) => s.sessionId))];
    const sessions = (await db.sessions.bulkGet(ids)).filter((s): s is Session => !!s && s.status === "done");
    const map = new Map(sessions.map((s) => [s.id, s]));
    return { sets: sets.filter((s) => map.has(s.sessionId)), sessions: map };
  }, [exerciseId]);
}

export function useCustomExercises() {
  return useLiveQuery(() => db.customExercises.toArray(), []);
}

/**
 * Built-in library merged with the user's exercises. A user row with a
 * built-in id is a personal version of that exercise and replaces it.
 */
export function useExerciseLibrary(): { all: Exercise[]; byId: (id: string) => Exercise | undefined; customized: (id: string) => boolean } {
  const custom = useCustomExercises();
  return useMemo(() => {
    const customMap = new Map((custom ?? []).map((c) => [c.id, c as Exercise]));
    const all = customMap.size ? [...EXERCISES.map((e) => customMap.get(e.id) ?? e), ...(custom ?? []).filter((c) => !EXERCISE_BY_ID.has(c.id))] : EXERCISES;
    return { all, byId: (id: string) => customMap.get(id) ?? EXERCISE_BY_ID.get(id), customized: (id: string) => customMap.has(id) };
  }, [custom]);
}

export function useCardio(date?: DayKey) {
  return useLiveQuery(() => (date ? db.cardio.where("date").equals(date).toArray() : db.cardio.orderBy("date").reverse().toArray()), [date]);
}

export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy("date").reverse().toArray(), []);
}

export function useComparisons() {
  return useLiveQuery(() => db.comparisons.orderBy("updatedAt").reverse().toArray(), []);
}

export function useCycles() {
  return useLiveQuery(() => db.cycles.orderBy("startDate").toArray(), []);
}

export function useCustomFoods() {
  return useLiveQuery(() => db.foods.toArray(), []);
}

export function useFavorites() {
  return useLiveQuery(async () => {
    const favs = await db.favorites.toArray();
    const ids = favs.map((f) => f.foodId);
    const stored = await db.foods.bulkGet(ids.filter((id) => !id.startsWith("b:")));
    const storedMap = new Map(stored.filter(Boolean).map((f) => [f!.id, f as FoodItem]));
    return ids.map((id) => FOOD_BY_ID.get(id) ?? storedMap.get(id)).filter((f): f is FoodItem => !!f);
  }, []);
}

export function useFavoriteIds() {
  return useLiveQuery(async () => new Set((await db.favorites.toArray()).map((f) => f.foodId)), []);
}

/** Distinct foods from the most recent entries (newest first). */
export function useRecentFoods(limit = 20) {
  return useLiveQuery(async () => {
    const recent = await db.foodEntries.orderBy("updatedAt").reverse().limit(200).toArray();
    const seen = new Set<string>();
    const out: { food: FoodItem | null; entry: FoodEntry }[] = [];
    for (const e of recent) {
      const key = e.foodId ?? `name:${e.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let food: FoodItem | null = null;
      if (e.foodId) food = FOOD_BY_ID.get(e.foodId) ?? ((await db.foods.get(e.foodId)) as FoodItem | undefined) ?? null;
      out.push({ food, entry: e });
      if (out.length >= limit) break;
    }
    return out;
  }, [limit]);
}

export function useMeals() {
  return useLiveQuery(() => db.meals.orderBy("name").toArray(), []);
}

export function useRecipes() {
  return useLiveQuery(() => db.recipes.orderBy("name").toArray(), []);
}

export function useCoachMessages() {
  return useLiveQuery(() => db.coachMessages.orderBy("createdAt").toArray(), []);
}

export function useReport(weekStart: DayKey) {
  return useLiveQuery(async () => (await db.reports.where("weekStart").equals(weekStart).first()) ?? null, [weekStart]);
}

export function useKv<T>(key: string) {
  return useLiveQuery(async () => (await db.kv.get(key))?.value as T | undefined, [key]);
}

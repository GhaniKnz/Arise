import { db } from "../index";
import { insert, patch, remove, stamp } from "../repo";
import type { CardioSession, CustomExercise, Exercise, Profile, Routine, RoutineExercise, RoutineType, Session, WorkoutSet } from "../types";
import { SPLIT_BY_KEY, TEMPLATES } from "@/lib/data/routines";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import { nowIso } from "@/lib/utils/id";
import { todayKey, type DayKey } from "@/lib/utils/date";

/** Sets of the most recent finished session that contains the exercise. */
export async function lastPerformance(exerciseId: string, excludeSessionId?: string): Promise<WorkoutSet[]> {
  const sets = await db.sets.where("exerciseId").equals(exerciseId).toArray();
  const done = sets.filter((s) => s.done && !s.warmup && s.sessionId !== excludeSessionId);
  if (!done.length) return [];
  const sessionIds = [...new Set(done.map((s) => s.sessionId))];
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s && s.status === "done");
  if (!sessions.length) return [];
  const latest = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  return done.filter((s) => s.sessionId === latest.id).sort((a, b) => a.order - b.order);
}

export async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where("status").equals("active").first();
}

async function prefilledSets(sessionId: string, date: DayKey, ex: RoutineExercise, startOrder = 0): Promise<WorkoutSet[]> {
  const prev = await lastPerformance(ex.exerciseId, sessionId);
  return Array.from({ length: ex.sets }, (_, i) => {
    const ref = prev[i] ?? prev.at(-1);
    return stamp<WorkoutSet>({
      sessionId,
      exerciseId: ex.exerciseId,
      date,
      order: startOrder + i,
      weightKg: ref?.weightKg ?? 0,
      reps: ref?.reps ?? ex.repsMin,
      warmup: false,
      done: false,
    });
  });
}

export async function startSession(opts: { routine?: Routine; name?: string; type?: RoutineType; date?: DayKey }): Promise<Session> {
  const active = await getActiveSession();
  if (active) return active;
  const date = opts.date ?? todayKey();
  const routine = opts.routine;
  const session = stamp<Session>({
    date,
    routineId: routine?.id,
    name: routine?.name ?? opts.name ?? "Séance libre",
    type: routine?.type ?? opts.type ?? "custom",
    color: routine?.color,
    icon: routine?.icon,
    startedAt: nowIso(),
    status: "active",
    exerciseIds: routine?.exercises.map((e) => e.exerciseId) ?? [],
  });
  const sets: WorkoutSet[] = [];
  for (const ex of routine?.exercises ?? []) sets.push(...(await prefilledSets(session.id, date, ex)));
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await db.sessions.add(session);
    if (sets.length) await db.sets.bulkAdd(sets);
  });
  return session;
}

export async function addExerciseToSession(session: Session, exerciseId: string, sets = 3, repsMin = 8) {
  if (session.exerciseIds.includes(exerciseId)) return;
  const rows = await prefilledSets(session.id, session.date, { exerciseId, sets, repsMin, repsMax: repsMin + 4, restSec: 90 });
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await patch(db.sessions, session.id, { exerciseIds: [...session.exerciseIds, exerciseId] });
    await db.sets.bulkAdd(rows);
  });
}

export async function removeExerciseFromSession(session: Session, exerciseId: string) {
  const ids = (await db.sets.where("sessionId").equals(session.id).toArray()).filter((s) => s.exerciseId === exerciseId).map((s) => s.id);
  await patch(db.sessions, session.id, { exerciseIds: session.exerciseIds.filter((id) => id !== exerciseId) });
  await remove("sets", ids);
}

export async function reorderSessionExercises(session: Session, exerciseIds: string[]) {
  await patch(db.sessions, session.id, { exerciseIds });
}

/** Renames a session; optionally the program it came from too. */
export async function renameSession(session: Session, name: string, alsoRoutine: boolean) {
  await patch(db.sessions, session.id, { name });
  if (alsoRoutine && session.routineId && (await db.routines.get(session.routineId))) await patch(db.routines, session.routineId, { name });
}

export async function addSet(session: Session, exerciseId: string, warmup = false) {
  const existing = (await db.sets.where("sessionId").equals(session.id).toArray()).filter((s) => s.exerciseId === exerciseId);
  const last = existing.sort((a, b) => a.order - b.order).at(-1);
  return insert<WorkoutSet>(db.sets, {
    sessionId: session.id,
    exerciseId,
    date: session.date,
    order: (last?.order ?? -1) + 1,
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? 8,
    warmup,
    done: false,
  });
}

export async function updateSet(id: string, changes: Partial<Pick<WorkoutSet, "weightKg" | "reps" | "rpe" | "warmup">>) {
  await patch(db.sets, id, changes);
}

export async function setDone(id: string, done: boolean) {
  await patch(db.sets, id, { done, completedAt: done ? nowIso() : undefined });
}

export const deleteSet = (id: string) => remove("sets", [id]);

export async function finishSession(session: Session, opts: { rpe?: number; notes?: string } = {}) {
  const sets = await db.sets.where("sessionId").equals(session.id).toArray();
  const undone = sets.filter((s) => !s.done).map((s) => s.id);
  await remove("sets", undone);
  await patch(db.sessions, session.id, { status: "done", endedAt: nowIso(), rpe: opts.rpe, notes: opts.notes });
}

export async function deleteSession(sessionId: string) {
  const ids = (await db.sets.where("sessionId").equals(sessionId).toArray()).map((s) => s.id);
  await remove("sets", ids);
  await remove("sessions", [sessionId]);
}

/** Records a session after the fact (no timer). */
export async function logPastSession(opts: { date: DayKey; routine?: Routine; name: string; type: RoutineType; durationMin: number }) {
  const start = new Date(`${opts.date}T18:00:00`);
  const session = stamp<Session>({
    date: opts.date,
    routineId: opts.routine?.id,
    name: opts.name,
    type: opts.type,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + opts.durationMin * 60_000).toISOString(),
    status: "done",
    exerciseIds: opts.routine?.exercises.map((e) => e.exerciseId) ?? [],
  });
  await db.sessions.add(session);
  return session;
}

/* ─────────────── Routines ─────────────── */

export async function saveRoutine(r: { id?: string; name: string; type: RoutineType; exercises: RoutineExercise[]; notes?: string; color?: string; icon?: string }) {
  if (r.id) {
    await patch(db.routines, r.id, { name: r.name, type: r.type, exercises: r.exercises, notes: r.notes, color: r.color, icon: r.icon });
    return r.id;
  }
  const { id: _id, ...rest } = r;
  return (await insert<Routine>(db.routines, rest)).id;
}

export async function duplicateRoutine(r: Routine) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = r;
  return (await insert<Routine>(db.routines, { ...rest, name: `${r.name} (copie)`, exercises: r.exercises.map((e) => ({ ...e })) })).id;
}

/**
 * Applies a weekly split: reuses programs that already carry the template's
 * name, creates the missing ones, and rewrites the schedule.
 */
export async function applySplitPreset(key: string) {
  const preset = SPLIT_BY_KEY.get(key);
  if (!preset) return;
  const existing = await db.routines.toArray();
  const idByKey = new Map<string, string>();
  const created: Routine[] = [];
  for (const k of preset.templates) {
    const tpl = TEMPLATES[k];
    const match = existing.find((r) => r.name.trim().toLowerCase() === tpl.name.toLowerCase());
    if (match) idByKey.set(k, match.id);
    else {
      const row = stamp<Routine>({ name: tpl.name, type: tpl.type, exercises: tpl.exercises.map((e) => ({ ...e })) });
      created.push(row);
      idByKey.set(k, row.id);
    }
  }
  const schedule = preset.schedule.map((k) => (k ? (idByKey.get(k) ?? null) : null));
  await db.transaction("rw", db.routines, db.profile, async () => {
    if (created.length) await db.routines.bulkAdd(created);
    await patch(db.profile, "me", { schedule, sessionsPerWeek: schedule.filter(Boolean).length } as Partial<Profile>);
  });
  return { created: created.length };
}

/* ─────────────── Exercises ─────────────── */

/**
 * Saves a custom exercise, or a personal version of a built-in one (same id:
 * the library prefers the user's row, so history and records stay attached).
 */
export async function saveExercise(ex: Exercise) {
  const existing = await db.customExercises.get(ex.id);
  if (existing) {
    const { id: _id, ...changes } = ex;
    await patch(db.customExercises, ex.id, changes as Partial<CustomExercise>);
    return ex.id;
  }
  return (await insert<CustomExercise>(db.customExercises, ex)).id;
}

export function newExerciseId() {
  return `custom:${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

/** Removes a custom exercise, or restores the original of a built-in one. */
export async function deleteExercise(id: string) {
  await remove("customExercises", [id]);
}

export const isBuiltInExercise = (id: string) => EXERCISE_BY_ID.has(id);

export async function deleteRoutine(id: string) {
  await remove("routines", [id]);
  const profile = await db.profile.get("me");
  if (profile?.schedule.includes(id)) {
    await patch(db.profile, "me", { schedule: profile.schedule.map((s) => (s === id ? null : s)) });
  }
}

/* ─────────────── Cardio ─────────────── */

export async function logCardio(c: Omit<CardioSession, "id" | "createdAt" | "updatedAt">) {
  return insert<CardioSession>(db.cardio, c);
}

export async function updateCardio(id: string, c: Partial<CardioSession>) {
  await patch(db.cardio, id, c);
}

export const deleteCardio = (id: string) => remove("cardio", [id]);

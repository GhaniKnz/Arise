import { db } from "../index";
import { insert, patch, remove, stamp } from "../repo";
import type { CardioSession, CustomExercise, Exercise, Profile, Routine, RoutineExercise, RoutineType, Session, WorkoutSet } from "../types";
import { SPLIT_BY_KEY, TEMPLATES } from "@/lib/data/routines";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import { nowIso } from "@/lib/utils/id";
import { todayKey, type DayKey } from "@/lib/utils/date";

export const slotOf = (s: Pick<WorkoutSet, "slot">) => s.slot ?? 0;

/** Occurrence index of the exercise at `index` among identical ids before it. */
export function slotAt(exerciseIds: string[], index: number): number {
  let n = 0;
  for (let i = 0; i < index; i++) if (exerciseIds[i] === exerciseIds[index]) n++;
  return n;
}

/** Sets of the block at `index` (an exercise may appear several times in a session). */
export function blockSets<T extends Pick<WorkoutSet, "exerciseId" | "slot">>(sets: T[], exerciseIds: string[], index: number): T[] {
  const id = exerciseIds[index];
  const slot = slotAt(exerciseIds, index);
  return sets.filter((s) => s.exerciseId === id && slotOf(s) === slot);
}

/**
 * Sets of the most recent finished session that contains the exercise — the
 * same occurrence (`slot`) when it existed, else the first one. `before` (ISO)
 * only looks at sessions started earlier (to backfill a forgotten session).
 */
export async function lastPerformance(exerciseId: string, excludeSessionId?: string, slot = 0, before?: string): Promise<WorkoutSet[]> {
  const sets = await db.sets.where("exerciseId").equals(exerciseId).toArray();
  const done = sets.filter((s) => s.done && !s.warmup && s.sessionId !== excludeSessionId);
  if (!done.length) return [];
  const sessionIds = [...new Set(done.map((s) => s.sessionId))];
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s && s.status === "done" && (!before || s.startedAt < before));
  if (!sessions.length) return [];
  const latest = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const inLatest = done.filter((s) => s.sessionId === latest.id);
  const same = inLatest.filter((s) => slotOf(s) === slot);
  return (same.length ? same : inLatest.filter((s) => slotOf(s) === 0)).sort((a, b) => a.order - b.order);
}

export async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where("status").equals("active").first();
}

/**
 * Sets prefilled with the last performance. In a finished session they are
 * created as done (a correction) and prefilled from the sessions before it.
 */
async function prefilledSets(sessionId: string, date: DayKey, ex: RoutineExercise, slot = 0, past?: { doneAt: string; before: string }): Promise<WorkoutSet[]> {
  const prev = await lastPerformance(ex.exerciseId, sessionId, slot, past?.before);
  return Array.from({ length: ex.sets }, (_, i) => {
    const ref = prev[i] ?? prev.at(-1);
    return stamp<WorkoutSet>({
      sessionId,
      exerciseId: ex.exerciseId,
      ...(slot ? { slot } : {}),
      date,
      order: i,
      weightKg: ref?.weightKg ?? 0,
      reps: ref?.reps ?? ex.repsMin,
      warmup: false,
      done: !!past,
      ...(past ? { completedAt: past.doneAt } : {}),
    });
  });
}

/** Sets added to an already finished session are done at its end and prefilled from before it. */
const pastOf = (session: Pick<Session, "status" | "startedAt" | "endedAt">) =>
  session.status === "done" ? { doneAt: session.endedAt ?? session.startedAt, before: session.startedAt } : undefined;

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
  const seen = new Map<string, number>();
  for (const ex of routine?.exercises ?? []) {
    const slot = seen.get(ex.exerciseId) ?? 0;
    seen.set(ex.exerciseId, slot + 1);
    sets.push(...(await prefilledSets(session.id, date, ex, slot)));
  }
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await db.sessions.add(session);
    if (sets.length) await db.sets.bulkAdd(sets);
  });
  return session;
}

/** Appends an exercise block; the same exercise may be added several times. */
export async function addExerciseToSession(session: Session, exerciseId: string, sets = 3, repsMin = 8) {
  const slot = session.exerciseIds.filter((id) => id === exerciseId).length;
  const rows = await prefilledSets(session.id, session.date, { exerciseId, sets, repsMin, repsMax: repsMin + 4, restSec: 90 }, slot, pastOf(session));
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await patch(db.sessions, session.id, { exerciseIds: [...session.exerciseIds, exerciseId] });
    await db.sets.bulkAdd(rows);
  });
}

/** Removes the block at `index` and renumbers later blocks of the same exercise. */
export async function removeExerciseFromSession(session: Session, index: number) {
  const exerciseId = session.exerciseIds[index];
  if (exerciseId === undefined) return;
  const slot = slotAt(session.exerciseIds, index);
  const mine = (await db.sets.where("sessionId").equals(session.id).toArray()).filter((s) => s.exerciseId === exerciseId);
  const drop = mine.filter((s) => slotOf(s) === slot).map((s) => s.id);
  const shift = mine.filter((s) => slotOf(s) > slot);
  await patch(db.sessions, session.id, { exerciseIds: session.exerciseIds.filter((_, i) => i !== index) });
  for (const s of shift) await patch(db.sets, s.id, { slot: slotOf(s) - 1 || undefined });
  await remove("sets", drop);
}

export async function reorderSessionExercises(session: Session, exerciseIds: string[]) {
  await patch(db.sessions, session.id, { exerciseIds });
}

/** Renames a session; optionally the program it came from too. */
export async function renameSession(session: Session, name: string, alsoRoutine: boolean) {
  await patch(db.sessions, session.id, { name });
  if (alsoRoutine && session.routineId && (await db.routines.get(session.routineId))) await patch(db.routines, session.routineId, { name });
}

export async function addSet(session: Session, exerciseId: string, warmup = false, slot = 0) {
  const existing = (await db.sets.where("sessionId").equals(session.id).toArray()).filter((s) => s.exerciseId === exerciseId && slotOf(s) === slot);
  const last = existing.sort((a, b) => a.order - b.order).at(-1);
  const doneAt = pastOf(session)?.doneAt;
  return insert<WorkoutSet>(db.sets, {
    sessionId: session.id,
    exerciseId,
    ...(slot ? { slot } : {}),
    date: session.date,
    order: (last?.order ?? -1) + 1,
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? 8,
    warmup,
    done: !!doneAt,
    ...(doneAt ? { completedAt: doneAt } : {}),
  });
}

/** Puts back a set deleted by mistake (and forgets its deletion for sync). */
export async function restoreSet(set: WorkoutSet) {
  await db.transaction("rw", db.sets, db.tombstones, async () => {
    await db.tombstones.delete(set.id);
    await db.sets.put({ ...set, updatedAt: nowIso() });
  });
}

/**
 * Corrects a session after the fact: name, date, start time, duration,
 * effort and notes. Moving the date moves its sets too.
 */
export async function updateSessionInfo(session: Session, info: { name: string; date: DayKey; startTime: string; durationMin: number; rpe?: number; notes?: string }) {
  const start = new Date(`${info.date}T${info.startTime || "18:00"}:00`);
  const startedAt = Number.isNaN(start.getTime()) ? session.startedAt : start.toISOString();
  const endedAt = new Date(new Date(startedAt).getTime() + Math.max(1, info.durationMin) * 60_000).toISOString();
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await patch(db.sessions, session.id, { name: info.name, date: info.date, startedAt, ...(session.status === "done" ? { endedAt } : {}), rpe: info.rpe, notes: info.notes });
    if (info.date !== session.date) {
      const ids = (await db.sets.where("sessionId").equals(session.id).toArray()).map((s) => s.id);
      for (const id of ids) await patch(db.sets, id, { date: info.date });
    }
  });
}

/* ─────────────── Program ↔ session ─────────────── */

export async function addExerciseToRoutine(routineId: string, ex: RoutineExercise) {
  const r = await db.routines.get(routineId);
  if (r) await patch(db.routines, routineId, { exercises: [...r.exercises, ex] });
}

/** Removes the `occurrence`-th entry of an exercise from a program. */
export async function removeExerciseFromRoutine(routineId: string, exerciseId: string, occurrence = 0) {
  const r = await db.routines.get(routineId);
  if (!r) return;
  let seen = -1;
  const exercises = r.exercises.filter((e) => (e.exerciseId === exerciseId ? ++seen !== occurrence : true));
  await patch(db.routines, routineId, { exercises });
}

/** Differences between a session's exercise list and its program. */
export function routineDiff(routine: Routine, session: Session) {
  const count = (ids: string[]) => ids.reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<string, number>());
  const inRoutine = count(routine.exercises.map((e) => e.exerciseId));
  const inSession = count(session.exerciseIds);
  let added = 0;
  let removed = 0;
  for (const [id, n] of inSession) added += Math.max(0, n - (inRoutine.get(id) ?? 0));
  for (const [id, n] of inRoutine) removed += Math.max(0, n - (inSession.get(id) ?? 0));
  const reordered = added === 0 && removed === 0 && routine.exercises.map((e) => e.exerciseId).join() !== session.exerciseIds.join();
  return { added, removed, reordered, changed: added > 0 || removed > 0 || reordered };
}

/**
 * Makes the program match what was actually done: same exercises in the same
 * order; kept exercises keep their reps/rest, the number of sets follows the session.
 */
export async function syncRoutineFromSession(session: Session, sets: WorkoutSet[]) {
  if (!session.routineId) return;
  const routine = await db.routines.get(session.routineId);
  if (!routine) return;
  const exercises: RoutineExercise[] = session.exerciseIds.map((exerciseId, i) => {
    const slot = slotAt(session.exerciseIds, i);
    const prev = routine.exercises.filter((e) => e.exerciseId === exerciseId)[slot];
    const working = blockSets(sets, session.exerciseIds, i).filter((s) => !s.warmup).length;
    return { exerciseId, sets: Math.max(1, working || prev?.sets || 3), repsMin: prev?.repsMin ?? 8, repsMax: prev?.repsMax ?? 12, restSec: prev?.restSec ?? 90 };
  });
  await patch(db.routines, routine.id, { exercises });
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

/** Records a session after the fact (no timer), prefilled with the last performance so only corrections are needed. */
export async function logPastSession(opts: { date: DayKey; routine?: Routine; name: string; type: RoutineType; durationMin: number; startTime?: string }) {
  const parsed = new Date(`${opts.date}T${opts.startTime || "18:00"}:00`);
  const start = Number.isNaN(parsed.getTime()) ? new Date(`${opts.date}T18:00:00`) : parsed;
  const session = stamp<Session>({
    date: opts.date,
    routineId: opts.routine?.id,
    name: opts.name,
    type: opts.type,
    color: opts.routine?.color,
    icon: opts.routine?.icon,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + opts.durationMin * 60_000).toISOString(),
    status: "done",
    exerciseIds: opts.routine?.exercises.map((e) => e.exerciseId) ?? [],
  });
  const sets: WorkoutSet[] = [];
  const seen = new Map<string, number>();
  for (const ex of opts.routine?.exercises ?? []) {
    const slot = seen.get(ex.exerciseId) ?? 0;
    seen.set(ex.exerciseId, slot + 1);
    sets.push(...(await prefilledSets(session.id, opts.date, ex, slot, pastOf(session))));
  }
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await db.sessions.add(session);
    if (sets.length) await db.sets.bulkAdd(sets);
  });
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

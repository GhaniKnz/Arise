import { db } from "../index";
import { insert, patch, remove } from "../repo";
import type { Cycle, GoalType } from "../types";
import { addDays, type DayKey } from "@/lib/utils/date";
import { getProfile, refreshAutoTargets, updateProfile } from "./profile";

/** First switch: the goal followed since the profile's start becomes a recorded cycle. */
async function ensureInitialCycle() {
  if ((await db.cycles.count()) > 0) return;
  const p = await getProfile();
  if (!p) return;
  await insert<Cycle>(db.cycles, {
    goal: p.goal,
    startDate: p.startDate,
    startWeightKg: p.startWeightKg,
    targetWeightKg: p.targetWeightKg,
    weeklyRatePct: p.weeklyRatePct,
    kcalTarget: p.targets.kcal,
  });
}

export interface SwitchCycleInput {
  goal: GoalType;
  startDate: DayKey;
  currentWeightKg: number;
  targetWeightKg: number;
  weeklyRatePct: number;
  name?: string;
  note?: string;
  adaptiveTdee?: number;
}

/**
 * Ends the running cycle the day before `startDate` and starts a new one:
 * the profile goal, target weight and pace follow, and auto targets are recomputed.
 * The weight-goal dungeon restarts from the current weight.
 */
export async function switchCycle(input: SwitchCycleInput) {
  await ensureInitialCycle();
  const all = await db.cycles.toArray();
  for (const c of all.filter((c) => !c.endDate)) {
    // A cycle that would start on/after the new one never really ran: replace it.
    if (c.startDate >= input.startDate) await remove("cycles", [c.id]);
    else await patch(db.cycles, c.id, { endDate: addDays(input.startDate, -1) });
  }

  await updateProfile({ goal: input.goal, targetWeightKg: input.targetWeightKg, weeklyRatePct: input.weeklyRatePct, startWeightKg: input.currentWeightKg });
  await refreshAutoTargets(input.currentWeightKg, input.adaptiveTdee);
  const p = await getProfile();

  return insert<Cycle>(db.cycles, {
    goal: input.goal,
    name: input.name?.trim() || undefined,
    startDate: input.startDate,
    startWeightKg: input.currentWeightKg,
    targetWeightKg: input.targetWeightKg,
    weeklyRatePct: input.weeklyRatePct,
    kcalTarget: p?.targets.kcal,
    note: input.note?.trim() || undefined,
  });
}

/** Records a cycle that happened before (memory only: the profile is untouched). */
export async function addPastCycle(input: { goal: GoalType; startDate: DayKey; endDate: DayKey; name?: string; note?: string; startWeightKg?: number; targetWeightKg?: number }) {
  await ensureInitialCycle();
  return insert<Cycle>(db.cycles, { ...input, name: input.name?.trim() || undefined, note: input.note?.trim() || undefined });
}

export type CycleChanges = Partial<Pick<Cycle, "goal" | "name" | "startDate" | "endDate" | "targetWeightKg" | "note">>;

/** Edits a cycle; the implicit first cycle ("initial") is recorded on the way. */
export async function updateCycle(id: string, changes: CycleChanges) {
  if (id === "initial") {
    await ensureInitialCycle();
    const first = (await db.cycles.orderBy("startDate").toArray()).at(0);
    if (!first) return;
    id = first.id;
  }
  const clean: CycleChanges = { ...changes };
  if ("name" in changes) clean.name = changes.name?.trim() || undefined;
  if ("note" in changes) clean.note = changes.note?.trim() || undefined;
  await patch(db.cycles, id, clean);
  const row = await db.cycles.get(id);
  // The running cycle's target weight is the profile's (its goal changes through switchCycle).
  if (row && !row.endDate && changes.targetWeightKg != null) {
    const latest = (await db.cycles.orderBy("startDate").toArray()).at(-1);
    if (latest?.id === row.id) await updateProfile({ targetWeightKg: changes.targetWeightKg });
  }
}

/** Keeps the running cycle in line when the profile's target weight or pace is edited. */
export async function syncRunningCycle(changes: Pick<Cycle, "targetWeightKg" | "weeklyRatePct">) {
  const latest = (await db.cycles.orderBy("startDate").toArray()).at(-1);
  if (latest && !latest.endDate) await patch(db.cycles, latest.id, changes);
}

export async function deleteCycle(id: string) {
  await remove("cycles", [id]);
}

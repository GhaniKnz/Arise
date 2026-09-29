"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Session, WorkoutSet } from "@/lib/db/types";
import { bestsFromSets, type Bests } from "@/lib/domain/strength";

export interface ExerciseHistory {
  bests: Bests;
  /** Working sets of the last session (first occurrence of the exercise). */
  last: WorkoutSet[];
  /** Same, per occurrence when the exercise appeared several times. */
  lastBySlot: Map<number, WorkoutSet[]>;
  lastDate?: string;
}

/** Last performance for a given occurrence, falling back to the first one. */
export const lastForSlot = (h: ExerciseHistory | undefined, slot: number) => (h ? (h.lastBySlot.get(slot) ?? h.last) : undefined);

/**
 * For each exercise: all-time bests and last performance, excluding the given
 * session (so the current workout is compared against the past only).
 */
export function useSessionHistory(sessionId: string | undefined, exerciseIds: string[]) {
  const key = exerciseIds.join(",");
  return useLiveQuery(async () => {
    const out = new Map<string, ExerciseHistory>();
    if (!exerciseIds.length) return out;
    const sets = (await db.sets.where("exerciseId").anyOf(exerciseIds).toArray()).filter((s) => s.done && s.sessionId !== sessionId);
    const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
    const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s && s.status === "done");
    const doneMap = new Map(sessions.map((s) => [s.id, s]));
    for (const id of exerciseIds) {
      const mine = sets.filter((s) => s.exerciseId === id && doneMap.has(s.sessionId));
      let latest: Session | undefined;
      for (const s of mine) {
        const sess = doneMap.get(s.sessionId)!;
        if (!latest || sess.startedAt > latest.startedAt) latest = sess;
      }
      const lastSets = latest ? mine.filter((s) => s.sessionId === latest!.id && !s.warmup).sort((a, b) => a.order - b.order) : [];
      const lastBySlot = new Map<number, WorkoutSet[]>();
      for (const s of lastSets) lastBySlot.set(s.slot ?? 0, [...(lastBySlot.get(s.slot ?? 0) ?? []), s]);
      out.set(id, {
        bests: bestsFromSets(mine),
        last: lastBySlot.get(0) ?? lastSets,
        lastBySlot,
        lastDate: latest?.date,
      });
    }
    return out;
  }, [sessionId, key]);
}

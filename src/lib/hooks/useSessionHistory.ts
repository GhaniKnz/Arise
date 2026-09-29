"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Session, WorkoutSet } from "@/lib/db/types";
import { bestsFromSets, type Bests } from "@/lib/domain/strength";

export interface ExerciseHistory {
  bests: Bests;
  last: WorkoutSet[];
  lastDate?: string;
}

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
      out.set(id, {
        bests: bestsFromSets(mine),
        last: latest ? mine.filter((s) => s.sessionId === latest!.id && !s.warmup).sort((a, b) => a.order - b.order) : [],
        lastDate: latest?.date,
      });
    }
    return out;
  }, [sessionId, key]);
}

import type { WorkoutSet } from "@/lib/db/types";

/** Epley (1985). Reliable up to ~10–12 reps; beyond that it is only indicative. */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function setVolume(s: Pick<WorkoutSet, "weightKg" | "reps">): number {
  return s.weightKg * s.reps;
}

export type PRKind = "weight" | "e1rm" | "volume" | "reps";

export const PR_LABEL: Record<PRKind, string> = {
  weight: "Charge max",
  e1rm: "1RM estimé",
  volume: "Volume (série)",
  reps: "Répétitions",
};

export interface Bests {
  weight: number;
  e1rm: number;
  volume: number;
  /** Best reps achieved at or above a given load: [weight, reps] pairs. */
  repsAt: [number, number][];
  maxReps: number;
  count: number;
}

export const emptyBests = (): Bests => ({ weight: 0, e1rm: 0, volume: 0, repsAt: [], maxReps: 0, count: 0 });

type SetLike = Pick<WorkoutSet, "weightKg" | "reps" | "warmup" | "done">;

const isWorking = (s: SetLike) => s.done && !s.warmup && s.reps > 0;

function bestRepsAtOrAbove(bests: Bests, weight: number): number {
  let best = 0;
  for (const [w, r] of bests.repsAt) if (w >= weight && r > best) best = r;
  return best;
}

/**
 * PRs a set would set against the given bests. Nothing counts as a PR when
 * there is no history for the exercise (first time performing it).
 */
export function detectPRs(set: SetLike, bests: Bests, weighted = true): PRKind[] {
  if (!isWorking(set) || bests.count === 0) return [];
  const out: PRKind[] = [];
  if (weighted && set.weightKg > 0) {
    if (set.weightKg > bests.weight) out.push("weight");
    const est = e1rm(set.weightKg, set.reps);
    if (est > bests.e1rm + 0.01 && set.reps <= 12) out.push("e1rm");
    if (setVolume(set) > bests.volume) out.push("volume");
    if (!out.includes("weight") && set.reps > bestRepsAtOrAbove(bests, set.weightKg)) out.push("reps");
  } else if (set.reps > bests.maxReps) {
    out.push("reps");
  }
  return out;
}

export function applySet(bests: Bests, set: SetLike): Bests {
  if (!isWorking(set)) return bests;
  const next: Bests = {
    weight: Math.max(bests.weight, set.weightKg),
    e1rm: Math.max(bests.e1rm, set.reps <= 12 ? e1rm(set.weightKg, set.reps) : 0),
    volume: Math.max(bests.volume, setVolume(set)),
    maxReps: Math.max(bests.maxReps, set.reps),
    repsAt: [...bests.repsAt],
    count: bests.count + 1,
  };
  const idx = next.repsAt.findIndex(([w]) => w === set.weightKg);
  if (idx === -1) next.repsAt.push([set.weightKg, set.reps]);
  else if (next.repsAt[idx][1] < set.reps) next.repsAt[idx] = [set.weightKg, set.reps];
  return next;
}

export function bestsFromSets(sets: SetLike[]): Bests {
  return sets.reduce(applySet, emptyBests());
}

export interface PREvent {
  exerciseId: string;
  sessionId: string;
  date: string;
  kinds: PRKind[];
  weightKg: number;
  reps: number;
}

/**
 * Walk all sets chronologically and list, per session and exercise,
 * the PRs achieved (one event per exercise per session).
 */
export function derivePRs(sets: WorkoutSet[], weightedById: (exerciseId: string) => boolean = () => true): PREvent[] {
  const sorted = [...sets]
    .filter((s) => s.done)
    .sort((a, b) => (a.completedAt ?? a.date).localeCompare(b.completedAt ?? b.date) || a.order - b.order);
  const bestsByEx = new Map<string, Bests>();
  const events = new Map<string, PREvent>();
  for (const s of sorted) {
    const bests = bestsByEx.get(s.exerciseId) ?? emptyBests();
    // Compare only against previous sessions + earlier sets of this one.
    const kinds = detectPRs(s, bests, weightedById(s.exerciseId));
    if (kinds.length) {
      const key = `${s.sessionId}:${s.exerciseId}`;
      const prev = events.get(key);
      if (!prev || e1rm(s.weightKg, s.reps) >= e1rm(prev.weightKg, prev.reps)) {
        const merged = new Set([...(prev?.kinds ?? []), ...kinds]);
        events.set(key, { exerciseId: s.exerciseId, sessionId: s.sessionId, date: s.date, kinds: [...merged], weightKg: s.weightKg, reps: s.reps });
      } else {
        const merged = new Set([...prev.kinds, ...kinds]);
        prev.kinds = [...merged];
      }
    }
    bestsByEx.set(s.exerciseId, applySet(bests, s));
  }
  return [...events.values()];
}

/** Suggestion for next time (double progression). */
export function progressionHint(
  last: { weightKg: number; reps: number }[],
  repsMin: number,
  repsMax: number,
  increment = 2.5,
): { weightKg: number; reps: number; text: string } | null {
  if (!last.length) return null;
  const top = last.reduce((a, b) => (e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
  const allAtTop = last.every((s) => s.reps >= repsMax && s.weightKg >= top.weightKg);
  const kg = (w: number) => `${String(w).replace(".", ",")} kg`;
  if (allAtTop && top.weightKg > 0) {
    return { weightKg: top.weightKg + increment, reps: repsMin, text: `Toutes les séries à ${repsMax} reps : passe à ${kg(top.weightKg + increment)}` };
  }
  if (allAtTop) return { weightKg: 0, reps: repsMax + 1, text: `Toutes les séries à ${repsMax} reps : ajoute un peu de lest ou vise ${repsMax + 1} reps` };
  const reps = Math.min(top.reps + 1, repsMax);
  return { weightKg: top.weightKg, reps, text: top.weightKg > 0 ? `Vise ${reps} reps à ${kg(top.weightKg)}` : `Vise ${reps} reps` };
}

export interface SetGain {
  kind: "weight" | "reps";
  amount: number;
}

type Load = Pick<WorkoutSet, "weightKg" | "reps">;

/**
 * Progress of a set against the same set of the previous session:
 * more load, or more reps at the same load. Null when not better.
 */
export function gainVsPrevious(prev: Load | undefined, cur: Load, weighted = true): SetGain | null {
  if (!prev || cur.reps <= 0) return null;
  if ((weighted || prev.weightKg > 0 || cur.weightKg > 0) && cur.weightKg > prev.weightKg) return { kind: "weight", amount: Math.round((cur.weightKg - prev.weightKg) * 100) / 100 };
  if (cur.weightKg === prev.weightKg && cur.reps > prev.reps) return { kind: "reps", amount: cur.reps - prev.reps };
  return null;
}

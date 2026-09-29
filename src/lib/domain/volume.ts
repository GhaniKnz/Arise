import type { Exercise, Muscle, WorkoutSet } from "@/lib/db/types";

/** Weekly hard sets per muscle: 1 for the primary muscle, 0.5 for each secondary. */
export function setsPerMuscle(sets: WorkoutSet[], byId: (id: string) => Exercise | undefined): Map<Muscle, number> {
  const out = new Map<Muscle, number>();
  for (const s of sets) {
    if (!s.done || s.warmup) continue;
    const ex = byId(s.exerciseId);
    if (!ex) continue;
    out.set(ex.primary, (out.get(ex.primary) ?? 0) + 1);
    for (const m of ex.secondary) out.set(m, (out.get(m) ?? 0) + 0.5);
  }
  return out;
}

/** Evidence-based landmark: ~10–20 weekly sets per muscle for hypertrophy. */
export const WEEKLY_SET_TARGET: [number, number] = [10, 20];

export const TRACKED_MUSCLES: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];

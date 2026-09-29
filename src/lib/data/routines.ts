import type { Experience, Routine, RoutineExercise, RoutineType, Session } from "@/lib/db/types";

export const ROUTINE_TYPE_META: Record<RoutineType, { label: string; color: string; short: string }> = {
  push: { label: "Push", color: "#4DA3FF", short: "PSH" },
  pull: { label: "Pull", color: "#A78BFA", short: "PUL" },
  legs: { label: "Legs", color: "#34D399", short: "LEG" },
  upper: { label: "Upper", color: "#22D3EE", short: "UPR" },
  lower: { label: "Lower", color: "#F5B94A", short: "LWR" },
  full: { label: "Full Body", color: "#F472B6", short: "FULL" },
  cardio: { label: "Cardio", color: "#FB7185", short: "CRD" },
  custom: { label: "Perso", color: "#94A3B8", short: "PRS" },
};

/** Colors offered in the program editor. */
export const ROUTINE_COLORS = ["#4DA3FF", "#22D3EE", "#A78BFA", "#8B5CF6", "#F472B6", "#FB7185", "#F97316", "#F5B94A", "#34D399", "#94A3B8"];

/** Default pictogram per type: a muscle silhouette (`m:`) or a glyph (`g:`). */
export const ROUTINE_TYPE_ICON: Record<RoutineType, string> = {
  push: "m:chest",
  pull: "m:back",
  legs: "m:quads",
  upper: "m:shoulders",
  lower: "m:glutes",
  full: "g:person",
  cardio: "g:heart",
  custom: "g:dumbbell",
};

type Styled = Pick<Routine, "type" | "color" | "icon"> | Pick<Session, "type" | "color" | "icon">;
export const routineColor = (r: Styled) => r.color ?? ROUTINE_TYPE_META[r.type].color;
export const routineIcon = (r: Styled) => r.icon ?? ROUTINE_TYPE_ICON[r.type];

export interface RoutineTemplate {
  key: string;
  name: string;
  type: RoutineType;
  exercises: RoutineExercise[];
}

const e = (exerciseId: string, sets: number, repsMin: number, repsMax: number, restSec: number): RoutineExercise => ({ exerciseId, sets, repsMin, repsMax, restSec });

export const TEMPLATES: Record<string, RoutineTemplate> = {
  push: {
    key: "push",
    name: "Push",
    type: "push",
    exercises: [
      e("bench_press", 3, 6, 8, 150),
      e("incline_db_press", 3, 8, 10, 120),
      e("db_shoulder_press", 3, 8, 10, 120),
      e("lateral_raise", 3, 12, 15, 60),
      e("cable_fly", 2, 12, 15, 60),
      e("triceps_pushdown", 3, 10, 12, 60),
    ],
  },
  pull: {
    key: "pull",
    name: "Pull",
    type: "pull",
    exercises: [
      e("pull_up", 3, 6, 10, 120),
      e("barbell_row", 3, 8, 10, 120),
      e("lat_pulldown", 3, 10, 12, 90),
      e("face_pull", 3, 12, 15, 60),
      e("incline_curl", 3, 10, 12, 60),
      e("hammer_curl", 2, 10, 12, 60),
    ],
  },
  legs: {
    key: "legs",
    name: "Legs",
    type: "legs",
    exercises: [
      e("back_squat", 3, 5, 8, 180),
      e("rdl", 3, 8, 10, 150),
      e("leg_press", 3, 10, 12, 120),
      e("lying_leg_curl", 3, 10, 12, 60),
      e("standing_calf_raise", 3, 10, 15, 60),
      e("hanging_leg_raise", 3, 10, 15, 60),
    ],
  },
  upper: {
    key: "upper",
    name: "Upper",
    type: "upper",
    exercises: [
      e("bench_press", 3, 6, 8, 150),
      e("barbell_row", 3, 8, 10, 120),
      e("db_shoulder_press", 3, 8, 10, 120),
      e("lat_pulldown", 3, 10, 12, 90),
      e("lateral_raise", 3, 12, 15, 60),
      e("ez_curl", 2, 10, 12, 60),
      e("triceps_pushdown", 2, 10, 12, 60),
    ],
  },
  lower: {
    key: "lower",
    name: "Lower",
    type: "lower",
    exercises: [
      e("back_squat", 3, 5, 8, 180),
      e("rdl", 3, 8, 10, 150),
      e("bulgarian_split_squat", 2, 8, 12, 90),
      e("seated_leg_curl", 3, 10, 12, 60),
      e("standing_calf_raise", 3, 10, 15, 60),
      e("cable_crunch", 3, 10, 15, 60),
    ],
  },
  fullA: {
    key: "fullA",
    name: "Full Body A",
    type: "full",
    exercises: [
      e("back_squat", 3, 6, 8, 180),
      e("bench_press", 3, 6, 8, 150),
      e("seated_cable_row", 3, 8, 12, 90),
      e("lateral_raise", 2, 12, 15, 60),
      e("plank", 2, 30, 60, 45),
    ],
  },
  fullB: {
    key: "fullB",
    name: "Full Body B",
    type: "full",
    exercises: [
      e("rdl", 3, 8, 10, 150),
      e("ohp", 3, 6, 8, 150),
      e("lat_pulldown", 3, 8, 12, 90),
      e("leg_press", 3, 10, 12, 120),
      e("db_curl", 2, 10, 12, 60),
    ],
  },
  beginnerFull: {
    key: "beginnerFull",
    name: "Full Body Débutant",
    type: "full",
    exercises: [
      e("goblet_squat", 3, 8, 12, 90),
      e("chest_press_machine", 3, 8, 12, 90),
      e("lat_pulldown", 3, 8, 12, 90),
      e("db_rdl", 3, 8, 12, 90),
      e("db_shoulder_press", 2, 10, 12, 75),
      e("plank", 2, 20, 45, 45),
    ],
  },
};

export interface SplitPreset {
  key: string;
  label: string;
  description: string;
  days: number;
  templates: string[];
  /** Monday→Sunday template keys, null = rest. */
  schedule: (string | null)[];
}

export const SPLIT_PRESETS: SplitPreset[] = [
  { key: "full2", label: "Full Body ×2", description: "2 séances corps complet (A / B)", days: 2, templates: ["fullA", "fullB"], schedule: ["fullA", null, null, "fullB", null, null, null] },
  { key: "beginner3", label: "Full Body débutant", description: "La même séance 3 fois, pour apprendre les mouvements", days: 3, templates: ["beginnerFull"], schedule: ["beginnerFull", null, "beginnerFull", null, "beginnerFull", null, null] },
  { key: "full3", label: "Full Body ×3", description: "Corps complet A / B en alternance", days: 3, templates: ["fullA", "fullB"], schedule: ["fullA", null, "fullB", null, "fullA", null, null] },
  { key: "ppl3", label: "Push / Pull / Legs", description: "Pecs-épaules-triceps, dos-biceps, jambes", days: 3, templates: ["push", "pull", "legs"], schedule: ["push", null, "pull", null, "legs", null, null] },
  { key: "pp4", label: "Push / Pull", description: "Haut du corps : poussée puis tirage, 2 fois par semaine", days: 4, templates: ["push", "pull"], schedule: ["push", "pull", null, "push", "pull", null, null] },
  { key: "ul4", label: "Upper / Lower", description: "Haut du corps / bas du corps, 2 fois par semaine", days: 4, templates: ["upper", "lower"], schedule: ["upper", "lower", null, "upper", "lower", null, null] },
  { key: "ppl_ul5", label: "PPL + Upper / Lower", description: "5 séances, chaque muscle ~2 fois par semaine", days: 5, templates: ["push", "pull", "legs", "upper", "lower"], schedule: ["push", "pull", "legs", null, "upper", "lower", null] },
  { key: "ppl6", label: "Push / Pull / Legs ×2", description: "6 séances pour pratiquants réguliers", days: 6, templates: ["push", "pull", "legs"], schedule: ["push", "pull", "legs", "push", "pull", "legs", null] },
];

export const SPLIT_BY_KEY = new Map(SPLIT_PRESETS.map((p) => [p.key, p]));

/** Recommended preset for a number of sessions per week. */
export function defaultSplitKey(sessionsPerWeek: number, experience: Experience): string {
  const n = Math.max(2, Math.min(6, sessionsPerWeek));
  if (n <= 2) return "full2";
  if (n === 3) return experience === "beginner" ? "beginner3" : "full3";
  if (n === 4) return "ul4";
  if (n === 5) return "ppl_ul5";
  return "ppl6";
}

/** Weekly split (Mon→Sun) of template keys, null = rest. */
export function splitFor(sessionsPerWeek: number, experience: Experience): { templates: string[]; schedule: (string | null)[] } {
  const p = SPLIT_BY_KEY.get(defaultSplitKey(sessionsPerWeek, experience))!;
  return { templates: p.templates, schedule: p.schedule };
}

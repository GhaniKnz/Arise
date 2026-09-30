import type { DayKey } from "@/lib/utils/date";

export interface BaseRow {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/* ─────────────── Profile ─────────────── */

export type Sex = "male" | "female";
export type GoalType = "cut" | "bulk" | "recomp" | "maintain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Experience = "beginner" | "intermediate" | "advanced";
export type QuestId = "steps" | "protein" | "calories" | "water" | "workout" | "sleep";

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  steps: number;
  sleepMin: number;
}

export interface Profile extends BaseRow {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  goal: GoalType;
  activity: ActivityLevel;
  sessionsPerWeek: number;
  experience: Experience;
  /** Desired weekly change as % of body weight (always positive; direction comes from goal). */
  weeklyRatePct: number;
  targets: Targets;
  targetsMode: "auto" | "manual";
  /** Monday…Sunday → routine id, or null for a rest day. */
  schedule: (string | null)[];
  quests: QuestId[];
  restTimerSec: number;
  sound: boolean;
  vibration: boolean;
  effects: "full" | "reduced";
  startDate: DayKey;
  onboardedAt: string;
}

/* ─────────────── Nutrition ─────────────── */

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type Nova = 1 | 2 | 3 | 4;

export type FoodCategory =
  | "meat"
  | "fish"
  | "eggs"
  | "dairy"
  | "plant_protein"
  | "grains"
  | "bread"
  | "legumes"
  | "vegetables"
  | "fruits"
  | "nuts"
  | "fats"
  | "sweets"
  | "snacks"
  | "drinks"
  | "prepared"
  | "sauces"
  | "supplements"
  | "other";

/** Nutrients per 100 g (or 100 ml). */
export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  satFat?: number;
  salt?: number;
}

export interface Portion {
  label: string;
  grams: number;
}

export interface FoodItem extends Nutrients {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  category: FoodCategory;
  nova?: Nova;
  unit?: "g" | "ml";
  defaultGrams: number;
  portions?: Portion[];
  micros?: string[];
  keywords?: string[];
  alcohol?: boolean;
  source: "builtin" | "custom" | "off" | "ai";
  image?: string;
}

export type FoodRow = FoodItem & BaseRow;

export interface Favorite extends BaseRow {
  foodId: string;
}

export type EntrySource = "search" | "barcode" | "photo" | "meal" | "recipe" | "quick" | "dish";

/** Where a group of ingredients of a composed dish came from (one barcode scan, one AI photo…). */
export interface DishSource {
  id: string;
  kind: "barcode" | "photo" | "search";
  /** Product name, or the dish name suggested by the AI for a photo. */
  label: string;
  /** Small image: product picture URL, or a JPEG data URL for a meal photo. */
  thumb?: string;
  barcode?: string;
}

export interface EntryNutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  satFat: number;
  salt: number;
}

export interface FoodEntry extends BaseRow, EntryNutrients {
  date: DayKey;
  meal: MealSlot;
  foodId?: string;
  name: string;
  brand?: string;
  grams: number;
  /** Snapshot used to re-scale when the quantity changes. Absent for quick-adds. */
  per100?: Nutrients;
  nova?: Nova;
  category?: FoodCategory;
  source: EntrySource;
  /** Composed dish logged as one entry: its ingredients, kept to re-edit quantities later. */
  items?: Ingredient[];
  sources?: DishSource[];
  /** Saved dish this entry was made from. */
  dishId?: string;
}

export interface Ingredient {
  foodId?: string;
  name: string;
  grams: number;
  per100: Nutrients;
  nova?: Nova;
  category?: FoodCategory;
  /** Id of the DishSource (scan or photo) this ingredient came from. */
  sourceId?: string;
  /** Confidence of an AI estimate. */
  confidence?: "high" | "medium" | "low";
}

export interface SavedMeal extends BaseRow {
  name: string;
  items: Ingredient[];
  defaultSlot?: MealSlot;
  sources?: DishSource[];
}

export interface Recipe extends BaseRow {
  name: string;
  servings: number;
  items: Ingredient[];
  notes?: string;
}

/* ─────────────── Training ─────────────── */

export type Muscle =
  | "chest"
  | "back"
  | "traps"
  | "shoulders"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lower_back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "calves";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "ez_bar"
  | "smith";

export type Level = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  primary: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  level: Level;
  mechanic: "compound" | "isolation";
  /** Whether the load is external (false for pure bodyweight moves). */
  weighted: boolean;
  instructions: string[];
  tips?: string[];
  restSec: number;
}

export type CustomExercise = Exercise & BaseRow;

export type RoutineType = "push" | "pull" | "legs" | "upper" | "lower" | "full" | "cardio" | "custom";

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

export interface Routine extends BaseRow {
  name: string;
  type: RoutineType;
  exercises: RoutineExercise[];
  notes?: string;
}

export interface Session extends BaseRow {
  date: DayKey;
  routineId?: string;
  name: string;
  type: RoutineType;
  startedAt: string;
  endedAt?: string;
  status: "active" | "done";
  exerciseIds: string[];
  notes?: string;
  /** Perceived effort 1–10 for the whole session. */
  rpe?: number;
}

export interface WorkoutSet extends BaseRow {
  sessionId: string;
  exerciseId: string;
  date: DayKey;
  order: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  warmup: boolean;
  done: boolean;
  completedAt?: string;
}

export type CardioType =
  | "walk"
  | "incline_walk"
  | "run"
  | "bike"
  | "rower"
  | "elliptical"
  | "stairs"
  | "swim"
  | "hiit"
  | "sport"
  | "other";

export interface CardioSession extends BaseRow {
  date: DayKey;
  type: CardioType;
  durationMin: number;
  distanceKm?: number;
  speedKmh?: number;
  inclinePct?: number;
  avgHr?: number;
  kcal?: number;
  notes?: string;
}

/* ─────────────── Body & daily ─────────────── */

export interface BodyMetric extends BaseRow {
  date: DayKey;
  weightKg?: number;
  bodyFatPct?: number;
  muscleKg?: number;
  waterPct?: number;
  visceral?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  hipsCm?: number;
  neckCm?: number;
  note?: string;
}

export type MeasureKey = "waistCm" | "chestCm" | "armCm" | "thighCm" | "hipsCm" | "neckCm";

export type Pose = "front" | "side" | "back";

export interface ProgressPhoto extends BaseRow {
  date: DayKey;
  pose: Pose;
  blob: Blob;
  thumb: Blob;
  weightKg?: number;
  waistCm?: number;
  bodyFatPct?: number;
  note?: string;
  remotePath?: string;
}

export interface DailyLog extends BaseRow {
  date: DayKey;
  steps?: number;
  waterMl?: number;
  sleepMin?: number;
  sleepQuality?: number;
  energy?: number;
  activeKcal?: number;
  note?: string;
}

/* ─────────────── Misc ─────────────── */

export interface WeeklyReport extends BaseRow {
  weekStart: DayKey;
  aiText?: string;
}

export interface CoachMessage extends BaseRow {
  role: "user" | "assistant";
  content: string;
}

export interface KV {
  key: string;
  value: unknown;
}

export interface Tombstone {
  id: string;
  table: string;
  deletedAt: string;
}

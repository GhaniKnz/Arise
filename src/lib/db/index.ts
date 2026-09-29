import Dexie, { type EntityTable } from "dexie";
import type {
  BodyMetric,
  CardioSession,
  CoachMessage,
  CustomExercise,
  DailyLog,
  Favorite,
  FoodEntry,
  FoodRow,
  KV,
  Profile,
  ProgressPhoto,
  Recipe,
  Routine,
  SavedMeal,
  Session,
  Tombstone,
  WeeklyReport,
  WorkoutSet,
} from "./types";

export class AriseDB extends Dexie {
  profile!: EntityTable<Profile, "id">;
  foods!: EntityTable<FoodRow, "id">;
  favorites!: EntityTable<Favorite, "id">;
  foodEntries!: EntityTable<FoodEntry, "id">;
  meals!: EntityTable<SavedMeal, "id">;
  recipes!: EntityTable<Recipe, "id">;
  customExercises!: EntityTable<CustomExercise, "id">;
  routines!: EntityTable<Routine, "id">;
  sessions!: EntityTable<Session, "id">;
  sets!: EntityTable<WorkoutSet, "id">;
  cardio!: EntityTable<CardioSession, "id">;
  bodyMetrics!: EntityTable<BodyMetric, "id">;
  photos!: EntityTable<ProgressPhoto, "id">;
  dailyLogs!: EntityTable<DailyLog, "id">;
  reports!: EntityTable<WeeklyReport, "id">;
  coachMessages!: EntityTable<CoachMessage, "id">;
  kv!: EntityTable<KV, "key">;
  tombstones!: EntityTable<Tombstone, "id">;

  constructor(name = "arise") {
    super(name);
    this.version(1).stores({
      profile: "id, updatedAt",
      foods: "id, name, barcode, updatedAt",
      favorites: "id, &foodId, updatedAt",
      foodEntries: "id, date, [date+meal], foodId, updatedAt",
      meals: "id, name, updatedAt",
      recipes: "id, name, updatedAt",
      customExercises: "id, name, updatedAt",
      routines: "id, name, updatedAt",
      sessions: "id, date, status, routineId, updatedAt",
      sets: "id, sessionId, exerciseId, date, updatedAt",
      cardio: "id, date, updatedAt",
      bodyMetrics: "id, &date, updatedAt",
      photos: "id, date, pose, updatedAt",
      dailyLogs: "id, &date, updatedAt",
      reports: "id, &weekStart, updatedAt",
      coachMessages: "id, createdAt, updatedAt",
      kv: "key",
      tombstones: "id, table",
    });
  }
}

/** Tables mirrored to the cloud when sync is enabled (kv & tombstones stay local). */
export const SYNCED_TABLES = [
  "profile",
  "foods",
  "favorites",
  "foodEntries",
  "meals",
  "recipes",
  "customExercises",
  "routines",
  "sessions",
  "sets",
  "cardio",
  "bodyMetrics",
  "photos",
  "dailyLogs",
  "reports",
  "coachMessages",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export const db = new AriseDB();

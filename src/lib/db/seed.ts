import { db } from "./index";
import { stamp } from "./repo";
import type {
  ActivityLevel,
  BodyMetric,
  CardioSession,
  DailyLog,
  Experience,
  FoodEntry,
  GoalType,
  Ingredient,
  MealSlot,
  Profile,
  ProgressPhoto,
  Recipe,
  Routine,
  SavedMeal,
  Session,
  Sex,
  WorkoutSet,
} from "./types";
import { computeTargets, defaultWeeklyRatePct } from "@/lib/domain/energy";
import { ALL_QUESTS } from "@/lib/domain/game";
import { scaleNutrients } from "@/lib/domain/nutrition";
import { FOOD_BY_ID } from "@/lib/data/foods";
import { TEMPLATES, splitFor } from "@/lib/data/routines";
import { addDays, todayKey, weekdayIndex, type DayKey } from "@/lib/utils/date";

export interface OnboardingAnswers {
  name: string;
  goal: GoalType;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  sessionsPerWeek: number;
  experience: Experience;
}

export function previewTargets(a: OnboardingAnswers) {
  return computeTargets({
    sex: a.sex,
    age: a.age,
    heightCm: a.heightCm,
    weightKg: a.weightKg,
    activity: a.activity,
    goal: a.goal,
    weeklyRatePct: defaultWeeklyRatePct(a.goal, a.experience),
    targetWeightKg: a.targetWeightKg,
  });
}

/** Creates the profile, default routines and weekly schedule. */
export async function createProfile(a: OnboardingAnswers, opts: { startDate?: DayKey; schedule?: (string | null)[] } = {}) {
  const t = previewTargets(a);
  const split = splitFor(a.sessionsPerWeek, a.experience);
  const routines = split.templates.map((key) => {
    const tpl = TEMPLATES[key];
    return stamp<Routine>({ name: tpl.name, type: tpl.type, exercises: tpl.exercises.map((e) => ({ ...e })) });
  });
  const keyToId = new Map(split.templates.map((k, i) => [k, routines[i].id]));
  const scheduleKeys = opts.schedule ?? split.schedule;
  const schedule = scheduleKeys.map((k) => (k ? (keyToId.get(k) ?? null) : null));
  const startDate = opts.startDate ?? todayKey();
  const { maintenance: _m, dailyDelta: _d, ...targets } = t;

  const profile = stamp<Profile>({
    id: "me",
    name: a.name.trim() || "Chasseur",
    sex: a.sex,
    birthYear: new Date().getFullYear() - a.age,
    heightCm: a.heightCm,
    startWeightKg: a.weightKg,
    targetWeightKg: a.targetWeightKg,
    goal: a.goal,
    activity: a.activity,
    sessionsPerWeek: a.sessionsPerWeek,
    experience: a.experience,
    weeklyRatePct: defaultWeeklyRatePct(a.goal, a.experience),
    targets,
    targetsMode: "auto",
    schedule,
    quests: [...ALL_QUESTS],
    restTimerSec: 90,
    sound: true,
    vibration: true,
    effects: "full",
    startDate,
    onboardedAt: new Date().toISOString(),
  });

  await db.transaction("rw", [db.profile, db.routines, db.bodyMetrics], async () => {
    await db.profile.put(profile);
    await db.routines.bulkAdd(routines);
    const existing = await db.bodyMetrics.where("date").equals(startDate).first();
    if (!existing) await db.bodyMetrics.add(stamp<BodyMetric>({ date: startDate, weightKg: a.weightKg }));
  });
  return { profile, routines };
}

export async function clearAllData() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

/* ───────────────────────── Demo data ───────────────────────── */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Plate = [foodKey: string, grams: number][];

const MEAL_PLAN: Record<MealSlot, Plate[]> = {
  breakfast: [
    [["oats", 60], ["milk_semi", 250], ["banana", 120], ["whey", 30]],
    [["egg", 150], ["bread_whole", 80], ["skyr", 250], ["orange", 150]],
    [["fromage_blanc_0", 350], ["muesli", 50], ["blueberries", 100], ["whey", 15]],
  ],
  lunch: [
    [["chicken_breast_cooked", 180], ["rice_white_cooked", 240], ["broccoli", 150], ["olive_oil", 10]],
    [["ground_beef_5", 150], ["pasta_cooked", 240], ["tomato_sauce", 100], ["parmesan", 10], ["lettuce", 50]],
    [["salmon", 150], ["quinoa_cooked", 200], ["green_beans", 150], ["olive_oil", 5]],
    [["poke", 450], ["skyr", 150]],
  ],
  dinner: [
    [["turkey_cutlet", 180], ["potato_boiled", 300], ["zucchini", 200], ["olive_oil", 10]],
    [["omelette", 160], ["ham", 90], ["bread_whole", 80], ["lettuce", 80], ["tomato", 120]],
    [["cod", 220], ["sweet_potato", 280], ["spinach", 150], ["cream_15", 30]],
    [["chicken_thigh", 150], ["couscous_cooked", 180], ["ratatouille", 200]],
  ],
  snack: [
    [["skyr", 150], ["apple", 150]],
    [["protein_bar", 60], ["clementine", 75]],
    [["whey", 30], ["banana", 120], ["almonds", 15]],
    [["greek_yogurt_0", 170], ["honey", 10]],
  ],
};

const TREATS: Plate[] = [[["pizza", 300]], [["burger", 120], ["fries", 120]], [["cookie", 50]], [["dark_choc", 30]], [["beer", 500]]];

function entryFor(date: DayKey, meal: MealSlot, key: string, grams: number): FoodEntry {
  const food = FOOD_BY_ID.get(`b:${key}`);
  if (!food) throw new Error(`Unknown demo food ${key}`);
  const n = scaleNutrients(food, grams);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return stamp<FoodEntry>({
    date,
    meal,
    foodId: food.id,
    name: food.name,
    grams: Math.round(grams),
    per100: { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber, sugar: food.sugar, satFat: food.satFat, salt: food.salt },
    nova: food.nova,
    category: food.category,
    source: "search",
    kcal: Math.round(n.kcal),
    protein: r1(n.protein),
    carbs: r1(n.carbs),
    fat: r1(n.fat),
    fiber: r1(n.fiber),
    sugar: r1(n.sugar),
    satFat: r1(n.satFat),
    salt: Math.round(n.salt * 100) / 100,
  });
}

const BASE_LOADS: Record<string, [weight: number, reps: number]> = {
  bench_press: [72.5, 7],
  incline_db_press: [26, 9],
  db_shoulder_press: [22, 9],
  lateral_raise: [10, 13],
  cable_fly: [15, 13],
  triceps_pushdown: [25, 11],
  pull_up: [0, 7],
  barbell_row: [62.5, 9],
  lat_pulldown: [57.5, 11],
  face_pull: [20, 13],
  incline_curl: [12, 10],
  hammer_curl: [14, 11],
  back_squat: [95, 6],
  rdl: [85, 9],
  leg_press: [170, 11],
  lying_leg_curl: [40, 11],
  standing_calf_raise: [60, 12],
  hanging_leg_raise: [0, 11],
  ez_curl: [30, 11],
  seated_leg_curl: [45, 11],
  bulgarian_split_squat: [20, 10],
  cable_crunch: [40, 12],
};

async function placeholderPhoto(label: string, hue: number, shrink: number): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 540;
  c.height = 720;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, `hsl(${hue} 45% 14%)`);
  g.addColorStop(1, "#05070D");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 540, 720);
  // Stylised silhouette
  ctx.fillStyle = `hsla(${hue} 80% 65% / 0.35)`;
  ctx.beginPath();
  ctx.arc(270, 150, 52, 0, Math.PI * 2);
  ctx.fill();
  const waist = 92 - shrink;
  ctx.beginPath();
  ctx.moveTo(150, 230);
  ctx.quadraticCurveTo(270, 200, 390, 230);
  ctx.lineTo(270 + waist, 470);
  ctx.lineTo(270 + 70, 690);
  ctx.lineTo(270 - 70, 690);
  ctx.lineTo(270 - waist, 470);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(232,236,248,0.85)";
  ctx.font = "600 30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 270, 60);
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "rgba(232,236,248,0.5)";
  ctx.fillText("Photo de démonstration", 270, 92);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/jpeg", 0.8));
}

/** Replaces all data with ~45 days of realistic demo history. */
export async function seedDemo(days = 45) {
  await clearAllData();
  const today = todayKey();
  const start = addDays(today, -(days - 1));
  const rand = rng(20260929);
  const noise = (amp: number) => (rand() * 2 - 1) * amp;

  const { routines, profile } = await createProfile(
    { name: "Ghani", goal: "cut", sex: "male", age: 28, heightCm: 178, weightKg: 80, targetWeightKg: 73, activity: "moderate", sessionsPerWeek: 4, experience: "intermediate" },
    { startDate: start, schedule: ["push", "pull", null, "legs", "upper", null, null] },
  );
  // createProfile adds a start weigh-in; demo metrics below replace it.
  await db.bodyMetrics.clear();
  const routineByDay = profile.schedule;
  const routineMap = new Map(routines.map((r) => [r.id, r]));

  const entries: FoodEntry[] = [];
  const logs: DailyLog[] = [];
  const metrics: BodyMetric[] = [];
  const sessions: Session[] = [];
  const sets: WorkoutSet[] = [];
  const cardio: CardioSession[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const isToday = date === today;
    const wd = weekdayIndex(date);
    const weekend = wd >= 5;
    const progress = i / days;

    // Weight: steady trend with water noise, lighter on Monday after the weekend.
    if (rand() > 0.12 || i === 0 || isToday) {
      const trend = 80 - 0.075 * i;
      const weight = Math.round((trend + noise(0.45) + (wd === 0 ? 0.35 : 0)) * 10) / 10;
      const m: Partial<BodyMetric> = { weightKg: weight };
      if (i % 7 === 0 || isToday) {
        m.bodyFatPct = Math.round((20.2 - 2.4 * progress + noise(0.4)) * 10) / 10;
        m.muscleKg = Math.round((36.4 + 0.2 * progress + noise(0.2)) * 10) / 10;
        m.waterPct = Math.round((56 + noise(0.8)) * 10) / 10;
        m.visceral = 8;
        m.waistCm = Math.round((88.5 - 4 * progress + noise(0.3)) * 10) / 10;
        m.chestCm = Math.round((101 - 1 * progress) * 10) / 10;
        m.armCm = Math.round((36.5 + noise(0.2)) * 10) / 10;
        m.thighCm = Math.round((58 - 1.2 * progress) * 10) / 10;
        m.hipsCm = Math.round((98 - 2 * progress) * 10) / 10;
      }
      metrics.push(stamp<BodyMetric>({ date, ...m }));
    }

    // Nutrition (today only has breakfast + lunch logged).
    const skipDay = !isToday && rand() < 0.05;
    if (!skipDay) {
      const slots: MealSlot[] = isToday ? ["breakfast", "lunch", "snack"] : ["breakfast", "lunch", "dinner", "snack"];
      const scale = 0.97 + rand() * 0.12;
      for (const slot of slots) {
        const plans = MEAL_PLAN[slot];
        let plate = plans[Math.floor(rand() * plans.length)];
        if (slot === "dinner" && weekend && rand() < 0.45) plate = TREATS[Math.floor(rand() * 2)];
        for (const [key, g] of plate) entries.push(entryFor(date, slot, key, g * scale));
      }
      if (weekend && !isToday && rand() < 0.5) {
        const [key, g] = TREATS[2 + Math.floor(rand() * 3)][0];
        entries.push(entryFor(date, "snack", key, g));
      }
    }

    // Daily log
    const sleep = Math.round(390 + rand() * 110 + (weekend ? 30 : 0));
    logs.push(
      stamp<DailyLog>({
        date,
        steps: isToday ? 6420 : Math.round((weekend ? 7000 : 8500) + noise(2800) + progress * 1500),
        waterMl: isToday ? 1750 : Math.round((2250 + rand() * 1000) / 250) * 250,
        sleepMin: sleep,
        sleepQuality: Math.min(5, Math.max(2, Math.round(sleep / 100))),
        energy: Math.min(10, Math.max(4, Math.round(5 + (sleep - 390) / 40 + noise(1.2)))),
      }),
    );

    // Training
    const routineId = routineByDay[wd];
    const skipped = rand() < 0.1;
    if (routineId && !skipped && !isToday) {
      const routine = routineMap.get(routineId)!;
      const startH = 18 + Math.floor(rand() * 2);
      const startedAt = new Date(`${date}T${String(startH).padStart(2, "0")}:${String(Math.floor(rand() * 50)).padStart(2, "0")}:00`);
      const session = stamp<Session>({
        date,
        routineId,
        name: routine.name,
        type: routine.type,
        startedAt: startedAt.toISOString(),
        endedAt: new Date(startedAt.getTime() + (58 + Math.floor(rand() * 22)) * 60_000).toISOString(),
        status: "done",
        exerciseIds: routine.exercises.map((e) => e.exerciseId),
        rpe: 7 + Math.floor(rand() * 3),
      });
      sessions.push(session);
      let t = startedAt.getTime();
      const week = Math.floor(i / 7);
      routine.exercises.forEach((ex) => {
        const [baseW, baseR] = BASE_LOADS[ex.exerciseId] ?? [20, 10];
        const inc = baseW >= 60 ? 2.5 : baseW > 0 ? 1 : 0;
        const weight = baseW > 0 ? baseW + inc * Math.floor(week * 0.8) : 0;
        for (let s = 0; s < ex.sets; s++) {
          t += (ex.restSec + 45) * 1000;
          const reps = Math.max(ex.repsMin, Math.min(ex.repsMax + 1, baseR + (week % 2) + (baseW === 0 ? Math.floor(week / 2) : 0) - s));
          sets.push(
            stamp<WorkoutSet>({
              sessionId: session.id,
              exerciseId: ex.exerciseId,
              date,
              order: s,
              weightKg: weight,
              reps,
              rpe: 7 + s,
              warmup: false,
              done: true,
              completedAt: new Date(t).toISOString(),
            }),
          );
        }
      });
    }

    if (!isToday && (wd === 2 || wd === 5) && rand() > 0.2) {
      cardio.push(stamp<CardioSession>({ date, type: "incline_walk", durationMin: 35 + Math.floor(rand() * 15), speedKmh: 5.5, inclinePct: 10, kcal: 330 + Math.floor(rand() * 90) }));
    }
  }

  const ing = (key: string, grams: number): Ingredient => {
    const f = FOOD_BY_ID.get(`b:${key}`)!;
    return { foodId: f.id, name: f.name, grams, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, satFat: f.satFat, salt: f.salt }, nova: f.nova, category: f.category };
  };
  const meals = [
    stamp<SavedMeal>({ name: "Petit déjeuner habituel", defaultSlot: "breakfast", items: [ing("egg", 150), ing("bread_whole", 80), ing("banana", 120), ing("skyr", 150)] }),
    stamp<SavedMeal>({ name: "Shaker post-training", defaultSlot: "snack", items: [ing("whey", 30), ing("milk_semi", 250), ing("banana", 120)] }),
  ];
  const recipes = [
    stamp<Recipe>({
      name: "Butter Chicken Fitness",
      servings: 2,
      items: [ing("chicken_breast_raw", 400), ing("rice_white_cooked", 500), ing("fromage_blanc_0", 150), ing("tomato_sauce", 200), ing("cream_15", 60), ing("onion", 100), ing("butter", 10)],
      notes: "Mariner le poulet dans le fromage blanc + épices (garam masala, curcuma, paprika). Saisir, ajouter oignon, sauce tomate, crème. Servir avec le riz.",
    }),
  ];

  const photos: ProgressPhoto[] = [];
  const photoDays: [number, string, number][] = [
    [0, "Jour 1", 0],
    [21, "Semaine 3", 8],
    [days - 1, "Aujourd'hui", 16],
  ];
  for (const [offset, label, shrink] of photoDays) {
    const blob = await placeholderPhoto(label, 230, shrink);
    if (!blob) continue;
    const date = addDays(start, offset);
    const m = metrics.filter((x) => x.date <= date).at(-1);
    photos.push(stamp<ProgressPhoto>({ date, pose: "front", blob, thumb: blob, weightKg: m?.weightKg, waistCm: metrics.filter((x) => x.date <= date && x.waistCm).at(-1)?.waistCm }));
  }

  await db.transaction("rw", [db.foodEntries, db.dailyLogs, db.bodyMetrics, db.sessions, db.sets, db.cardio, db.meals, db.recipes, db.photos, db.favorites, db.kv], async () => {
    await db.foodEntries.bulkAdd(entries);
    await db.dailyLogs.bulkAdd(logs);
    await db.bodyMetrics.bulkAdd(metrics);
    await db.sessions.bulkAdd(sessions);
    await db.sets.bulkAdd(sets);
    await db.cardio.bulkAdd(cardio);
    await db.meals.bulkAdd(meals);
    await db.recipes.bulkAdd(recipes);
    if (photos.length) await db.photos.bulkAdd(photos);
    await db.favorites.bulkAdd(["b:chicken_breast_cooked", "b:skyr", "b:egg", "b:rice_white_cooked", "b:whey"].map((foodId) => stamp({ foodId })));
    await db.kv.put({ key: "demo", value: true });
  });
}

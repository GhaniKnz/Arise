import type { ActivityLevel, GoalType, Sex, Targets } from "@/lib/db/types";
import { clamp, round } from "@/lib/utils/format";

/** Energy value of body mass change used for projections (kcal per kg). */
export const KCAL_PER_KG = 7700;

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: "Sédentaire", hint: "Travail assis, < 5 000 pas/jour" },
  light: { label: "Légèrement actif", hint: "5 000–7 500 pas ou 1–3 séances/semaine" },
  moderate: { label: "Modérément actif", hint: "7 500–10 000 pas + 3–5 séances/semaine" },
  active: { label: "Très actif", hint: "> 10 000 pas + 5–6 séances/semaine" },
  very_active: { label: "Extrêmement actif", hint: "Travail physique + entraînement quotidien" },
};

export const GOAL_LABELS: Record<GoalType, { label: string; hint: string }> = {
  cut: { label: "Perdre du gras", hint: "Sèche : déficit modéré, protéines hautes" },
  bulk: { label: "Construire du muscle", hint: "Léger surplus, surcharge progressive" },
  recomp: { label: "Recomposition", hint: "Perdre du gras et gagner du muscle en même temps" },
  maintain: { label: "Maintenir", hint: "Stabiliser le poids, améliorer la forme" },
};

export interface BodyInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
}

/** Mifflin-St Jeor (1990). Katch-McArdle when body fat is known and plausible. */
export function bmr({ sex, age, heightCm, weightKg, bodyFatPct }: BodyInput): number {
  if (bodyFatPct != null && bodyFatPct > 3 && bodyFatPct < 60) {
    const lean = weightKg * (1 - bodyFatPct / 100);
    return 370 + 21.6 * lean;
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function maintenanceKcal(input: BodyInput, activity: ActivityLevel): number {
  return bmr(input) * ACTIVITY_FACTORS[activity];
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiLabel(value: number): string {
  if (value < 18.5) return "Insuffisance pondérale";
  if (value < 25) return "Corpulence normale";
  if (value < 30) return "Surpoids";
  return "Obésité";
}

/** Default weekly rate (% of body weight) per goal. */
export function defaultWeeklyRatePct(goal: GoalType, experience: "beginner" | "intermediate" | "advanced"): number {
  switch (goal) {
    case "cut":
      return 0.6;
    case "bulk":
      return experience === "beginner" ? 0.25 : experience === "intermediate" ? 0.18 : 0.12;
    case "recomp":
      return 0.25;
    case "maintain":
      return 0;
  }
}

export interface TargetInput extends BodyInput {
  activity: ActivityLevel;
  goal: GoalType;
  weeklyRatePct: number;
  targetWeightKg?: number;
  /** When known, observed maintenance replaces the formula. */
  adaptiveTdee?: number;
}

export interface TargetResult extends Targets {
  maintenance: number;
  dailyDelta: number;
}

/**
 * Initial targets. They are starting points: the adaptive maintenance estimate
 * (see trend.ts) should replace the formula once enough data is logged.
 */
export function computeTargets(input: TargetInput): TargetResult {
  const maintenance = input.adaptiveTdee ?? maintenanceKcal(input, input.activity);
  const weeklyKg = (input.weightKg * input.weeklyRatePct) / 100;
  let delta = (weeklyKg * KCAL_PER_KG) / 7;

  let kcal: number;
  switch (input.goal) {
    case "cut":
      // Cap the deficit at 25 % of maintenance to protect performance and lean mass.
      delta = Math.min(delta, maintenance * 0.25);
      kcal = maintenance - delta;
      break;
    case "bulk":
      delta = Math.min(delta, 500);
      kcal = maintenance + delta;
      break;
    case "recomp":
      delta = Math.min(delta, maintenance * 0.12);
      kcal = maintenance - delta;
      break;
    case "maintain":
      delta = 0;
      kcal = maintenance;
      break;
  }

  const floor = input.sex === "male" ? 1500 : 1200;
  kcal = Math.max(floor, round(kcal, 10));

  // Protein: per kg of body weight; for higher body fat use the goal weight as reference.
  const proteinPerKg = input.goal === "cut" ? 2.1 : input.goal === "recomp" ? 2.0 : input.goal === "bulk" ? 1.8 : 1.7;
  const highFat =
    (input.bodyFatPct != null && input.bodyFatPct > (input.sex === "male" ? 25 : 32)) ||
    bmi(input.weightKg, input.heightCm) > 30;
  const refWeight = highFat && input.targetWeightKg ? input.targetWeightKg : input.weightKg;
  const protein = round(refWeight * proteinPerKg, 5);

  const fat = Math.max(round((kcal * 0.27) / 9, 5), round(input.weightKg * 0.6, 5));
  const carbs = Math.max(50, round((kcal - protein * 4 - fat * 9) / 4, 5));
  const fiber = clamp(round((kcal / 1000) * 14, 1), 25, 45);

  const waterMl = clamp(round(input.weightKg * 35, 250), 2000, 4500);
  const steps = input.goal === "cut" ? 10_000 : input.goal === "bulk" ? 7_000 : 8_500;

  return {
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    waterMl,
    steps,
    sleepMin: 450,
    maintenance: round(maintenance, 10),
    dailyDelta: round(kcal - maintenance, 10),
  };
}

/** Rough MET-based cardio estimate when the user doesn't provide calories. */
export const CARDIO_MET: Record<string, number> = {
  walk: 3.5,
  incline_walk: 6,
  run: 9.8,
  bike: 7,
  rower: 7,
  elliptical: 5,
  stairs: 8.8,
  swim: 7,
  hiit: 8,
  sport: 7,
  other: 5,
};

export function cardioKcal(type: string, durationMin: number, weightKg: number, inclinePct?: number, speedKmh?: number): number {
  let met = CARDIO_MET[type] ?? 5;
  if ((type === "incline_walk" || type === "walk") && inclinePct != null) {
    // ACSM walking equation, VO2 (ml/kg/min) = 0.1·speed + 1.8·speed·grade + 3.5
    const speed = ((speedKmh ?? 5) * 1000) / 60;
    const vo2 = 0.1 * speed + 1.8 * speed * (inclinePct / 100) + 3.5;
    met = vo2 / 3.5;
  }
  return Math.round((met * 3.5 * weightKg * durationMin) / 200);
}

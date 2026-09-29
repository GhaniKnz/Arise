import type { EntryNutrients, FoodEntry, FoodItem, GoalType, Ingredient, MealSlot, Nova, Nutrients } from "@/lib/db/types";
import { clamp } from "@/lib/utils/format";

export const MEAL_SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: "breakfast", label: "Petit-déjeuner", emoji: "🌅" },
  { id: "lunch", label: "Déjeuner", emoji: "☀️" },
  { id: "dinner", label: "Dîner", emoji: "🌙" },
  { id: "snack", label: "Collations", emoji: "⚡" },
];

export const MEAL_LABEL: Record<MealSlot, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

/** Suggest a meal slot from the time of day. */
export function mealForHour(hour: number): MealSlot {
  if (hour < 10.5) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour >= 18.5) return "dinner";
  return "snack";
}

export const EMPTY_TOTALS: EntryNutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, salt: 0 };

export function scaleNutrients(per100: Nutrients, grams: number): EntryNutrients {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
    fiber: (per100.fiber ?? 0) * f,
    sugar: (per100.sugar ?? 0) * f,
    satFat: (per100.satFat ?? 0) * f,
    salt: (per100.salt ?? 0) * f,
  };
}

export function addTotals(a: EntryNutrients, b: EntryNutrients): EntryNutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
    satFat: a.satFat + b.satFat,
    salt: a.salt + b.salt,
  };
}

export function totalsOf(entries: Pick<FoodEntry, keyof EntryNutrients>[]): EntryNutrients {
  return entries.reduce<EntryNutrients>((acc, e) => addTotals(acc, e), { ...EMPTY_TOTALS });
}

export function ingredientsTotals(items: Ingredient[]): EntryNutrients & { grams: number } {
  const t = items.reduce<EntryNutrients>((acc, it) => addTotals(acc, scaleNutrients(it.per100, it.grams)), { ...EMPTY_TOTALS });
  return { ...t, grams: items.reduce((a, it) => a + it.grams, 0) };
}

/** Per-100 g profile of a composed dish (recipe or meal). */
export function per100OfIngredients(items: Ingredient[]): Nutrients {
  const t = ingredientsTotals(items);
  if (t.grams <= 0) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const f = 100 / t.grams;
  return {
    kcal: t.kcal * f,
    protein: t.protein * f,
    carbs: t.carbs * f,
    fat: t.fat * f,
    fiber: t.fiber * f,
    sugar: t.sugar * f,
    satFat: t.satFat * f,
    salt: t.salt * f,
  };
}

/** Atwater check — kcal from macros. Useful to detect inconsistent imported data. */
export function kcalFromMacros(n: Pick<Nutrients, "protein" | "carbs" | "fat">): number {
  return n.protein * 4 + n.carbs * 4 + n.fat * 9;
}

export function macroSplit(n: Pick<Nutrients, "protein" | "carbs" | "fat">): { protein: number; carbs: number; fat: number } {
  const p = n.protein * 4;
  const c = n.carbs * 4;
  const f = n.fat * 9;
  const total = p + c + f || 1;
  return { protein: p / total, carbs: c / total, fat: f / total };
}

/* ───────────────────────── Nutrition score ───────────────────────── */

export type ScoreTier = "excellent" | "great" | "ok" | "moderate" | "occasional";

export interface ScoreReason {
  kind: "plus" | "minus" | "info";
  text: string;
}

export interface NutritionScore {
  score: number;
  tier: ScoreTier;
  label: string;
  reasons: ScoreReason[];
  verdict: string;
}

export const TIER_META: Record<ScoreTier, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "var(--color-good)" },
  great: { label: "Très bon", color: "var(--color-arise)" },
  ok: { label: "Correct", color: "var(--color-violet-2)" },
  moderate: { label: "À doser", color: "var(--color-warn)" },
  occasional: { label: "Plaisir occasionnel", color: "var(--color-rose)" },
};

export function tierFor(score: number): ScoreTier {
  if (score >= 80) return "excellent";
  if (score >= 65) return "great";
  if (score >= 45) return "ok";
  if (score >= 25) return "moderate";
  return "occasional";
}

type ScoreInput = Nutrients & { nova?: Nova; category?: FoodItem["category"]; unit?: "g" | "ml"; alcohol?: boolean };

/**
 * Contextual score (0–100) of a food *for the user's goal*, not a moral judgement.
 * Signals: protein density, energy density (satiety proxy), fibre, sugars,
 * saturated fat, salt and processing level (NOVA).
 */
export function nutritionScore(food: ScoreInput, goal: GoalType = "cut"): NutritionScore {
  const reasons: ScoreReason[] = [];
  const kcal = Math.max(food.kcal, 1);
  const per100kcal = (g: number | undefined) => ((g ?? 0) / kcal) * 100;

  const proteinDensity = per100kcal(food.protein); // g protein / 100 kcal
  const fiberDensity = per100kcal(food.fiber);
  const sugarDensity = per100kcal(food.sugar);
  const satDensity = per100kcal(food.satFat);
  const energyDensity = food.kcal / 100; // kcal per g
  const isDrink = food.unit === "ml" || food.category === "drinks";

  const pScore = clamp(proteinDensity / 9, 0, 1);
  // Powders are diluted before consumption: energy density is not meaningful for them.
  const edScore = food.category === "supplements" ? 0.7 : clamp((4 - energyDensity) / 3.2, 0, 1);
  const fScore = clamp(fiberDensity / 3, 0, 1);
  const sugarPenalty = food.sugar == null ? 0 : clamp((sugarDensity - 6) / 14, 0, 1) * (fiberDensity > 1.5 ? 0.4 : 1);
  const satPenalty = food.satFat == null ? 0 : clamp((satDensity - 1.2) / 3, 0, 1);
  const saltPenalty = food.salt == null ? 0 : clamp((food.salt - 0.4) / 1.6, 0, 1);

  const w =
    goal === "cut"
      ? { p: 30, ed: 20, f: 10 }
      : goal === "bulk"
        ? { p: 26, ed: 8, f: 10 }
        : { p: 28, ed: 14, f: 10 };

  // Weight not spent on signals becomes a flat allowance, so every goal shares the same 0–100 scale.
  const flat = (60 - (w.p + w.ed + w.f)) * 0.6;
  let score = 40 + flat + w.p * pScore + w.ed * edScore + w.f * fScore - 22 * sugarPenalty - 10 * satPenalty - 8 * saltPenalty;

  switch (food.nova) {
    case 1:
      score += 5;
      break;
    case 2:
      score += 0;
      break;
    case 3:
      score -= 2;
      break;
    case 4:
      score -= 10;
      break;
  }

  if (food.kcal < 5) score = Math.max(score, 70);
  if (isDrink && sugarDensity > 15) score -= 15;

  if (food.salt != null && food.salt > 5) score = Math.min(score, 45);
  if (food.alcohol) score = Math.min(score, 30);

  score = Math.round(clamp(score, 1, 99));

  // Reasons — phrased as information, never as guilt.
  if (proteinDensity >= 8) reasons.push({ kind: "plus", text: "Excellent apport en protéines" });
  else if (proteinDensity >= 4) reasons.push({ kind: "plus", text: "Bon apport en protéines" });
  else if (food.kcal > 80 && proteinDensity < 1.5) reasons.push({ kind: "minus", text: "Peu de protéines" });

  if (energyDensity <= 1.2 && !isDrink) reasons.push({ kind: "plus", text: "Faible densité calorique : rassasie pour peu de calories" });
  else if (energyDensity >= 4) reasons.push({ kind: "minus", text: "Très dense en calories : les portions comptent vite" });
  else if (energyDensity >= 2.8) reasons.push({ kind: "info", text: "Densité calorique élevée" });

  if (fiberDensity >= 2) reasons.push({ kind: "plus", text: "Riche en fibres : bonne satiété" });
  if (food.sugar != null && sugarDensity > 12 && fiberDensity < 1.5) reasons.push({ kind: "minus", text: "Riche en sucres" });
  if (food.satFat != null && satDensity > 3) reasons.push({ kind: "minus", text: "Riche en graisses saturées" });
  if (food.salt != null && food.salt > 5) reasons.push({ kind: "minus", text: "Très salé : à utiliser en petite quantité" });
  else if (food.salt != null && food.salt > 1.5) reasons.push({ kind: "minus", text: "Assez salé" });
  if (food.alcohol) reasons.push({ kind: "minus", text: "Alcool : calories peu rassasiantes, peut freiner la récupération" });

  if (food.kcal < 5) reasons.push({ kind: "info", text: "Quasiment sans calories" });
  if (food.nova === 1) reasons.push({ kind: "plus", text: "Aliment brut ou peu transformé" });
  if (food.nova === 4) reasons.push({ kind: "minus", text: "Ultra-transformé : souvent moins rassasiant" });

  const tier = tierFor(score);
  return { score, tier, label: TIER_META[tier].label, reasons, verdict: verdictFor(tier, goal) };
}

function verdictFor(tier: ScoreTier, goal: GoalType): string {
  const goalWord = goal === "cut" ? "ta sèche" : goal === "bulk" ? "ta prise de muscle" : goal === "recomp" ? "ta recomposition" : "ton maintien";
  switch (tier) {
    case "excellent":
      return `Très adapté à ${goalWord}.`;
    case "great":
      return `Bon choix pour ${goalWord}.`;
    case "ok":
      return "S'intègre bien dans une journée équilibrée.";
    case "moderate":
      return "À doser : garde un œil sur la portion.";
    case "occasional":
      return "Peut être consommé occasionnellement dans ton objectif calorique.";
  }
}

/** Calorie-weighted average score of a list of entries (for a meal or a day). */
export function entriesScore(entries: Pick<FoodEntry, "kcal" | "per100" | "nova" | "category">[], goal: GoalType): number | null {
  let weight = 0;
  let acc = 0;
  for (const e of entries) {
    if (!e.per100 || e.kcal <= 0) continue;
    const s = nutritionScore({ ...e.per100, nova: e.nova, category: e.category }, goal).score;
    acc += s * e.kcal;
    weight += e.kcal;
  }
  return weight > 0 ? Math.round(acc / weight) : null;
}

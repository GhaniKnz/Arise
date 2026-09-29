import { db } from "../index";
import { insert, patch, remove, stamp } from "../repo";
import type { EntrySource, FoodEntry, FoodItem, FoodRow, Ingredient, MealSlot, Nutrients, Recipe, SavedMeal } from "../types";
import { per100OfIngredients, scaleNutrients } from "@/lib/domain/nutrition";
import type { DayKey } from "@/lib/utils/date";

const r1 = (n: number) => Math.round(n * 10) / 10;

function snapshot(per100: Nutrients, grams: number) {
  const n = scaleNutrients(per100, grams);
  return {
    kcal: Math.round(n.kcal),
    protein: r1(n.protein),
    carbs: r1(n.carbs),
    fat: r1(n.fat),
    fiber: r1(n.fiber),
    sugar: r1(n.sugar),
    satFat: r1(n.satFat),
    salt: Math.round(n.salt * 100) / 100,
  };
}

function per100Of(food: Nutrients): Nutrients {
  const { kcal, protein, carbs, fat, fiber, sugar, satFat, salt } = food;
  return { kcal, protein, carbs, fat, fiber, sugar, satFat, salt };
}

export async function logFood(opts: { date: DayKey; meal: MealSlot; food: FoodItem; grams: number; source?: EntrySource }) {
  const { date, meal, food, grams } = opts;
  if (food.source !== "builtin") await ensureFoodCached(food);
  return insert<FoodEntry>(db.foodEntries, {
    date,
    meal,
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    grams,
    per100: per100Of(food),
    nova: food.nova,
    category: food.category,
    source: opts.source ?? "search",
    ...snapshot(food, grams),
  });
}

export async function logIngredients(opts: { date: DayKey; meal: MealSlot; items: Ingredient[]; source: EntrySource; factor?: number }) {
  const f = opts.factor ?? 1;
  const rows = opts.items.map((it) =>
    stamp<FoodEntry>({
      date: opts.date,
      meal: opts.meal,
      foodId: it.foodId,
      name: it.name,
      grams: Math.round(it.grams * f),
      per100: it.per100,
      nova: it.nova,
      category: it.category,
      source: opts.source,
      ...snapshot(it.per100, it.grams * f),
    }),
  );
  await db.foodEntries.bulkAdd(rows);
  return rows;
}

export async function logRecipe(opts: { date: DayKey; meal: MealSlot; recipe: Recipe; servings: number }) {
  const per100 = per100OfIngredients(opts.recipe.items);
  const totalGrams = opts.recipe.items.reduce((a, it) => a + it.grams, 0);
  const grams = Math.round((totalGrams / opts.recipe.servings) * opts.servings);
  return insert<FoodEntry>(db.foodEntries, {
    date: opts.date,
    meal: opts.meal,
    name: `${opts.recipe.name}${opts.servings !== 1 ? ` ×${opts.servings}` : ""}`,
    grams,
    per100,
    source: "recipe",
    category: "prepared",
    ...snapshot(per100, grams),
  });
}

export async function quickAdd(opts: { date: DayKey; meal: MealSlot; name: string; kcal: number; protein?: number; carbs?: number; fat?: number }) {
  return insert<FoodEntry>(db.foodEntries, {
    date: opts.date,
    meal: opts.meal,
    name: opts.name || "Ajout rapide",
    grams: 0,
    source: "quick",
    kcal: Math.round(opts.kcal),
    protein: opts.protein ?? 0,
    carbs: opts.carbs ?? 0,
    fat: opts.fat ?? 0,
    fiber: 0,
    sugar: 0,
    satFat: 0,
    salt: 0,
  });
}

export async function updateEntryGrams(entry: FoodEntry, grams: number, meal?: MealSlot) {
  const changes: Partial<FoodEntry> = { grams, ...(meal ? { meal } : {}) };
  if (entry.per100) Object.assign(changes, snapshot(entry.per100, grams));
  await patch(db.foodEntries, entry.id, changes);
}

export async function moveEntry(id: string, meal: MealSlot) {
  await patch(db.foodEntries, id, { meal });
}

export const deleteEntries = (ids: string[]) => remove("foodEntries", ids);

export async function copyMeal(fromDate: DayKey, meal: MealSlot, toDate: DayKey, toMeal: MealSlot = meal) {
  const src = await db.foodEntries.where({ date: fromDate, meal }).toArray();
  const rows = src.map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => stamp<FoodEntry>({ ...rest, date: toDate, meal: toMeal }));
  await db.foodEntries.bulkAdd(rows);
  return rows.length;
}

/* ─────────────── Foods ─────────────── */

export async function ensureFoodCached(food: FoodItem) {
  const existing = await db.foods.get(food.id);
  if (existing) return existing;
  const row = stamp<FoodRow>({ ...food });
  await db.foods.put(row);
  return row;
}

export async function saveCustomFood(food: Omit<FoodItem, "id" | "source"> & { id?: string }) {
  if (food.id) {
    await patch(db.foods, food.id, food as Partial<FoodRow>);
    return food.id;
  }
  const row = await insert<FoodRow>(db.foods, { ...food, source: "custom" });
  return row.id;
}

export const deleteFood = (id: string) => remove("foods", [id]);

export async function toggleFavorite(foodId: string, food?: FoodItem) {
  const existing = await db.favorites.where("foodId").equals(foodId).first();
  if (existing) {
    await remove("favorites", [existing.id]);
    return false;
  }
  if (food && food.source !== "builtin") await ensureFoodCached(food);
  await insert(db.favorites, { foodId });
  return true;
}

/* ─────────────── Meals & recipes ─────────────── */

export async function saveMeal(meal: { id?: string; name: string; items: Ingredient[]; defaultSlot?: MealSlot }) {
  if (meal.id) {
    await patch(db.meals, meal.id, { name: meal.name, items: meal.items, defaultSlot: meal.defaultSlot });
    return meal.id;
  }
  return (await insert<SavedMeal>(db.meals, meal)).id;
}

export const deleteMeal = (id: string) => remove("meals", [id]);

export async function saveRecipe(recipe: { id?: string; name: string; servings: number; items: Ingredient[]; notes?: string }) {
  if (recipe.id) {
    await patch(db.recipes, recipe.id, { name: recipe.name, servings: recipe.servings, items: recipe.items, notes: recipe.notes });
    return recipe.id;
  }
  return (await insert<Recipe>(db.recipes, recipe)).id;
}

export const deleteRecipe = (id: string) => remove("recipes", [id]);

export function entriesToIngredients(entries: FoodEntry[]): Ingredient[] {
  return entries
    .filter((e) => e.per100 && e.grams > 0)
    .map((e) => ({ foodId: e.foodId, name: e.name, grams: e.grams, per100: e.per100!, nova: e.nova, category: e.category }));
}

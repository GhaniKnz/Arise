import { db } from "../index";
import { insert, patch, remove, stamp } from "../repo";
import type { DishSource, EntryNutrients, EntrySource, FoodEntry, FoodItem, FoodRow, Ingredient, MealSlot, Nutrients, Recipe, SavedMeal } from "../types";
import { dishNova, ingredientsTotals, per100OfIngredients, scaleNutrients } from "@/lib/domain/nutrition";
import type { DayKey } from "@/lib/utils/date";

const r1 = (n: number) => Math.round(n * 10) / 10;

function snapshot(per100: Nutrients, grams: number) {
  return rounded(scaleNutrients(per100, grams));
}

function rounded(n: EntryNutrients): EntryNutrients {
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

/* ─────────────── Composed dishes ─────────────── */

export interface DishInput {
  name: string;
  items: Ingredient[];
  sources?: DishSource[];
  dishId?: string;
}

/** Photo thumbnails (data URLs) stay on the saved dish; journal entries only keep product image URLs. */
const lightSources = (sources?: DishSource[]) => sources?.map((s) => (s.thumb?.startsWith("data:") ? { ...s, thumb: undefined } : s));

function dishFields({ name, items, sources, dishId }: DishInput) {
  const t = ingredientsTotals(items);
  const per100 = per100OfIngredients(items);
  return {
    name,
    grams: Math.round(t.grams),
    per100,
    nova: dishNova(items),
    category: "prepared" as const,
    items,
    sources: lightSources(sources),
    dishId,
    ...rounded(t),
  };
}

/** Logs a composed dish as one journal entry; its ingredients stay attached to re-edit it later. */
export async function logDish(opts: DishInput & { date: DayKey; meal: MealSlot }) {
  return insert<FoodEntry>(db.foodEntries, { date: opts.date, meal: opts.meal, source: "dish", ...dishFields(opts) });
}

export async function updateDishEntry(id: string, opts: DishInput & { meal: MealSlot }) {
  await patch(db.foodEntries, id, { meal: opts.meal, ...dishFields(opts) });
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

export async function saveMeal(meal: { id?: string; name: string; items: Ingredient[]; defaultSlot?: MealSlot; sources?: DishSource[] }) {
  if (meal.id) {
    await patch(db.meals, meal.id, { name: meal.name, items: meal.items, defaultSlot: meal.defaultSlot, sources: meal.sources });
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
  return entries.flatMap((e): Ingredient[] => {
    // A composed dish contributes its own ingredients.
    if (e.items?.length) return e.items.map(({ sourceId: _s, ...it }) => it);
    return e.per100 && e.grams > 0 ? [{ foodId: e.foodId, name: e.name, grams: e.grams, per100: e.per100, nova: e.nova, category: e.category }] : [];
  });
}

/* ─────────────── Estimation memory ─────────────── */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** What the AI should know about: the user's own products and saved meals (most recent first). */
export async function estimationMemory() {
  const foods = (await db.foods.toArray()).filter((f) => f.source === "custom" || f.source === "ai").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const meals = (await db.meals.toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    products: foods.slice(0, 200).map((f) => ({ id: f.id, name: f.name })),
    meals: meals.slice(0, 80).map((m) => ({ id: m.id, name: m.name })),
    foodsById: new Map(foods.map((f) => [f.id, f])),
    foodsByName: new Map(foods.map((f) => [norm(f.name), f])),
    mealsById: new Map(meals.map((m) => [m.id, m])),
    mealsByName: new Map(meals.map((m) => [norm(m.name), m])),
  };
}

/**
 * Saves estimated products the user doesn't have yet (source "ai"), reusing
 * existing ones by id or same name. Returns the food id for each ingredient.
 */
export async function rememberProducts(items: Ingredient[]): Promise<(string | undefined)[]> {
  const existing = (await db.foods.toArray()).filter((f) => f.source === "custom" || f.source === "ai");
  const byName = new Map(existing.map((f) => [norm(f.name), f.id]));
  const ids: (string | undefined)[] = [];
  for (const it of items) {
    if (it.foodId) {
      ids.push(it.foodId);
      continue;
    }
    const key = norm(it.name);
    const found = byName.get(key);
    if (found) {
      ids.push(found);
      continue;
    }
    const row = await insert<FoodRow>(db.foods, {
      name: it.name.trim(),
      category: it.category ?? "other",
      nova: it.nova,
      defaultGrams: Math.max(1, Math.round(it.grams)),
      ...per100Of(it.per100),
      source: "ai",
    });
    byName.set(key, row.id);
    ids.push(row.id);
  }
  return ids;
}

/** Saves a dish as a meal unless one with the same name exists. Returns [id, created]. */
export async function rememberMeal(name: string, items: Ingredient[], slot: MealSlot): Promise<[string, boolean]> {
  const same = (await db.meals.toArray()).find((m) => norm(m.name) === norm(name));
  if (same) return [same.id, false];
  return [await saveMeal({ name: name.trim(), items, defaultSlot: slot }), true];
}

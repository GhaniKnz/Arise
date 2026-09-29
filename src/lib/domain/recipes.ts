import { FOOD_BY_ID } from "@/lib/data/foods";
import { RECIPES, type CatalogRecipe, type RecipeIngredient } from "@/lib/data/recipes";
import { SHOP_BY_ID, pricePerGram, type Aisle, type ShopItem, type StoreTier } from "@/lib/data/shop";
import type { FoodItem, Ingredient, Nutrients } from "@/lib/db/types";

export interface RecipeNutrition {
  total: Required<Pick<Nutrients, "kcal" | "protein" | "carbs" | "fat" | "fiber">>;
  perServing: Required<Pick<Nutrients, "kcal" | "protein" | "carbs" | "fat" | "fiber">>;
}

const food = (ing: RecipeIngredient): FoodItem | undefined => {
  const item = SHOP_BY_ID.get(ing.item);
  return item ? FOOD_BY_ID.get(item.foodId) : undefined;
};

/** Macros computed from the food database, optional ingredients excluded unless asked. */
export function recipeNutrition(r: CatalogRecipe, withOptional = false): RecipeNutrition {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const ing of r.ingredients) {
    if (ing.optional && !withOptional) continue;
    const f = food(ing);
    if (!f) continue;
    const k = ing.g / 100;
    total.kcal += f.kcal * k;
    total.protein += f.protein * k;
    total.carbs += f.carbs * k;
    total.fat += f.fat * k;
    total.fiber += (f.fiber ?? 0) * k;
  }
  const s = r.servings;
  return { total, perServing: { kcal: total.kcal / s, protein: total.protein / s, carbs: total.carbs / s, fat: total.fat / s, fiber: total.fiber / s } };
}

export type PriceOverrides = Record<string, number>;

/** Cost of the quantities used (prorated packs), per recipe and per serving. */
export function recipeCost(r: CatalogRecipe, tier: StoreTier, overrides: PriceOverrides = {}, withOptional = false) {
  let total = 0;
  const lines: { ing: RecipeIngredient; item: ShopItem; cost: number }[] = [];
  for (const ing of r.ingredients) {
    const item = SHOP_BY_ID.get(ing.item);
    if (!item || (ing.optional && !withOptional)) continue;
    const cost = pricePerGram(item, tier, overrides[item.id]) * ing.g;
    total += cost;
    lines.push({ ing, item, cost });
  }
  return { total, perServing: total / r.servings, lines };
}

export type AutoTag = "high_protein" | "budget" | "quick";

export function autoTags(r: CatalogRecipe): AutoTag[] {
  const n = recipeNutrition(r).perServing;
  const tags: AutoTag[] = [];
  const proteinGoal = r.category === "snack" ? 15 : r.category === "breakfast" ? 25 : 30;
  if (n.protein >= proteinGoal) tags.push("high_protein");
  if (recipeCost(r, "discount").perServing <= 2.5) tags.push("budget");
  if (r.prep + r.cook <= 20) tags.push("quick");
  return tags;
}

/** Ingredients for the journal, scaled to `portions` servings. */
export function recipeToIngredients(r: CatalogRecipe, portions = 1, withOptional = false): Ingredient[] {
  const k = portions / r.servings;
  return r.ingredients
    .filter((ing) => withOptional || !ing.optional)
    .map((ing) => {
      const f = food(ing);
      const item = SHOP_BY_ID.get(ing.item);
      if (!f || !item) return null;
      return {
        foodId: f.id,
        name: f.name,
        grams: Math.max(1, Math.round(ing.g * k)),
        per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, satFat: f.satFat, salt: f.salt },
        nova: f.nova,
        category: f.category,
      } satisfies Ingredient;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export interface ShoppingLine {
  item: ShopItem;
  grams: number;
  packs: number;
  cost: number;
}

/** Packs to buy for a set of recipes (servings scaled), grouped by aisle. */
export function shoppingList(selection: { recipe: CatalogRecipe; servings: number }[], tier: StoreTier, overrides: PriceOverrides = {}, includePantry = false) {
  const grams = new Map<string, number>();
  for (const { recipe, servings } of selection) {
    const k = servings / recipe.servings;
    for (const ing of recipe.ingredients) {
      if (ing.optional) continue;
      grams.set(ing.item, (grams.get(ing.item) ?? 0) + ing.g * k);
    }
  }
  const byAisle = new Map<Aisle, ShoppingLine[]>();
  let total = 0;
  for (const [id, g] of grams) {
    const item = SHOP_BY_ID.get(id);
    if (!item || (item.pantry && !includePantry)) continue;
    const packs = Math.max(1, Math.ceil(g / item.packGrams - 0.05));
    const cost = packs * (overrides[id] ?? item.price[tier === "discount" ? 0 : 1]);
    total += cost;
    byAisle.set(item.aisle, [...(byAisle.get(item.aisle) ?? []), { item, grams: g, packs, cost }]);
  }
  return { byAisle, total };
}

export const recipeTime = (r: CatalogRecipe) => r.prep + r.cook;

export function filterRecipes(opts: { category?: string | null; tags?: string[]; query?: string }) {
  const q = (opts.query ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  return RECIPES.filter((r) => {
    if (opts.category && r.category !== opts.category) return false;
    if (opts.tags?.length) {
      const all = new Set<string>([...r.tags, ...autoTags(r)]);
      if (!opts.tags.every((t) => all.has(t))) return false;
    }
    if (!q) return true;
    const hay = `${r.name} ${r.summary} ${r.ingredients.map((i) => SHOP_BY_ID.get(i.item)?.name ?? "").join(" ")}`
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

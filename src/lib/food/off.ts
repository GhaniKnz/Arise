import type { FoodCategory, FoodItem, Nova } from "@/lib/db/types";

/** Subset of an Open Food Facts product we rely on. */
export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string | string[];
  nutriments?: Record<string, number | string | undefined>;
  nova_group?: number;
  categories_tags?: string[];
  image_front_small_url?: string;
  serving_quantity?: number | string;
  quantity?: string;
}

export const OFF_FIELDS = "code,product_name,product_name_fr,brands,nutriments,nova_group,categories_tags,image_front_small_url,serving_quantity,quantity";

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

const CATEGORY_RULES: [string[], FoodCategory][] = [
  [["en:alcoholic-beverages", "en:beverages", "en:waters", "en:sodas", "en:juices"], "drinks"],
  [["en:protein-powders", "en:dietary-supplements", "en:bodybuilding-supplements"], "supplements"],
  [["en:meals", "en:pizzas", "en:sandwiches", "en:prepared-meals"], "prepared"],
  [["en:cheeses", "en:yogurts", "en:dairies", "en:milks"], "dairy"],
  [["en:eggs"], "eggs"],
  [["en:fishes", "en:seafood", "en:canned-fishes"], "fish"],
  [["en:meats", "en:poultries", "en:hams", "en:sausages"], "meat"],
  [["en:breads", "en:sandwich-breads"], "bread"],
  [["en:legumes", "en:pulses"], "legumes"],
  [["en:nuts", "en:nuts-and-their-products", "en:seeds"], "nuts"],
  [["en:fats", "en:vegetable-oils", "en:butters"], "fats"],
  [["en:sauces", "en:condiments"], "sauces"],
  [["en:chips-and-fries", "en:salty-snacks", "en:appetizers"], "snacks"],
  [["en:sweet-snacks", "en:biscuits", "en:chocolates", "en:confectioneries", "en:sweet-spreads", "en:desserts"], "sweets"],
  [["en:fruits", "en:fruits-based-foods"], "fruits"],
  [["en:vegetables", "en:vegetables-based-foods"], "vegetables"],
  [["en:cereals-and-potatoes", "en:pastas", "en:rices", "en:breakfast-cereals"], "grains"],
  [["en:meat-analogues", "en:tofu"], "plant_protein"],
];

function categoryOf(tags: string[]): FoodCategory {
  for (const [keys, cat] of CATEGORY_RULES) if (keys.some((k) => tags.includes(k))) return cat;
  return "other";
}

/** Converts an OFF product to an ARISE food. Returns null when nutrition data is missing. */
export function offToFood(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {};
  let kcal = num(n["energy-kcal_100g"]);
  const kj = num(n["energy-kj_100g"]) ?? num(n["energy_100g"]);
  if (kcal == null && kj != null) kcal = kj / 4.184;
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  if (kcal == null || protein == null || carbs == null || fat == null || !p.code) return null;

  const name = (p.product_name_fr || p.product_name || "").trim();
  if (!name) return null;
  const tags = p.categories_tags ?? [];
  const category = categoryOf(tags);
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0]?.trim();
  const serving = num(p.serving_quantity);
  const nova = [1, 2, 3, 4].includes(p.nova_group ?? 0) ? (p.nova_group as Nova) : undefined;
  const isDrink = category === "drinks";

  return {
    id: `off:${p.code}`,
    name,
    brand: brand || undefined,
    barcode: p.code,
    category,
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
    fiber: num(n["fiber_100g"]),
    sugar: num(n["sugars_100g"]),
    satFat: num(n["saturated-fat_100g"]),
    salt: num(n["salt_100g"]),
    nova,
    unit: isDrink ? "ml" : "g",
    alcohol: tags.includes("en:alcoholic-beverages") || undefined,
    defaultGrams: serving && serving > 0 && serving < 2000 ? Math.round(serving) : 100,
    portions: serving && serving > 0 && serving < 2000 ? [{ label: "1 portion", grams: Math.round(serving) }] : undefined,
    source: "off",
    image: p.image_front_small_url,
  };
}

export function isValidBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(code);
}

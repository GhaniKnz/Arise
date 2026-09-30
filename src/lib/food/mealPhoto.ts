"use client";

import { apiFetch } from "@/lib/api";
import type { MealAnalysis } from "@/lib/ai/schemas";
import { resizeImage } from "@/lib/db/repos/body";
import { estimationMemory } from "@/lib/db/repos/nutrition";
import type { FoodCategory, FoodRow, Ingredient, Nova } from "@/lib/db/types";

export type EstimationMemory = Awaited<ReturnType<typeof estimationMemory>>;

export interface PhotoItem {
  key: string;
  ingredient: Ingredient;
  confidence?: "high" | "medium" | "low";
  /** Matched one of the user's saved products. */
  known?: boolean;
}

const NOVA_OF = { raw: 1, processed: 3, ultra_processed: 4 } as const;

export const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Sends a meal photo to the vision route along with what the user already saved,
 * so known products and dishes are reused. Throws ApiError on failure.
 */
export async function analyzeMealPhoto(file: Blob, note?: string): Promise<{ analysis: MealAnalysis; mem: EstimationMemory | null }> {
  const small = await resizeImage(file, 1280, 0.85);
  const image = await toBase64(small);
  const mem = await estimationMemory().catch(() => null);
  const res = await apiFetch<{ analysis: MealAnalysis }>("/api/ai/meal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mediaType: "image/jpeg", note: note?.trim() || undefined, known: mem ? { products: mem.products, meals: mem.meals } : undefined }),
  });
  return { analysis: res.analysis, mem };
}

function knownIngredient(food: FoodRow, grams: number): Ingredient {
  const { kcal, protein, carbs, fat, fiber, sugar, satFat, salt } = food;
  return { foodId: food.id, name: food.name, grams, per100: { kcal, protein, carbs, fat, fiber, sugar, satFat, salt }, nova: food.nova, category: food.category };
}

/** AI items → editable ingredients, reusing the user's saved products (by id, then by name). */
export function analysisToItems(a: MealAnalysis, mem: EstimationMemory | null): PhotoItem[] {
  return a.items
    .filter((it) => it.grams > 0)
    .map((it, i) => {
      const grams = Math.round(it.grams);
      const known = mem ? ((it.known_id && mem.foodsById.get(it.known_id)) || mem.foodsByName.get(normName(it.name))) : undefined;
      if (known) return { key: `${i}-${known.id}`, confidence: it.confidence, known: true, ingredient: knownIngredient(known, grams) };
      const f = 100 / it.grams;
      return {
        key: `${i}-${it.name}`,
        confidence: it.confidence,
        ingredient: {
          name: it.name,
          grams,
          per100: { kcal: it.kcal * f, protein: it.protein * f, carbs: it.carbs * f, fat: it.fat * f, fiber: it.fiber * f },
          nova: NOVA_OF[it.processing] as Nova,
          category: it.category as FoodCategory,
        },
      };
    });
}

/** Ingredients for a composed dish: the AI confidence is kept, except for products the user already saved. */
export const photoItemsToIngredients = (items: PhotoItem[]): Ingredient[] => items.map((i) => ({ ...i.ingredient, confidence: i.known ? undefined : i.confidence }));

/** Small JPEG data URL (≈10 kB) to show which photo a group of ingredients came from. */
export async function photoThumb(file: Blob): Promise<string> {
  const small = await resizeImage(file, 200, 0.7);
  return `data:image/jpeg;base64,${await toBase64(small)}`;
}

"use client";

import { apiFetch } from "@/lib/api";
import type { MealAnalysis } from "@/lib/ai/schemas";
import { resizeImage } from "@/lib/db/repos/body";
import type { FoodCategory, Ingredient, Nova } from "@/lib/db/types";

const NOVA_OF = { raw: 1, processed: 3, ultra_processed: 4 } as const;

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Sends a meal photo to the vision route. Throws ApiError on failure. */
export async function analyzeMealPhoto(file: Blob, note?: string): Promise<MealAnalysis> {
  const small = await resizeImage(file, 1280, 0.85);
  const image = await toBase64(small);
  const res = await apiFetch<{ analysis: MealAnalysis }>("/api/ai/meal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mediaType: "image/jpeg", note: note?.trim() || undefined }),
  });
  return res.analysis;
}

/** AI items (totals for the estimated portion) → editable ingredients (per 100 g). */
export function analysisToIngredients(a: MealAnalysis): Ingredient[] {
  return a.items
    .filter((it) => it.grams > 0)
    .map((it) => {
      const f = 100 / it.grams;
      return {
        name: it.name,
        grams: Math.round(it.grams),
        per100: { kcal: it.kcal * f, protein: it.protein * f, carbs: it.carbs * f, fat: it.fat * f, fiber: it.fiber * f },
        nova: NOVA_OF[it.processing] as Nova,
        category: it.category as FoodCategory,
        confidence: it.confidence,
      };
    });
}

/** Small JPEG data URL (≈10 kB) to show which photo a group of ingredients came from. */
export async function photoThumb(file: Blob): Promise<string> {
  const small = await resizeImage(file, 200, 0.7);
  return `data:image/jpeg;base64,${await toBase64(small)}`;
}

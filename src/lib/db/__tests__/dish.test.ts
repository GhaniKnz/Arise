import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../index";
import { addPart, addToNewDraft, clearDraft, draftFromEntry, emptyDraft, foodPart, loadDraft, normalizeDraft, photoPart } from "../repos/dishDraft";
import { entriesToIngredients, logDish, saveMeal, updateDishEntry } from "../repos/nutrition";
import type { FoodItem, Ingredient } from "../types";
import { dishNova, suggestDishName } from "@/lib/domain/nutrition";
import { todayKey } from "@/lib/utils/date";

const pasta: FoodItem = { id: "off:1", name: "Pâtes", barcode: "3017620422003", category: "grains", kcal: 360, protein: 12, carbs: 72, fat: 1.5, nova: 1, defaultGrams: 100, source: "off", image: "https://img/pasta.jpg" };
const sauce: FoodItem = { id: "off:2", name: "Sauce tomate", barcode: "3017620422004", category: "sauces", kcal: 60, protein: 1.5, carbs: 8, fat: 2, nova: 4, defaultGrams: 100, source: "off" };
const aiItems: Ingredient[] = [
  { name: "Poulet grillé", grams: 150, per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, nova: 1, confidence: "high" },
  { name: "Parmesan", grams: 20, per100: { kcal: 400, protein: 33, carbs: 0, fat: 29 }, nova: 3, confidence: "low" },
];

describe("composed dishes", () => {
  beforeEach(async () => {
    await Promise.all([db.foodEntries.clear(), db.meals.clear(), db.kv.clear()]);
  });

  it("groups each barcode and photo, and removing a photo removes all its ingredients", () => {
    let d = addPart(emptyDraft(), foodPart(pasta, 120, "barcode"));
    d = addPart(d, foodPart(sauce, 80, "barcode"));
    const photo = photoPart("Poulet parmesan", aiItems, "data:image/jpeg;base64,xx");
    d = addPart(d, photo);
    expect(d.sources.map((s) => s.kind)).toEqual(["barcode", "barcode", "photo"]);
    expect(d.items).toHaveLength(4);
    expect(d.items.filter((it) => it.sourceId === photo.source.id)).toHaveLength(2);

    const without = normalizeDraft({ ...d, sources: d.sources.filter((s) => s.id !== photo.source.id), items: d.items.filter((it) => it.sourceId !== photo.source.id) });
    expect(without.items.map((i) => i.name)).toEqual(["Pâtes", "Sauce tomate"]);
  });

  it("gives a source to legacy ingredients and drops empty sources", () => {
    const d = normalizeDraft({ name: "", items: [{ name: "Riz", grams: 100, per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } }], sources: [{ id: "gone", kind: "photo", label: "x" }] });
    expect(d.sources).toHaveLength(1);
    expect(d.sources[0].kind).toBe("search");
    expect(d.items[0].sourceId).toBe(d.sources[0].id);
  });

  it("persists the draft between screens", async () => {
    await addToNewDraft(foodPart(pasta, 100, "barcode"));
    await addToNewDraft(foodPart(sauce, 50, "barcode"));
    expect((await loadDraft("new")).items.map((i) => i.grams)).toEqual([100, 50]);
    await clearDraft("new");
    expect((await loadDraft("new")).items).toHaveLength(0);
  });

  it("logs a dish as one entry that keeps its ingredients, and can be re-edited", async () => {
    const d = addPart(addPart(emptyDraft(), foodPart(pasta, 100, "barcode")), photoPart("Poulet parmesan", aiItems, "data:image/jpeg;base64,xx"));
    const dishId = await saveMeal({ name: "Pâtes poulet", items: d.items, sources: d.sources });
    const entry = await logDish({ date: todayKey(), meal: "lunch", name: "Pâtes poulet", items: d.items, sources: d.sources, dishId });

    // 360 + 247.5 + 80 kcal
    expect(entry.kcal).toBe(688);
    expect(entry.grams).toBe(270);
    expect(entry.items).toHaveLength(3);
    expect(entry.source).toBe("dish");
    // Photo thumbnails stay on the saved dish only; product image URLs are kept.
    expect(entry.sources?.find((s) => s.kind === "photo")?.thumb).toBeUndefined();
    expect(entry.sources?.find((s) => s.kind === "barcode")?.thumb).toBe(pasta.image);

    const dish = await db.meals.get(dishId);
    const reopened = draftFromEntry(entry, dish);
    expect(reopened.sources.find((s) => s.kind === "photo")?.thumb).toBe("data:image/jpeg;base64,xx");

    const edited = reopened.items.map((it) => (it.name === "Pâtes" ? { ...it, grams: 200 } : it));
    await updateDishEntry(entry.id, { name: "Pâtes poulet", items: edited, sources: reopened.sources, meal: "dinner", dishId });
    const after = (await db.foodEntries.get(entry.id))!;
    expect(after.kcal).toBe(1048);
    expect(after.meal).toBe("dinner");
    expect(entriesToIngredients([after])).toHaveLength(3);
  });

  it("names and rates a dish from its ingredients", () => {
    expect(suggestDishName([{ name: "Pâtes" }, { name: "Sauce" }, { name: "Fromage" }])).toBe("Pâtes + Sauce…");
    expect(suggestDishName([{ name: "Pâtes" }], "Pâtes bolognaise")).toBe("Pâtes bolognaise");
    // Calorie-weighted: mostly raw pasta with a bit of ultra-processed sauce stays close to raw.
    expect(dishNova([{ ...foodPart(pasta, 200, "barcode").items[0] }, { ...foodPart(sauce, 50, "barcode").items[0] }])).toBe(1);
  });
});

import { db } from "../index";
import { kvGet, kvSet } from "../repo";
import type { DishSource, FoodEntry, FoodItem, Ingredient, MealSlot, SavedMeal } from "../types";
import { foodToIngredient } from "@/lib/domain/nutrition";
import type { DayKey } from "@/lib/utils/date";
import { uid } from "@/lib/utils/id";

/**
 * Dish being composed, kept in IndexedDB (local only, never synced) so it
 * survives navigation and the page reload some phones do after taking a photo.
 */
export interface DishDraft {
  name: string;
  items: Ingredient[];
  sources: DishSource[];
  target?: DraftTarget;
}

/** What an "edit" draft modifies: a saved dish (to log it with other quantities, or to change it) or a journal entry. */
export type DraftTarget =
  | { kind: "dish"; id: string; name: string; intent: "log" | "save" }
  | { kind: "entry"; id: string; date: DayKey; meal: MealSlot; dishId?: string; dishName?: string };

/** "new": the dish composed from scratch · "edit": a saved dish or journal entry being modified. */
export type DraftSlot = "new" | "edit";

export const DRAFT_KEY: Record<DraftSlot, string> = { new: "draft:dish", edit: "draft:dish-edit" };

export const emptyDraft = (): DishDraft => ({ name: "", items: [], sources: [] });

export async function loadDraft(slot: DraftSlot): Promise<DishDraft> {
  return normalizeDraft((await kvGet<DishDraft>(DRAFT_KEY[slot])) ?? emptyDraft());
}

export const saveDraft = (slot: DraftSlot, draft: DishDraft) => kvSet(DRAFT_KEY[slot], draft);

export const clearDraft = (slot: DraftSlot) => db.kv.delete(DRAFT_KEY[slot]);

/** One addition to a dish: a scanned product, an AI photo (several ingredients) or a searched food. */
export interface DishPart {
  source: DishSource;
  items: Ingredient[];
}

export function addPart(d: DishDraft, part: DishPart): DishDraft {
  return {
    ...d,
    sources: [...d.sources, part.source],
    items: [...d.items, ...part.items.map((it) => ({ ...it, sourceId: part.source.id }))],
  };
}

export async function addToNewDraft(part: DishPart): Promise<DishDraft> {
  const next = addPart(await loadDraft("new"), part);
  await saveDraft("new", next);
  return next;
}

export function foodPart(food: FoodItem, grams: number, kind: "barcode" | "search"): DishPart {
  const id = uid();
  return {
    source: { id, kind, label: food.name, thumb: food.image, barcode: food.barcode },
    items: [{ ...foodToIngredient(food, grams), sourceId: id }],
  };
}

export function photoPart(label: string, items: Ingredient[], thumb?: string): DishPart {
  const id = uid();
  return { source: { id, kind: "photo", label, thumb }, items: items.map((it) => ({ ...it, sourceId: id })) };
}

/** Gives every ingredient a source (older dishes have none) and drops sources left empty. */
export function normalizeDraft(d: DishDraft): DishDraft {
  const known = new Set(d.sources.map((s) => s.id));
  const extra: DishSource[] = [];
  const items = d.items.map((it) => {
    if (it.sourceId && known.has(it.sourceId)) return it;
    const id = uid();
    extra.push({ id, kind: "search", label: it.name });
    return { ...it, sourceId: id };
  });
  const used = new Set(items.map((it) => it.sourceId));
  const sources = [...d.sources, ...extra].filter((s) => used.has(s.id));
  return extra.length || sources.length !== d.sources.length ? { ...d, items, sources } : d;
}

export function draftFromDish(dish: SavedMeal, intent: "log" | "save"): DishDraft {
  return normalizeDraft({ name: dish.name, items: dish.items, sources: dish.sources ?? [], target: { kind: "dish", id: dish.id, name: dish.name, intent } });
}

/** Journal entries don't keep photo thumbnails: they are taken back from the saved dish when there is one. */
export function draftFromEntry(entry: FoodEntry, dish?: SavedMeal): DishDraft {
  const thumbs = new Map(dish?.sources?.map((s) => [s.id, s.thumb]));
  const sources = (entry.sources ?? []).map((s) => (s.thumb ? s : { ...s, thumb: thumbs.get(s.id) }));
  return normalizeDraft({
    name: entry.name,
    items: entry.items ?? [],
    sources,
    target: { kind: "entry", id: entry.id, date: entry.date, meal: entry.meal, dishId: dish?.id, dishName: dish?.name },
  });
}

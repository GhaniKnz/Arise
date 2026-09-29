"use client";

import { ArrowLeft, ChefHat, PenLine, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { CustomFoodSheet } from "@/components/nutrition/CustomFoodSheet";
import { FoodRow } from "@/components/nutrition/FoodRow";
import { IngredientEditor } from "@/components/nutrition/IngredientEditor";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, TextArea, TextInput } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { useCustomFoods, useMeals, useRecipes } from "@/lib/db/hooks";
import { deleteFood, deleteMeal, deleteRecipe, saveMeal, saveRecipe } from "@/lib/db/repos/nutrition";
import type { FoodItem, Ingredient, MealSlot, Recipe, SavedMeal } from "@/lib/db/types";
import { ingredientsTotals, MEAL_SLOTS } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";
import { fmtInt } from "@/lib/utils/format";

type Tab = "meals" | "recipes" | "foods";

function MealEditor({ open, onClose, meal }: { open: boolean; onClose: () => void; meal: SavedMeal | null }) {
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<MealSlot>("breakfast");
  const [items, setItems] = useState<Ingredient[]>([]);
  useEffect(() => {
    if (!open) return;
    setName(meal?.name ?? "");
    setSlot(meal?.defaultSlot ?? "breakfast");
    setItems(meal?.items ?? []);
  }, [open, meal]);
  const save = async () => {
    if (!name.trim() || !items.length) {
      toast({ tone: "error", title: "Donne un nom et au moins un aliment" });
      return;
    }
    await saveMeal({ id: meal?.id, name: name.trim(), items, defaultSlot: slot });
    toast({ tone: "success", title: "Repas enregistré", message: name });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} size="lg" title={meal ? "Modifier le repas" : "Nouveau repas"} description="Ajouté en un clic depuis l'écran d'ajout" footer={<Button block size="lg" onClick={save}>Enregistrer</Button>}>
      <div className="space-y-4">
        <Field label="Nom">
          <TextInput data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Petit déjeuner habituel" />
        </Field>
        <Segmented value={slot} onChange={setSlot} size="sm" ariaLabel="Repas par défaut" options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />
        <IngredientEditor items={items} onChange={setItems} />
      </div>
    </Sheet>
  );
}

function RecipeEditor({ open, onClose, recipe }: { open: boolean; onClose: () => void; recipe: Recipe | null }) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState<number | undefined>(2);
  const [items, setItems] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? "");
    setServings(recipe?.servings ?? 2);
    setItems(recipe?.items ?? []);
    setNotes(recipe?.notes ?? "");
  }, [open, recipe]);
  const save = async () => {
    if (!name.trim() || !items.length || !servings) {
      toast({ tone: "error", title: "Nom, portions et ingrédients requis" });
      return;
    }
    await saveRecipe({ id: recipe?.id, name: name.trim(), servings, items, notes: notes.trim() || undefined });
    toast({ tone: "success", title: "Recette enregistrée", message: name });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} size="lg" title={recipe ? "Modifier la recette" : "Nouvelle recette"} description="Les macros par portion se recalculent automatiquement" footer={<Button block size="lg" onClick={save}>Enregistrer</Button>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Field label="Nom">
            <TextInput data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Butter Chicken Fitness" />
          </Field>
          <Field label="Portions">
            <NumberInput value={servings} onChange={setServings} min={1} max={30} decimals={0} />
          </Field>
        </div>
        <IngredientEditor items={items} onChange={setItems} servings={servings ?? 1} />
        <Field label="Préparation (optionnel)">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Étapes, épices, astuces…" />
        </Field>
      </div>
    </Sheet>
  );
}

function Library() {
  const { profile } = useGame();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "meals");
  const meals = useMeals();
  const recipes = useRecipes();
  const foods = useCustomFoods();
  const [mealEdit, setMealEdit] = useState<SavedMeal | null | undefined>(undefined);
  const [recipeEdit, setRecipeEdit] = useState<Recipe | null | undefined>(undefined);
  const [foodEdit, setFoodEdit] = useState<FoodItem | null | undefined>(undefined);
  if (!profile) return <PageSkeleton />;
  const customFoods = (foods ?? []).filter((f) => f.source === "custom");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/nutrition")}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader
        kicker="Nutrition"
        title="Bibliothèque"
        subtitle="Repas, recettes et aliments personnalisés"
        action={
          <Button size="sm" onClick={() => (tab === "meals" ? setMealEdit(null) : tab === "recipes" ? setRecipeEdit(null) : setFoodEdit(null))}>
            <Plus /> Créer
          </Button>
        }
      />
      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        ariaLabel="Sections"
        options={[
          { value: "meals", label: "Repas", icon: <UtensilsCrossed /> },
          { value: "recipes", label: "Recettes", icon: <ChefHat /> },
          { value: "foods", label: "Aliments", icon: <PenLine /> },
        ]}
      />

      {tab === "meals" && (
        <div className="space-y-3">
          {meals?.length ? (
            meals.map((m) => {
              const t = ingredientsTotals(m.items);
              return (
                <Panel key={m.id} className="flex items-center gap-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setMealEdit(m)}>
                    <p className="font-medium text-ink">{m.name}</p>
                    <p className="truncate text-xs text-ink-3">{m.items.map((i) => `${i.name} (${i.grams} g)`).join(" · ")}</p>
                    <p className="mt-1 text-xs text-ink-2">
                      {fmtInt(t.kcal)} kcal · P {fmtInt(t.protein)} · G {fmtInt(t.carbs)} · L {fmtInt(t.fat)}
                    </p>
                  </button>
                  <IconButton label={`Supprimer ${m.name}`} onClick={() => deleteMeal(m.id)}>
                    <Trash2 />
                  </IconButton>
                </Panel>
              );
            })
          ) : (
            <EmptyState icon={<UtensilsCrossed />} title="Aucun repas enregistré" description="Compose ton petit-déjeuner habituel une fois, puis ajoute-le en un tap." action={<Button size="sm" onClick={() => setMealEdit(null)}>Créer un repas</Button>} />
          )}
        </div>
      )}

      {tab === "recipes" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recipes?.length ? (
            recipes.map((r) => {
              const t = ingredientsTotals(r.items);
              const s = r.servings;
              return (
                <Panel key={r.id} className="flex flex-col">
                  <button type="button" className="text-left" onClick={() => setRecipeEdit(r)}>
                    <p className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      <ChefHat className="size-5 text-violet-2" /> {r.name}
                    </p>
                    <p className="text-xs text-ink-3">
                      {s} portion(s) · {r.items.length} ingrédients
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                      {[
                        ["kcal", fmtInt(t.kcal / s)],
                        ["P", `${fmtInt(t.protein / s)} g`],
                        ["G", `${fmtInt(t.carbs / s)} g`],
                        ["L", `${fmtInt(t.fat / s)} g`],
                      ].map(([l, v]) => (
                        <div key={l} className="rounded-lg bg-white/[0.03] py-1.5">
                          <p className="text-sm font-semibold text-ink">{v}</p>
                          <p className="text-[10px] text-ink-3">{l}/portion</p>
                        </div>
                      ))}
                    </div>
                  </button>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => deleteRecipe(r.id)}>
                      <Trash2 /> Supprimer
                    </Button>
                  </div>
                </Panel>
              );
            })
          ) : (
            <div className="sm:col-span-2">
              <EmptyState icon={<ChefHat />} title="Aucune recette" description="Crée une recette, choisis le nombre de portions : ARISE calcule les macros par portion." action={<Button size="sm" onClick={() => setRecipeEdit(null)}>Créer une recette</Button>} />
            </div>
          )}
        </div>
      )}

      {tab === "foods" &&
        (customFoods.length ? (
          <ul className="panel p-2">
            {customFoods.map((f) => (
              <FoodRow key={f.id} food={f} goal={profile.goal} onSelect={setFoodEdit} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<PenLine />} title="Aucun aliment personnalisé" description="Ajoute un produit absent de la base avec les valeurs de son étiquette." action={<Button size="sm" onClick={() => setFoodEdit(null)}>Créer un aliment</Button>} />
        ))}

      <MealEditor open={mealEdit !== undefined} onClose={() => setMealEdit(undefined)} meal={mealEdit ?? null} />
      <RecipeEditor open={recipeEdit !== undefined} onClose={() => setRecipeEdit(undefined)} recipe={recipeEdit ?? null} />
      <CustomFoodSheet
        open={foodEdit !== undefined}
        onClose={() => setFoodEdit(undefined)}
        food={foodEdit ?? null}
        onDelete={
          foodEdit?.source === "custom"
            ? async () => {
                await deleteFood(foodEdit.id);
                setFoodEdit(undefined);
              }
            : undefined
        }
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Library />
    </Suspense>
  );
}

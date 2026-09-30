"use client";

import { ArrowLeft, ChefHat, PenLine, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import { deleteFood, deleteMeal, deleteRecipe, saveRecipe } from "@/lib/db/repos/nutrition";
import type { FoodItem, Ingredient, Recipe } from "@/lib/db/types";
import { ingredientsTotals } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";
import { fmtInt } from "@/lib/utils/format";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

type Tab = "meals" | "recipes" | "foods";

function RecipeEditor({ open, onClose, recipe }: { open: boolean; onClose: () => void; recipe: Recipe | null }) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState<number | undefined>(2);
  const [items, setItems] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState("");
  useResetOnOpen(
    open,
    () => {
      setName(recipe?.name ?? "");
      setServings(recipe?.servings ?? 2);
      setItems(recipe?.items ?? []);
      setNotes(recipe?.notes ?? "");
    },
    recipe?.id,
  );
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
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
        subtitle="Plats, recettes et aliments personnalisés"
        action={
          <Button size="sm" onClick={() => (tab === "meals" ? router.push("/nutrition/compose?intent=save") : tab === "recipes" ? setRecipeEdit(null) : setFoodEdit(null))}>
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
          { value: "meals", label: "Plats", icon: <UtensilsCrossed /> },
          { value: "recipes", label: "Recettes", icon: <ChefHat /> },
          { value: "foods", label: "Aliments", icon: <PenLine /> },
        ]}
      />

      {tab === "meals" && (
        <div className="space-y-3">
          {meals?.length ? (
            meals.map((m) => {
              const t = ingredientsTotals(m.items);
              const thumb = m.sources?.find((x) => x.thumb)?.thumb;
              return (
                <Panel key={m.id} className="flex items-center gap-3">
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="size-12 shrink-0 rounded-xl bg-white object-cover" />
                  )}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => router.push(`/nutrition/compose?dish=${m.id}&intent=save`)}>
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
            <EmptyState icon={<UtensilsCrossed />} title="Aucun plat enregistré" description="Compose un plat avec des codes-barres, des photos IA ou la recherche, puis ajoute-le en un tap." action={<Button size="sm" onClick={() => router.push("/nutrition/compose?intent=save")}>Composer un plat</Button>} />
          )}
        </div>
      )}

      {tab === "recipes" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

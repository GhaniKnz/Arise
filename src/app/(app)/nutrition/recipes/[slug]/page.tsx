"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  Beef,
  BookmarkPlus,
  ChefHat,
  ChevronRight,
  ClipboardCopy,
  Droplet,
  ExternalLink,
  Flame,
  Leaf,
  Lightbulb,
  ListChecks,
  Minus,
  PiggyBank,
  Plus,
  Refrigerator,
  ShoppingBasket,
  Thermometer,
  Timer,
  Users,
  Wheat,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KitchenIcon } from "@/components/icons/KitchenIcon";
import { Difficulty, euro } from "@/components/recipes/RecipeCard";
import { IngredientSheet } from "@/components/recipes/IngredientSheet";
import { StepTimer } from "@/components/recipes/StepTimer";
import { Button, IconButton } from "@/components/ui/Button";
import { Sweep } from "@/components/ui/Effects";
import { NumberInput, Segmented, Toggle } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { RECIPE_PHOTOS } from "@/lib/data/recipe-photos";
import { METHOD_META, RECIPE_BY_SLUG, RECIPE_CATEGORY_META, TAG_META, UTENSIL_META, type StepKind } from "@/lib/data/recipes";
import { AISLE_META, pricePerGram, SHOP_BY_ID, STORE_TIERS, type ShopItem, type StoreTier } from "@/lib/data/shop";
import { db } from "@/lib/db";
import { useToday } from "@/lib/db/hooks";
import { logRecipe, saveRecipe } from "@/lib/db/repos/nutrition";
import type { MealSlot, Recipe } from "@/lib/db/types";
import { MEAL_SLOTS, mealForHour } from "@/lib/domain/nutrition";
import { autoTags, recipeCost, recipeNutrition, recipeToIngredients, shoppingList } from "@/lib/domain/recipes";
import { useShopPrefs } from "@/lib/hooks/useShopPrefs";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { fmtInt } from "@/lib/utils/format";

const STEP_ICON: Record<StepKind, string> = {
  prep: "knife",
  cook: "pan",
  oven: "oven",
  boil: "pot",
  mix: "whisk",
  rest: "timer",
  fridge: "snowflake",
  blend: "blender",
  micro: "microwave",
  serve: "utensils",
};

const fmtG = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg` : `${Math.round(g)} g`);

export default function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const today = useToday();
  const recipe = RECIPE_BY_SLUG.get(slug);
  const { tier, overrides, setTier } = useShopPrefs();
  const [portions, setPortions] = useState<number | undefined>(recipe?.servings);
  const [withOptional, setWithOptional] = useState(false);
  const [pantry, setPantry] = useState(false);
  const [openItem, setOpenItem] = useState<ShopItem | null>(null);
  const [logging, setLogging] = useState(false);
  const [slot, setSlot] = useState<MealSlot>(() => mealForHour(new Date().getHours()));
  const [eatPortions, setEatPortions] = useState<number | undefined>(1);

  const shop = useMemo(() => (recipe ? shoppingList([{ recipe, servings: portions ?? recipe.servings }], tier, overrides, pantry) : null), [recipe, portions, tier, overrides, pantry]);

  if (!recipe) return <EmptyState title="Recette introuvable" action={<Button onClick={() => router.push("/nutrition/recipes")}>Toutes les recettes</Button>} />;

  const k = (portions ?? recipe.servings) / recipe.servings;
  const n = recipeNutrition(recipe, withOptional).perServing;
  const cost = recipeCost(recipe, tier, overrides, withOptional);
  const tags = [...autoTags(recipe), ...recipe.tags];
  const credit = RECIPE_PHOTOS[recipe.slug];
  const cat = RECIPE_CATEGORY_META[recipe.category];
  const method = METHOD_META[recipe.method];

  const pseudoRecipe = (): Recipe => ({ id: recipe.slug, createdAt: "", updatedAt: "", name: recipe.name, servings: recipe.servings, items: recipeToIngredients(recipe, recipe.servings, withOptional) });

  const addToJournal = async () => {
    await logRecipe({ date: today, meal: slot, recipe: pseudoRecipe(), servings: eatPortions ?? 1 });
    cue("set");
    toast({ tone: "success", title: "Ajouté au journal", message: `${recipe.name} · ${fmtInt(n.kcal * (eatPortions ?? 1))} kcal` });
    setLogging(false);
  };

  const saveToMine = async () => {
    const exists = (await db.recipes.toArray()).some((r) => r.name.trim().toLowerCase() === recipe.name.toLowerCase());
    if (exists) {
      toast({ tone: "warn", title: "Déjà dans tes recettes", message: recipe.name });
      return;
    }
    await saveRecipe({ name: recipe.name, servings: recipe.servings, items: recipeToIngredients(recipe, recipe.servings, withOptional), notes: recipe.steps.map((s, i) => `${i + 1}. ${s.t}`).join("\n") });
    toast({ tone: "success", title: "Enregistrée dans tes recettes", message: "Tu peux la modifier et l'ajouter depuis l'écran d'ajout." });
  };

  const copyList = async () => {
    if (!shop) return;
    const lines = [`Courses — ${recipe.name} (${portions ?? recipe.servings} portions)`];
    for (const [aisle, items] of shop.byAisle) {
      lines.push(`\n${AISLE_META[aisle].label}`);
      for (const l of items) lines.push(`☐ ${l.item.name} — ${l.packs} × ${l.item.pack} (${euro(l.cost)})`);
    }
    lines.push(`\nTotal estimé : ${euro(shop.total)} (${STORE_TIERS[tier].label.toLowerCase()})`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ tone: "success", title: "Liste copiée", message: "Colle-la dans tes notes ou ta messagerie." });
    } catch {
      toast({ tone: "warn", title: "Copie impossible", message: "Ton navigateur bloque le presse-papiers." });
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <div className="relative -mx-4 -mt-4 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-3xl">
        <div className="relative aspect-[16/10] sm:aspect-[16/8]">
          <Image src={`/recipes/${recipe.slug}.webp`} alt={recipe.name} fill priority unoptimized sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-void/10" aria-hidden />
          <Sweep delay={1.5} duration={8} />
        </div>
        <div className="absolute top-3 left-3">
          <IconButton label="Retour" onClick={() => router.back()} className="bg-void/60 backdrop-blur">
            <ArrowLeft />
          </IconButton>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-void/70 px-2 py-0.5 text-[11px] font-semibold text-ink backdrop-blur">
              <KitchenIcon name={cat.icon} className="size-3 text-arise" /> {cat.label}
            </span>
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-void/70 px-2 py-0.5 text-[11px] font-medium backdrop-blur" style={{ color: TAG_META[t].color }}>
                <KitchenIcon name={TAG_META[t].icon} className="size-3" /> {TAG_META[t].label}
              </span>
            ))}
          </p>
          <h1 className="mt-2 font-display text-2xl leading-tight font-bold text-white drop-shadow sm:text-3xl">{recipe.name}</h1>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-2">{recipe.summary}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: <Timer className="text-warn" />, label: "Temps total", value: `${recipe.prep + recipe.cook} min`, hint: recipe.cook ? `${recipe.prep} prépa · ${recipe.cook} cuisson` : "sans cuisson" },
          { icon: <ChefHat className="text-warn" />, label: "Difficulté", value: <Difficulty level={recipe.difficulty} className="[&>svg]:size-4" />, hint: ["Très facile", "Facile", "Intermédiaire"][recipe.difficulty - 1] },
          { icon: <KitchenIcon name={method.icon} className="text-arise" />, label: "Cuisson", value: method.label, hint: `${recipe.utensils.length} ustensiles` },
          { icon: <PiggyBank className="text-good" />, label: "Coût / portion", value: euro(cost.perServing), hint: `${euro(cost.total)} la recette` },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-deep/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] text-ink-3 [&>svg]:size-3.5">
              {t.icon} {t.label}
            </p>
            <div className="mt-0.5 font-display text-base font-semibold text-ink">{t.value}</div>
            <p className="text-[10px] text-ink-3">{t.hint}</p>
          </div>
        ))}
      </div>

      <Panel className="relative mt-4 overflow-hidden">
        <PanelHeader title="Par portion" icon={<Flame />} subtitle="Calculé depuis la base nutritionnelle" />
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {[
            { icon: <Flame className="text-warn" />, v: fmtInt(n.kcal), u: "kcal" },
            { icon: <Beef className="text-protein" />, v: fmtInt(n.protein), u: "g prot." },
            { icon: <Wheat className="text-carbs" />, v: fmtInt(n.carbs), u: "g gluc." },
            { icon: <Droplet className="text-fat" />, v: fmtInt(n.fat), u: "g lip." },
            { icon: <Leaf className="text-fiber" />, v: fmtInt(n.fiber), u: "g fibres" },
          ].map((m) => (
            <div key={m.u} className="rounded-xl bg-white/[0.03] py-2">
              <span className="flex justify-center [&>svg]:size-4">{m.icon}</span>
              <p className="mt-1 font-display text-lg leading-none font-bold text-ink">{m.v}</p>
              <p className="mt-0.5 text-[10px] text-ink-3">{m.u}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setLogging(true)}>
            <Plus /> Ajouter au journal
          </Button>
          <Button variant="secondary" onClick={saveToMine}>
            <BookmarkPlus /> Mes recettes
          </Button>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Ingrédients"
          icon={<ShoppingBasket />}
          action={
            <div className="flex items-center gap-1 rounded-xl border border-line bg-void/40 p-0.5">
              <IconButton label="Moins de portions" size="sm" disabled={(portions ?? 1) <= 1} onClick={() => setPortions((p) => Math.max(1, (p ?? recipe.servings) - 1))}>
                <Minus />
              </IconButton>
              <span className="flex items-center gap-1 px-1 font-display text-sm font-semibold text-ink tabular">
                <Users className="size-3.5 text-arise" /> {portions ?? recipe.servings}
              </span>
              <IconButton label="Plus de portions" size="sm" disabled={(portions ?? 1) >= 16} onClick={() => setPortions((p) => Math.min(16, (p ?? recipe.servings) + 1))}>
                <Plus />
              </IconButton>
            </div>
          }
        />
        <Segmented
          className="mb-3"
          size="sm"
          value={tier}
          onChange={(v: StoreTier) => void setTier(v)}
          ariaLabel="Type d'enseigne"
          options={[
            { value: "discount", label: "Prix discount" },
            { value: "super", label: "Prix supermarché" },
          ]}
        />
        <ul className="divide-y divide-line/60">
          {recipe.ingredients.map((ing) => {
            const item = SHOP_BY_ID.get(ing.item);
            if (!item) return null;
            const lineCost = pricePerGram(item, tier, overrides[item.id]) * ing.g * k;
            const aisle = AISLE_META[item.aisle];
            return (
              <li key={ing.item + ing.g}>
                <button type="button" onClick={() => setOpenItem(item)} className={cn("flex w-full items-center gap-3 py-2.5 text-left", ing.optional && !withOptional && "opacity-60")}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-arise" title={aisle.label}>
                    <KitchenIcon name={aisle.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {item.name}
                      {ing.optional && <span className="ml-1.5 rounded bg-white/[0.06] px-1 text-[10px] font-normal text-ink-3">optionnel</span>}
                    </span>
                    <span className="block text-[11px] text-ink-3">
                      {k === 1 && ing.qty ? `${ing.qty} · ` : ""}
                      {fmtG(ing.g * k)}
                      {ing.note ? ` · ${ing.note}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold text-good tabular">{euro(lineCost)}</span>
                    {overrides[item.id] != null && <span className="block text-[9px] text-violet-2">mon prix</span>}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-3" />
                </button>
              </li>
            );
          })}
        </ul>
        {recipe.ingredients.some((i) => i.optional) && (
          <div className="mt-2">
            <Toggle checked={withOptional} onChange={setWithOptional} label="Inclure les ingrédients optionnels" description="Dans les macros, le coût et l'ajout au journal" />
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink-3">Touche un ingrédient : rayon, format, prix par enseigne, prix relevés en magasin et ton propre prix.</p>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Ustensiles" icon={<ChefHat />} />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {recipe.utensils.map((u) => (
            <li key={u} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-2.5 py-2 text-[13px] text-ink-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-arise/10 text-arise">
                <KitchenIcon name={UTENSIL_META[u].icon} className="size-[18px]" />
              </span>
              <span className="min-w-0 leading-tight">{UTENSIL_META[u].label}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Préparation" icon={<ListChecks />} subtitle="Touche une durée pour lancer un minuteur" />
        <ol className="space-y-3">
          {recipe.steps.map((s, idx) => (
            <motion.li key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.05 }} className="flex gap-3">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-arise/30 bg-arise/10 text-arise">
                <KitchenIcon name={STEP_ICON[s.k]} className="size-[18px]" />
                <span className="absolute -top-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-arise font-display text-[10px] font-bold text-void">{idx + 1}</span>
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm text-ink">{s.t}</p>
                {(s.min || s.temp) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {s.temp && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-bad/40 bg-bad/10 px-2 py-0.5 text-[11px] font-semibold text-bad">
                        <Thermometer className="size-3" /> {s.temp} °C
                      </span>
                    )}
                    {s.min ? <StepTimer minutes={s.min} label={`Étape ${idx + 1} · ${recipe.name}`} /> : null}
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </ol>
      </Panel>

      {(recipe.tips?.length || recipe.storage) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recipe.tips?.length ? (
            <Panel>
              <PanelHeader title="Astuces" icon={<Lightbulb />} />
              <ul className="space-y-2 text-sm text-ink-2">
                {recipe.tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-warn" /> {t}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {recipe.storage && (
            <Panel>
              <PanelHeader title="Conservation" icon={<Refrigerator />} />
              <p className="flex gap-2 text-sm text-ink-2">
                <Refrigerator className="mt-0.5 size-4 shrink-0 text-cyan" /> {recipe.storage}
              </p>
            </Panel>
          )}
        </div>
      )}

      {shop && (
        <Panel className="mt-4">
          <PanelHeader
            title="Liste de courses"
            icon={<ShoppingBasket />}
            subtitle={`${portions ?? recipe.servings} portions · paquets entiers`}
            action={
              <Button size="sm" variant="secondary" onClick={copyList}>
                <ClipboardCopy /> Copier
              </Button>
            }
          />
          <div className="space-y-3">
            {[...shop.byAisle.entries()].map(([aisle, lines]) => (
              <div key={aisle}>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                  <KitchenIcon name={AISLE_META[aisle].icon} className="size-3.5 text-arise" /> {AISLE_META[aisle].label}
                </p>
                <ul className="space-y-1">
                  {lines.map((l) => (
                    <li key={l.item.id} className="flex items-center gap-2 text-sm">
                      <span className="size-3.5 shrink-0 rounded border border-line-strong" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-ink-2">
                        <span className="text-ink">{l.packs > 1 ? `${l.packs} × ` : ""}</span>
                        {l.item.name} <span className="text-ink-3">({l.item.pack})</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-2 tabular">{euro(l.cost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-good/30 bg-good/[0.06] px-3 py-2">
            <span className="text-sm text-ink-2">Total à dépenser ({STORE_TIERS[tier].label.toLowerCase()})</span>
            <span className="font-display text-lg font-bold text-good">{euro(shop.total)}</span>
          </div>
          <div className="mt-2">
            <Toggle checked={pantry} onChange={setPantry} label="Inclure le placard" description="Huile, épices, ail, sauce soja… souvent déjà à la maison" />
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Le total compte des paquets entiers : il est plus élevé que le coût par portion, mais il te reste des produits pour d&apos;autres repas.</p>
        </Panel>
      )}

      {credit && (
        <p className="mt-6 text-center text-[11px] text-ink-3">
          Photo : {credit.author} —{" "}
          <a href={credit.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-arise hover:underline">
            {credit.source} <ExternalLink className="size-3" />
          </a>{" "}
          · {credit.license}. Photo d&apos;illustration : la présentation peut différer de la recette.
        </p>
      )}

      <Sheet
        open={logging}
        onClose={() => setLogging(false)}
        title="Ajouter au journal"
        description={recipe.name}
        size="sm"
        footer={
          <Button block size="lg" onClick={addToJournal}>
            Ajouter · {fmtInt(n.kcal * (eatPortions ?? 1))} kcal
          </Button>
        }
      >
        <div className="space-y-4">
          <Segmented value={slot} onChange={setSlot} size="sm" ariaLabel="Repas" options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2">Portions mangées</p>
            <NumberInput value={eatPortions} onChange={setEatPortions} min={0.25} max={6} step={0.5} decimals={2} ariaLabel="Portions mangées" />
          </div>
          <p className="text-xs text-ink-3">
            {fmtInt(n.kcal * (eatPortions ?? 1))} kcal · {fmtInt(n.protein * (eatPortions ?? 1))} g de protéines. Une portion = 1/{recipe.servings} de la recette.
          </p>
        </div>
      </Sheet>

      <IngredientSheet item={openItem} open={!!openItem} onClose={() => setOpenItem(null)} />
    </div>
  );
}

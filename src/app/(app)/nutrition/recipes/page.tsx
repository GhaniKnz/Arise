"use client";

import { ArrowLeft, BookOpen, ChefHat, Search, Store, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KitchenIcon } from "@/components/icons/KitchenIcon";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { IconButton } from "@/components/ui/Button";
import { Chip, Segmented, TextInput } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { RECIPE_CATEGORY_META, RECIPES, TAG_META, type RecipeCategory } from "@/lib/data/recipes";
import { STORE_TIERS, type StoreTier } from "@/lib/data/shop";
import { filterRecipes } from "@/lib/domain/recipes";
import { useShopPrefs } from "@/lib/hooks/useShopPrefs";

const FILTER_TAGS = ["high_protein", "budget", "quick", "meal_prep", "veggie", "no_cook"] as const;

export default function RecipesPage() {
  const router = useRouter();
  const { tier, overrides, setTier } = useShopPrefs();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const list = useMemo(() => filterRecipes({ category, tags, query: q }), [category, tags, q]);

  const toggleTag = (t: string) => setTags((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));

  return (
    <>
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/nutrition")}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader
        kicker="Nutrition"
        title="Recettes faciles"
        subtitle={`${RECIPES.length} recettes · macros, prix, ustensiles et liste de courses`}
        action={
          <Link href="/nutrition/library?tab=recipes" className="flex items-center gap-1.5 rounded-xl border border-line bg-deep/60 px-3 py-2 text-sm text-ink-2 hover:text-ink">
            <BookOpen className="size-4" /> Mes recettes
          </Link>
        }
      />

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Poulet, riz, sans four, curry…" className="pl-10" aria-label="Rechercher une recette" />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-3 hover:text-ink" aria-label="Effacer la recherche">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="Catégories">
        <Chip active={!category} onClick={() => setCategory(null)}>
          <ChefHat /> Toutes
        </Chip>
        {(Object.keys(RECIPE_CATEGORY_META) as RecipeCategory[]).map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
            <KitchenIcon name={RECIPE_CATEGORY_META[c].icon} /> {RECIPE_CATEGORY_META[c].label}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="Filtres">
        {FILTER_TAGS.map((t) => (
          <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
            <span style={{ color: TAG_META[t].color }} className="flex">
              <KitchenIcon name={TAG_META[t].icon} className="size-3.5" />
            </span>
            {TAG_META[t].label}
          </Chip>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-deep/50 p-2 pl-3">
        <Store className="size-4 shrink-0 text-good" />
        <span className="text-xs text-ink-2">Prix affichés</span>
        <Segmented
          className="ml-auto min-w-0 flex-1 sm:max-w-80"
          size="sm"
          value={tier}
          onChange={(v: StoreTier) => void setTier(v)}
          ariaLabel="Type d'enseigne"
          options={[
            { value: "discount", label: `Discount` },
            { value: "super", label: `Supermarché` },
          ]}
        />
        <p className="w-full text-[11px] text-ink-3">{STORE_TIERS[tier].stores} · prix indicatifs par portion</p>
      </div>

      {list.length ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((r, idx) => (
            <li key={r.slug}>
              <RecipeCard recipe={r} tier={tier} overrides={overrides} priority={idx < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<ChefHat />} title="Aucune recette ne correspond" description="Retire un filtre ou essaie un autre mot." />
      )}

      <p className="mt-6 text-center text-[11px] text-ink-3">
        Prix indicatifs (estimations 2026, varient selon le magasin et les promos) — personnalise-les dans chaque ingrédient. Photos sous licence Creative Commons, crédits sur chaque fiche.
      </p>
    </>
  );
}

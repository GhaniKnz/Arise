"use client";

import { Beef, ChefHat, Flame, PiggyBank, Timer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { KitchenIcon } from "@/components/icons/KitchenIcon";
import { RECIPE_CATEGORY_META, TAG_META, type CatalogRecipe } from "@/lib/data/recipes";
import type { StoreTier } from "@/lib/data/shop";
import { autoTags, recipeCost, recipeNutrition, recipeTime, type PriceOverrides } from "@/lib/domain/recipes";
import { cn } from "@/lib/utils/cn";
import { fmtInt } from "@/lib/utils/format";

export const euro = (x: number) => `${x.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function Difficulty({ level, className }: { level: 1 | 2 | 3; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Difficulté ${level} sur 3`} title={["Très facile", "Facile", "Intermédiaire"][level - 1]}>
      {[1, 2, 3].map((i) => (
        <ChefHat key={i} className={cn("size-3", i <= level ? "text-warn" : "text-ink-3/40")} />
      ))}
    </span>
  );
}

export function RecipeCard({ recipe, tier, overrides, priority }: { recipe: CatalogRecipe; tier: StoreTier; overrides: PriceOverrides; priority?: boolean }) {
  const n = recipeNutrition(recipe).perServing;
  const cost = recipeCost(recipe, tier, overrides).perServing;
  const tags = autoTags(recipe);
  const cat = RECIPE_CATEGORY_META[recipe.category];
  return (
    <Link href={`/nutrition/recipes/${recipe.slug}`} className="panel card-hover group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[3/2] overflow-hidden rounded-t-[20px] bg-deep">
        <Image
          src={`/recipes/${recipe.slug}-sm.webp`}
          alt={recipe.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          unoptimized
          priority={priority}
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-void/85 via-void/10 to-transparent" aria-hidden />
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-void/70 px-2 py-0.5 text-[10px] font-semibold text-ink backdrop-blur">
          <KitchenIcon name={cat.icon} className="size-3 text-arise" /> {cat.label}
        </span>
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-void/75 px-2 py-0.5 text-[11px] font-semibold text-ink backdrop-blur">
          <Timer className="size-3 text-warn" /> {recipeTime(recipe)} min
        </span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-good/90 px-2 py-0.5 text-[11px] font-bold text-void">
          <PiggyBank className="size-3" /> {euro(cost)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-ink">{recipe.name}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-2 text-[11px] text-ink-2">
          <span className="flex items-center gap-1">
            <Flame className="size-3 text-warn" /> {fmtInt(n.kcal)} kcal
          </span>
          <span className="flex items-center gap-1">
            <Beef className="size-3 text-protein" /> {fmtInt(n.protein)} g
          </span>
          <Difficulty level={recipe.difficulty} className="ml-auto" />
        </div>
        {(tags.length > 0 || recipe.tags.includes("veggie") || recipe.tags.includes("meal_prep")) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[...tags.filter((t) => t !== "quick"), ...recipe.tags.filter((t) => t === "veggie" || t === "meal_prep")].slice(0, 2).map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ color: TAG_META[t].color, background: `color-mix(in srgb, ${TAG_META[t].color} 14%, transparent)` }}>
                <KitchenIcon name={TAG_META[t].icon} className="size-2.5" /> {TAG_META[t].label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

"use client";

import { ArrowLeft, Camera, Check, ChefHat, ChevronRight, Loader2, PenLine, ScanBarcode, Search, Sparkles, UtensilsCrossed, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { CustomFoodSheet } from "@/components/nutrition/CustomFoodSheet";
import { FoodRow } from "@/components/nutrition/FoodRow";
import { FoodSheet } from "@/components/nutrition/FoodSheet";
import { LogComposedSheet } from "@/components/nutrition/LogComposedSheet";
import { QuickAddSheet } from "@/components/nutrition/QuickAddSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { useCustomFoods, useFavoriteIds, useFavorites, useKv, useMeals, useRecentFoods, useRecipes, useToday } from "@/lib/db/hooks";
import { addToNewDraft, DRAFT_KEY, foodPart, type DishDraft } from "@/lib/db/repos/dishDraft";
import { ensureFoodCached } from "@/lib/db/repos/nutrition";
import type { FoodItem, MealSlot, Recipe, SavedMeal } from "@/lib/db/types";
import { ingredientsTotals, MEAL_SLOTS, mealForHour } from "@/lib/domain/nutrition";
import { useFoodSearch } from "@/lib/hooks/useFoodSearch";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { relativeDayLabel } from "@/lib/utils/date";
import { fmtInt } from "@/lib/utils/format";

type Tab = "recent" | "favorites" | "meals" | "recipes" | "mine";

const TABS: { id: Tab; label: string }[] = [
  { id: "recent", label: "Récents" },
  { id: "favorites", label: "Favoris" },
  { id: "meals", label: "Plats" },
  { id: "recipes", label: "Recettes" },
  { id: "mine", label: "Mes aliments" },
];

function AddFood() {
  const { profile } = useGame();
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const date = params.get("date") ?? today;
  const [slot, setSlot] = useState<MealSlot>(() => (params.get("meal") as MealSlot) || mealForHour(new Date().getHours() + new Date().getMinutes() / 60));
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [tab, setTab] = useState<Tab>("recent");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [composed, setComposed] = useState<{ kind: "meal"; meal: SavedMeal } | { kind: "recipe"; recipe: Recipe } | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [added, setAdded] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useFoodSearch(query);
  const recent = useRecentFoods(25);
  const favorites = useFavorites();
  const favIds = useFavoriteIds();
  const meals = useMeals();
  const recipes = useRecipes();
  const custom = useCustomFoods();
  const dishDraft = useKv<DishDraft>(DRAFT_KEY.new);

  useEffect(() => {
    // Focus the search on desktop only: on mobile the keyboard would hide the shortcuts.
    if (window.matchMedia("(min-width: 1024px)").matches) inputRef.current?.focus();
  }, []);

  if (!profile) return <PageSkeleton />;
  const goal = profile.goal;
  const searching = query.trim().length > 0;
  const back = `/nutrition${date !== today ? `?date=${date}` : ""}`;
  const composeHref = `/nutrition/compose?meal=${slot}&date=${date}`;
  const draftCount = dishDraft?.items.length ?? 0;

  const addToDish = async (f: FoodItem, grams: number) => {
    if (f.source !== "builtin") await ensureFoodCached(f);
    await addToNewDraft(foodPart(f, grams, "search"));
    toast({ tone: "success", title: "Ajouté au plat", message: f.name });
    router.push(composeHref);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <IconButton label="Retour au journal" onClick={() => router.push(back)}>
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="label text-arise/90">{relativeDayLabel(date, today)}</p>
          <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">Ajouter un aliment</h1>
        </div>
        {added > 0 && (
          <Button size="sm" onClick={() => router.push(back)}>
            <Check /> Terminé ({added})
          </Button>
        )}
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="radiogroup" aria-label="Repas">
        {MEAL_SLOTS.map((m) => (
          <Chip key={m.id} active={slot === m.id} onClick={() => setSlot(m.id)}>
            <span aria-hidden>{m.emoji}</span> {m.label}
          </Chip>
        ))}
      </div>

      <div className="sticky top-[calc(3.5rem+var(--safe-top))] z-20 -mx-4 bg-void/80 px-4 py-2 backdrop-blur-xl lg:top-0">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un aliment (poulet, riz, skyr…)"
            aria-label="Rechercher un aliment"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl border border-line-strong bg-deep/90 pr-11 pl-11 text-base text-ink outline-none placeholder:text-ink-3 focus:border-arise focus:shadow-[0_0_0_3px_rgb(77_163_255/0.18)]"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="touch-target absolute top-1/2 right-1 flex items-center justify-center -translate-y-1/2 text-ink-3 hover:text-ink" aria-label="Effacer la recherche">
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>

      {!searching && (
        <div className="my-3 grid grid-cols-4 gap-2">
          {[
            { label: "Photo IA", icon: Camera, onClick: () => router.push(`/nutrition/scan?meal=${slot}&date=${date}`), color: "#a78bfa" },
            { label: "Code-barres", icon: ScanBarcode, onClick: () => router.push(`/nutrition/barcode?meal=${slot}&date=${date}`), color: "#22d3ee" },
            { label: "Rapide", icon: Zap, onClick: () => setQuickOpen(true), color: "#fbbf24" },
            { label: "Créer", icon: PenLine, onClick: () => setCustomOpen(true), color: "#34d399" },
          ].map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-deep/60 py-3 text-[12px] font-medium text-ink-2 transition hover:border-line-strong active:scale-95">
              <a.icon className="size-5" style={{ color: a.color }} />
              {a.label}
            </button>
          ))}
        </div>
      )}

      {!searching && (
        <Link
          href={composeHref}
          className={cn(
            "mb-4 flex items-center gap-3 rounded-2xl border px-3 py-3 transition active:scale-[0.99]",
            draftCount ? "panel-glow border-arise/50 bg-arise/10" : "border-line bg-deep/60 hover:border-line-strong",
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-arise/15 text-arise">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{draftCount ? `Reprendre mon plat · ${draftCount} aliment${draftCount > 1 ? "s" : ""}` : "Composer un plat"}</span>
            <span className="block truncate text-[11px] text-ink-3">
              {draftCount ? `${fmtInt(ingredientsTotals(dishDraft!.items).kcal)} kcal · ${dishDraft!.name || "en cours de composition"}` : "Codes-barres + photos IA + recherche, quantités modifiables"}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-3" />
        </Link>
      )}

      {searching ? (
        <div className="panel mt-2 p-2">
          {search.local.length > 0 && (
            <ul>
              {search.local.map((f) => (
                <FoodRow key={f.id} food={f} goal={goal} onSelect={setSelected} favorite={favIds?.has(f.id)} />
              ))}
            </ul>
          )}
          <div className="mt-2 border-t border-line/60 px-2 pt-3 pb-1">
            <p className="label mb-1 flex items-center gap-2">
              Produits du commerce <span className="font-normal tracking-normal normal-case">· Open Food Facts</span>
              {search.loading && <Loader2 className="size-3.5 animate-spin text-arise" />}
            </p>
          </div>
          {search.remote.length > 0 ? (
            <ul>
              {search.remote.map((f) => (
                <FoodRow key={f.id} food={f} goal={goal} onSelect={setSelected} />
              ))}
            </ul>
          ) : (
            !search.loading && (
              <p className="px-2 pb-3 text-sm text-ink-3">
                {query.trim().length < 3 ? "Tape au moins 3 lettres pour chercher les produits de marque." : search.remoteError ? `Recherche en ligne indisponible (${search.remoteError}).` : "Aucun produit trouvé en ligne."}
              </p>
            )
          )}
          {search.local.length === 0 && search.remote.length === 0 && !search.loading && (
            <EmptyState
              className="m-2"
              icon={<Search />}
              title="Aucun résultat"
              description="Crée l'aliment avec les valeurs de l'étiquette ou utilise l'ajout rapide."
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setCustomOpen(true)}>
                    Créer l&apos;aliment
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setQuickOpen(true)}>
                    Ajout rapide
                  </Button>
                </div>
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className="mb-2 flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Sources">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition", tab === t.id ? "bg-arise/15 text-ink" : "text-ink-3 hover:text-ink-2")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="panel p-2" role="tabpanel">
            {tab === "recent" &&
              (recent?.length ? (
                <ul>
                  {recent.filter((r) => r.food).map((r) => (
                    <FoodRow key={r.food!.id} food={r.food!} goal={goal} onSelect={setSelected} favorite={favIds?.has(r.food!.id)} />
                  ))}
                </ul>
              ) : (
                <EmptyState className="m-2" icon={<Sparkles />} title="Pas encore d'historique" description="Les aliments que tu ajoutes apparaîtront ici pour les retrouver en un tap." />
              ))}
            {tab === "favorites" &&
              (favorites?.length ? (
                <ul>
                  {favorites.map((f) => (
                    <FoodRow key={f.id} food={f} goal={goal} onSelect={setSelected} favorite />
                  ))}
                </ul>
              ) : (
                <EmptyState className="m-2" title="Aucun favori" description="Touche le ♥ dans la fiche d'un aliment pour l'épingler ici." />
              ))}
            {tab === "meals" &&
              (meals?.length ? (
                <ul>
                  {meals.map((m) => {
                    const t = ingredientsTotals(m.items);
                    const thumb = m.sources?.find((x) => x.thumb)?.thumb;
                    return (
                      <li key={m.id}>
                        <button type="button" onClick={() => setComposed({ kind: "meal", meal: m })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.03]">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="size-10 shrink-0 rounded-lg bg-white object-cover" />
                          ) : (
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-arise/10 text-lg" aria-hidden>
                              🍱
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{m.name}</span>
                            <span className="block truncate text-[11px] text-ink-3">{m.items.map((i) => i.name).join(", ")}</span>
                          </span>
                          <span className="text-sm font-semibold text-ink tabular">{fmtInt(t.kcal)}</span>
                        </button>
                      </li>
                    );
                  })}
                  <li className="px-2 pt-2 pb-1 text-right">
                    <Link href="/nutrition/library" className="text-xs text-arise">
                      Gérer mes plats →
                    </Link>
                  </li>
                </ul>
              ) : (
                <EmptyState
                  className="m-2"
                  icon={<UtensilsCrossed />}
                  title="Aucun plat enregistré"
                  description="Compose un plat (codes-barres, photos IA, recherche) et garde-le : tu le refais ensuite en un tap, en ajustant les quantités."
                  action={
                    <Link href={composeHref} className="text-sm text-arise">
                      Composer un plat →
                    </Link>
                  }
                />
              ))}
            {tab === "recipes" &&
              (recipes?.length ? (
                <ul>
                  {recipes.map((r) => {
                    const t = ingredientsTotals(r.items);
                    return (
                      <li key={r.id}>
                        <button type="button" onClick={() => setComposed({ kind: "recipe", recipe: r })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.03]">
                          <span className="flex size-10 items-center justify-center rounded-lg bg-violet/15 text-violet-2">
                            <ChefHat className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{r.name}</span>
                            <span className="block text-[11px] text-ink-3">
                              {r.servings} portion(s) · {fmtInt(t.protein / r.servings)} g prot./portion
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-sm font-semibold text-ink tabular">{fmtInt(t.kcal / r.servings)}</span>
                            <span className="block text-[10px] text-ink-3">/ portion</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState className="m-2" icon={<ChefHat />} title="Aucune recette" description="Crée tes recettes : les macros se recalculent automatiquement." action={<Link href="/nutrition/library?tab=recipes" className="text-sm text-arise">Créer une recette →</Link>} />
              ))}
            {tab === "mine" &&
              (custom?.filter((f) => f.source === "custom").length ? (
                <ul>
                  {custom
                    .filter((f) => f.source === "custom")
                    .map((f) => (
                      <FoodRow key={f.id} food={f} goal={goal} onSelect={setSelected} favorite={favIds?.has(f.id)} />
                    ))}
                </ul>
              ) : (
                <EmptyState className="m-2" icon={<PenLine />} title="Aucun aliment personnalisé" action={<Button size="sm" variant="secondary" onClick={() => setCustomOpen(true)}>Créer un aliment</Button>} />
              ))}
          </div>
        </>
      )}

      <FoodSheet open={!!selected} onClose={() => setSelected(null)} food={selected} date={date} meal={slot} onAdded={() => setAdded((n) => n + 1)} onAddToDish={(f, g) => void addToDish(f, g)} />
      <LogComposedSheet open={!!composed} onClose={() => setComposed(null)} target={composed} date={date} slot={slot} onLogged={() => setAdded((n) => n + 1)} />
      <QuickAddSheet open={quickOpen} onClose={() => setQuickOpen(false)} date={date} meal={slot} />
      <CustomFoodSheet open={customOpen} onClose={() => setCustomOpen(false)} onSaved={(f) => setSelected(f)} />
    </div>
  );
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AddFood />
    </Suspense>
  );
}

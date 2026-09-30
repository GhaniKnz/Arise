"use client";

import { Camera, ScanBarcode, Search, Sparkles, Trash2, Undo2, UtensilsCrossed, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { DishBarcodeSheet } from "@/components/nutrition/DishBarcodeSheet";
import { DishPhotoSheet } from "@/components/nutrition/DishPhotoSheet";
import { FoodPickerSheet } from "@/components/nutrition/FoodPickerSheet";
import { ScorePill } from "@/components/nutrition/ScoreBadge";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, TextInput, Toggle } from "@/components/ui/Fields";
import { Badge, EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { Panel } from "@/components/ui/Panel";
import { CATEGORY_META } from "@/lib/data/foods";
import { db } from "@/lib/db";
import { useToday } from "@/lib/db/hooks";
import { addPart, clearDraft, draftFromDish, draftFromEntry, emptyDraft, foodPart, loadDraft, normalizeDraft, saveDraft, type DishDraft, type DishPart, type DraftSlot } from "@/lib/db/repos/dishDraft";
import { deleteEntries, ensureFoodCached, logDish, saveMeal, updateDishEntry } from "@/lib/db/repos/nutrition";
import type { DishSource, Ingredient, MealSlot } from "@/lib/db/types";
import { dishNova, ingredientsTotals, MEAL_LABEL, MEAL_SLOTS, mealForHour, nutritionScore, per100OfIngredients, scaleNutrients, suggestDishName } from "@/lib/domain/nutrition";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { relativeDayLabel } from "@/lib/utils/date";
import { fmtDec, fmtInt } from "@/lib/utils/format";

const CONF_META = { high: ["Fiable", "#34d399"], medium: ["À vérifier", "#fbbf24"], low: ["Incertain", "#f87171"] } as const;

const unitOf = (it: Ingredient) => (it.category === "drinks" ? "ml" : "g");

function ItemRow({ item, onGrams, onName, onRemove }: { item: Ingredient; onGrams: (g: number) => void; onName?: (name: string) => void; onRemove?: () => void }) {
  const n = scaleNutrients(item.per100, item.grams);
  const unit = unitOf(item);
  return (
    <div>
      {(onName || onRemove) && (
        <div className="mb-1 flex items-center gap-1">
          {onName ? (
            <TextInput value={item.name} onChange={(e) => onName(e.target.value)} aria-label="Nom de l'aliment" className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-1 text-[15px] font-medium" />
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {item.confidence && <Badge color={CONF_META[item.confidence][1]}>{CONF_META[item.confidence][0]}</Badge>}
          {onRemove && (
            <IconButton label={`Retirer ${item.name}`} size="sm" onClick={onRemove}>
              <X />
            </IconButton>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 px-1 text-[11px] leading-snug text-ink-3">
          <span className="font-semibold text-ink-2">{fmtInt(n.kcal)} kcal</span> · P {fmtDec(n.protein)} · G {fmtDec(n.carbs)} · L {fmtDec(n.fat)}
        </p>
        <NumberInput value={item.grams} onChange={(v) => onGrams(v ?? 0)} stepper={false} min={0} max={5000} unit={unit} decimals={0} className="w-[6.75rem] shrink-0" ariaLabel={`Quantité de ${item.name}`} />
      </div>
    </div>
  );
}

function SourceThumb({ source, item }: { source: DishSource; item?: Ingredient }) {
  if (source.thumb)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={source.thumb} alt="" className={`size-12 shrink-0 rounded-xl ${source.kind === "photo" ? "object-cover" : "bg-white object-contain"}`} />;
  if (source.kind === "photo")
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet/15 text-violet-2">
        <Camera className="size-5" />
      </span>
    );
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-2xl" aria-hidden>
      {CATEGORY_META[item?.category ?? "other"].emoji}
    </span>
  );
}

function ComposeScreen() {
  const { profile } = useGame();
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const [slot, setSlot] = useState<DraftSlot | null>(null);
  const [draft, setDraft] = useState<DishDraft | null>(null);
  const [missing, setMissing] = useState(false);
  const [meal, setMeal] = useState<MealSlot>(() => (params.get("meal") as MealSlot) || mealForHour(new Date().getHours() + new Date().getMinutes() / 60));
  const [keep, setKeep] = useState(true);
  const [sheet, setSheet] = useState<"barcode" | "photo" | "search" | null>(null);
  const [undo, setUndo] = useState<{ label: string; draft: DishDraft } | null>(null);
  const [saving, setSaving] = useState(false);
  const inited = useRef(false);
  const sourceCount = useRef(0);

  // Load the dish to edit (then drop the id from the URL so a reload resumes the draft instead of starting over).
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    void (async () => {
      const dishId = params.get("dish");
      const entryId = params.get("entry");
      if (!dishId && !entryId) {
        const s: DraftSlot = params.get("edit") ? "edit" : "new";
        const d = await loadDraft(s);
        if (d.target?.kind === "entry" && !params.get("meal")) setMeal(d.target.meal);
        setKeep(!d.target);
        setSlot(s);
        setDraft(d);
        return;
      }
      let d: DishDraft;
      if (dishId) {
        const dish = await db.meals.get(dishId);
        if (!dish) return setMissing(true);
        d = draftFromDish(dish, params.get("intent") === "save" ? "save" : "log");
        if (!params.get("meal") && dish.defaultSlot) setMeal(dish.defaultSlot);
      } else {
        const entry = await db.foodEntries.get(entryId!);
        if (!entry?.items?.length) return setMissing(true);
        d = draftFromEntry(entry, entry.dishId ? await db.meals.get(entry.dishId) : undefined);
        setMeal(entry.meal);
      }
      await saveDraft("edit", d);
      setKeep(false);
      setSlot("edit");
      setDraft(d);
      const q = new URLSearchParams({ edit: "1" });
      for (const k of ["date", "meal"]) if (params.get(k)) q.set(k, params.get(k)!);
      router.replace(`/nutrition/compose?${q}`, { scroll: false });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (slot && draft) void saveDraft(slot, draft);
  }, [slot, draft]);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 6000);
    return () => window.clearTimeout(t);
  }, [undo]);

  // Bring what was just added into view.
  useEffect(() => {
    const n = draft?.sources.length ?? 0;
    if (n > sourceCount.current && sourceCount.current > 0) document.querySelector(`[data-source="${draft!.sources[n - 1].id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    sourceCount.current = n;
  }, [draft]);

  if (missing)
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState className="mt-10" icon={<UtensilsCrossed />} title="Plat introuvable" description="Il a peut-être été supprimé." action={<Button size="sm" onClick={() => router.push("/nutrition")}>Retour au journal</Button>} />
      </div>
    );
  if (!profile || !draft || !slot) return <PageSkeleton />;

  const target = draft.target;
  const saveOnly = target?.kind === "dish" ? target.intent === "save" : !target && params.get("intent") === "save";
  const date = target?.kind === "entry" ? target.date : (params.get("date") ?? today);
  const journal = `/nutrition${date !== today ? `?date=${date}` : ""}`;
  const back = target?.kind === "entry" ? journal : saveOnly ? "/nutrition/library" : `/nutrition/add?meal=${meal}&date=${date}`;

  const items = draft.items;
  const t = ingredientsTotals(items);
  const score = items.length ? nutritionScore({ ...per100OfIngredients(items), nova: dishNova(items), category: "prepared" }, profile.goal).score : null;
  const firstPhoto = draft.sources.find((s) => s.kind === "photo");
  const suggested = suggestDishName(items, firstPhoto?.label);
  const name = draft.name.trim() || suggested;

  const update = (fn: (d: DishDraft) => DishDraft) => setDraft((d) => (d ? fn(d) : d));
  const withUndo = (label: string) => setUndo({ label, draft });
  const add = (part: DishPart) => update((d) => addPart(d, part));
  const setItem = (index: number, patch: Partial<Ingredient>) => update((d) => ({ ...d, items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  const removeItem = (index: number) => {
    withUndo(`« ${items[index].name} » retiré`);
    update((d) => normalizeDraft({ ...d, items: d.items.filter((_, i) => i !== index) }));
  };
  const removeSource = (s: DishSource) => {
    withUndo(s.kind === "photo" ? "Photo et ses aliments retirés" : `« ${s.label} » retiré`);
    update((d) => ({ ...d, sources: d.sources.filter((x) => x.id !== s.id), items: d.items.filter((it) => it.sourceId !== s.id) }));
  };
  const clearAll = () => {
    withUndo("Plat vidé");
    update((d) => ({ ...emptyDraft(), target: d.target }));
  };

  const valid = () => {
    const kept = items.filter((it) => it.grams > 0);
    if (!kept.length) toast({ tone: "error", title: "Plat vide", message: "Ajoute au moins un aliment avec une quantité." });
    return kept;
  };

  const finish = async (logIt: boolean) => {
    const kept = valid();
    if (!kept.length || saving) return;
    setSaving(true);
    try {
      const sources = draft.sources.filter((s) => kept.some((it) => it.sourceId === s.id));
      const dish = { name, items: kept, sources };
      const kcal = `${fmtInt(ingredientsTotals(kept).kcal)} kcal`;
      if (!logIt) {
        await saveMeal({ id: target?.kind === "dish" ? target.id : target?.kind === "entry" ? target.dishId : undefined, ...dish, defaultSlot: meal });
        toast({ tone: "success", title: "Plat enregistré", message: `${name} · retrouve-le dans « Plats »` });
      } else if (target?.kind === "entry") {
        let dishId = target.dishId;
        if (keep) dishId = await saveMeal({ id: target.dishId, ...dish, defaultSlot: meal });
        await updateDishEntry(target.id, { ...dish, meal, dishId });
        toast({ tone: "success", title: "Entrée mise à jour", message: `${name} · ${kcal}` });
      } else {
        let dishId = target?.kind === "dish" ? target.id : undefined;
        if (keep) dishId = await saveMeal({ id: dishId, ...dish, defaultSlot: meal });
        await logDish({ ...dish, date, meal, dishId });
        cue("set");
        toast({ tone: "success", title: `${name} ajouté`, message: `${kcal} · ${MEAL_LABEL[meal]}` });
      }
      await clearDraft(slot);
      router.push(logIt || target?.kind === "entry" ? journal : saveOnly ? "/nutrition/library" : back);
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async () => {
    if (target?.kind !== "entry") return;
    await deleteEntries([target.id]);
    await clearDraft(slot);
    toast({ tone: "success", title: "Entrée supprimée", message: name });
    router.push(journal);
  };

  const title = target?.kind === "entry" ? "Modifier le plat" : target?.kind === "dish" ? target.name : "Composer un plat";
  const kicker = target?.kind === "entry" ? `Journal · ${relativeDayLabel(date, today)}` : saveOnly ? "Mes plats" : `${relativeDayLabel(date, today)} · ${MEAL_LABEL[meal]}`;
  const toggle =
    saveOnly || !items.length
      ? null
      : target?.kind === "dish"
        ? { label: `Mettre à jour « ${target.name} »`, description: keep ? "Le plat enregistré prendra ces quantités." : "Sinon, ces quantités ne valent que pour ce repas." }
        : target?.kind === "entry" && target.dishId
          ? { label: `Mettre aussi à jour « ${target.dishName} »`, description: keep ? "Le plat enregistré prendra ces quantités." : "Seule cette entrée du journal change." }
          : { label: "Garder dans Mes plats", description: "Pour le refaire en un tap et ajuster les quantités la prochaine fois." };

  const addButtons = [
    { id: "barcode" as const, label: "Code-barres", icon: ScanBarcode, color: "#22d3ee" },
    { id: "photo" as const, label: "Photo IA", icon: Camera, color: "#a78bfa" },
    { id: "search" as const, label: "Rechercher", icon: Search, color: "#34d399" },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <IconButton label="Retour" onClick={() => router.push(back)}>
          <X />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="label truncate text-arise/90">{kicker}</p>
          <h1 className="truncate font-display text-xl font-bold text-ink sm:text-2xl">{title}</h1>
        </div>
        {target?.kind === "entry" ? (
          <IconButton label="Supprimer l'entrée du journal" onClick={removeEntry} className="text-bad">
            <Trash2 />
          </IconButton>
        ) : (
          items.length > 0 && (
            <IconButton label="Tout effacer" onClick={clearAll}>
              <Trash2 />
            </IconButton>
          )
        )}
      </div>

      <Field label="Nom du plat">
        <TextInput value={draft.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} placeholder={suggested} maxLength={60} />
      </Field>

      {items.length > 0 ? (
        <>
          <Panel glow hud className="mt-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["kcal", fmtInt(t.kcal)],
                ["Prot.", `${fmtInt(t.protein)} g`],
                ["Gluc.", `${fmtInt(t.carbs)} g`],
                ["Lip.", `${fmtInt(t.fat)} g`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/[0.04] py-2">
                  <p className="font-display text-lg font-semibold text-ink tabular">{v}</p>
                  <p className="text-[10px] text-ink-3">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center justify-between text-xs text-ink-3">
              <span>
                {fmtInt(t.grams)} g · {items.length} aliment{items.length > 1 ? "s" : ""} · {draft.sources.length} ajout{draft.sources.length > 1 ? "s" : ""}
              </span>
              {score != null && (
                <span className="flex items-center gap-1.5">
                  Score <ScorePill score={score} />
                </span>
              )}
            </p>
          </Panel>

          <ul className="mt-4 space-y-3">
            {draft.sources.map((s) => {
              const own = items.map((it, index) => ({ it, index })).filter(({ it }) => it.sourceId === s.id);
              if (!own.length) return null;
              if (s.kind === "photo") {
                const kcal = own.reduce((a, { it }) => a + (it.per100.kcal * it.grams) / 100, 0);
                return (
                  <li key={s.id} data-source={s.id} className="panel overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-line/60 p-3">
                      <SourceThumb source={s} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-[11px] font-medium text-violet-2">
                          <Sparkles className="size-3" /> Photo IA
                        </p>
                        <p className="truncate font-medium text-ink">{s.label}</p>
                        <p className="text-[11px] text-ink-3">
                          {own.length} aliment{own.length > 1 ? "s" : ""} · {fmtInt(kcal)} kcal
                        </p>
                      </div>
                      <IconButton label="Retirer cette photo et ses aliments" onClick={() => removeSource(s)}>
                        <Trash2 />
                      </IconButton>
                    </div>
                    <ul className="divide-y divide-line/50">
                      {own.map(({ it, index }) => (
                        <li key={index} className="px-3 py-2.5">
                          <ItemRow item={it} onGrams={(g) => setItem(index, { grams: g })} onName={(v) => setItem(index, { name: v })} onRemove={() => removeItem(index)} />
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
              return own.map(({ it, index }) => (
                <li key={`${s.id}-${index}`} data-source={s.id} className="panel p-3">
                  <div className="mb-2 flex items-center gap-3">
                    <SourceThumb source={s} item={it} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-[11px] font-medium" style={{ color: s.kind === "barcode" ? "#22d3ee" : "#34d399" }}>
                        {s.kind === "barcode" ? <ScanBarcode className="size-3" /> : <Search className="size-3" />}
                        {s.kind === "barcode" ? "Code-barres" : "Aliment"}
                      </p>
                      <p className="truncate text-sm font-medium text-ink">{it.name}</p>
                    </div>
                    <IconButton label={`Retirer ${it.name}`} onClick={() => (own.length > 1 ? removeItem(index) : removeSource(s))}>
                      <Trash2 />
                    </IconButton>
                  </div>
                  <ItemRow item={it} onGrams={(g) => setItem(index, { grams: g })} />
                </li>
              ));
            })}
          </ul>

          <p className="label mt-5 mb-2">Ajouter au plat</p>
        </>
      ) : (
        <Panel className="mt-4 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-arise/10 text-arise">
            <UtensilsCrossed className="size-6" />
          </span>
          <p className="mt-3 font-display text-lg font-semibold text-ink">Compose ton plat</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
            Scanne les codes-barres des produits utilisés, prends l&apos;assiette en photo ou cherche un aliment. Ajoute-en autant que tu veux, retire ce qui ne va pas et ajuste chaque quantité.
          </p>
        </Panel>
      )}

      <div className={`grid grid-cols-3 gap-2 ${items.length ? "" : "mt-3"}`}>
        {addButtons.map((a) => (
          <button key={a.id} type="button" onClick={() => setSheet(a.id)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-deep/60 py-3.5 text-[13px] font-medium text-ink-2 transition hover:border-line-strong active:scale-95">
            <a.icon className="size-6" style={{ color: a.color }} />
            {a.label}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <Panel padded={false} className="mt-4 px-4 pt-3 pb-2">
          <p className="label mb-2">{saveOnly ? "Repas par défaut" : "Repas"}</p>
          <Segmented value={meal} onChange={setMeal} size="sm" ariaLabel={saveOnly ? "Repas par défaut" : "Repas"} options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />
          {toggle && <Toggle checked={keep} onChange={setKeep} label={toggle.label} description={toggle.description} />}
          {toggle && target?.kind !== "entry" && (
            <button type="button" onClick={() => void finish(false)} className="mb-1 text-left text-xs text-arise hover:underline" disabled={saving}>
              {target?.kind === "dish" ? "Enregistrer les changements du plat sans l'ajouter au journal" : "Enregistrer dans Mes plats sans l'ajouter au journal"}
            </button>
          )}
        </Panel>
      )}

      <div className="sticky bottom-[calc(4.75rem+var(--safe-bottom))] z-20 -mx-4 mt-4 space-y-2 border-t border-line bg-void/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
        {undo && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line-strong bg-raised px-3 py-2 text-sm">
            <span className="truncate text-ink-2">{undo.label}</span>
            <button
              type="button"
              onClick={() => {
                setDraft(undo.draft);
                setUndo(null);
              }}
              className="flex shrink-0 items-center gap-1 font-medium text-arise"
            >
              <Undo2 className="size-4" /> Annuler
            </button>
          </div>
        )}
        <Button block size="lg" onClick={() => void finish(!saveOnly)} disabled={!items.length || saving}>
          {saveOnly ? "Enregistrer le plat" : target?.kind === "entry" ? `Mettre à jour · ${fmtInt(t.kcal)} kcal` : `Ajouter au journal · ${fmtInt(t.kcal)} kcal`}
        </Button>
      </div>

      <DishBarcodeSheet open={sheet === "barcode"} onClose={() => setSheet(null)} onAdd={add} />
      <DishPhotoSheet open={sheet === "photo"} onClose={() => setSheet(null)} onAdd={add} />
      <FoodPickerSheet
        open={sheet === "search"}
        onClose={() => setSheet(null)}
        title="Ajouter un aliment au plat"
        onPick={(f) => {
          if (f.source !== "builtin") void ensureFoodCached(f);
          add(foodPart(f, f.defaultGrams, "search"));
        }}
      />
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ComposeScreen />
    </Suspense>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BookmarkCheck, Camera, History, ImageUp, Package, Plus, RotateCcw, Sparkles, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { FoodPickerSheet } from "@/components/nutrition/FoodPickerSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, TextInput, Toggle } from "@/components/ui/Fields";
import { Badge, ErrorBox, Notice, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { ApiError } from "@/lib/api";
import type { MealAnalysis } from "@/lib/ai/schemas";
import { addToNewDraft, photoPart } from "@/lib/db/repos/dishDraft";
import { logIngredients, rememberMeal, rememberProducts } from "@/lib/db/repos/nutrition";
import { useToday } from "@/lib/db/hooks";
import type { MealSlot, SavedMeal } from "@/lib/db/types";
import { foodToIngredient, MEAL_SLOTS, mealForHour } from "@/lib/domain/nutrition";
import { analysisToItems, analyzeMealPhoto, normName, photoItemsToIngredients, photoThumb, type PhotoItem } from "@/lib/food/mealPhoto";
import { useBlobUrl } from "@/lib/hooks/useBlobUrl";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { fmtDec, fmtInt, plainDashes } from "@/lib/utils/format";

type EditableItem = PhotoItem;

const CONF_META = { high: ["Fiable", "#34d399"], medium: ["Moyen", "#fbbf24"], low: ["Incertain", "#f87171"] } as const;

function ScanScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const date = params.get("date") ?? today;
  const [slot, setSlot] = useState<MealSlot>((params.get("meal") as MealSlot) || mealForHour(new Date().getHours()));
  const [file, setFile] = useState<Blob | null>(null);
  const preview = useBlobUrl(file);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [picking, setPicking] = useState(false);
  const [kind, setKind] = useState<"dish" | "products">("dish");
  const [dishName, setDishName] = useState("");
  const [knownMeal, setKnownMeal] = useState<SavedMeal | null>(null);
  const [remember, setRemember] = useState(true);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, { ingredient: it }) => {
          const f = it.grams / 100;
          return { kcal: acc.kcal + it.per100.kcal * f, protein: acc.protein + it.per100.protein * f, carbs: acc.carbs + it.per100.carbs * f, fat: acc.fat + it.per100.fat * f };
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [items],
  );

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { analysis: a, mem } = await analyzeMealPhoto(file, note);
      if (!a.is_food || a.items.length === 0) {
        setError("Aucun aliment détecté sur cette photo. Essaie avec le repas bien visible, vu de dessus.");
        return;
      }
      cue("quest");
      const meal = mem ? ((a.known_meal_id && mem.mealsById.get(a.known_meal_id)) || mem.mealsByName.get(normName(a.meal_name)) || null) : null;
      setAnalysis(a);
      setKind(a.kind);
      setDishName(meal?.name ?? a.meal_name);
      setKnownMeal(meal);
      setRemember(true);
      setItems(analysisToItems(a, mem));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Analyse impossible.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setItems([]);
    setError(null);
    setKnownMeal(null);
  };

  const save = async () => {
    const valid = items.filter((i) => i.ingredient.grams > 0);
    if (!valid.length) return;
    let ingredients = valid.map((i) => i.ingredient);
    const notes: string[] = [];
    if (remember && kind === "products") {
      const before = ingredients.filter((i) => !i.foodId).length;
      const ids = await rememberProducts(ingredients);
      ingredients = ingredients.map((it, i) => ({ ...it, foodId: ids[i] ?? it.foodId }));
      if (before) notes.push(`${before} produit${before > 1 ? "s" : ""} mémorisé${before > 1 ? "s" : ""}`);
    }
    if (remember && kind === "dish" && !knownMeal && dishName.trim()) {
      const [, created] = await rememberMeal(dishName, ingredients, slot);
      notes.push(created ? "plat enregistré dans Mes plats" : "plat déjà dans Mes plats");
    }
    await logIngredients({ date, meal: slot, items: ingredients, source: "photo" });
    cue("set");
    toast({ tone: "success", title: "Repas ajouté", message: [`${fmtInt(totals.kcal)} kcal · ${MEAL_SLOTS.find((m) => m.id === slot)?.label}`, ...notes].join(" · ") });
    router.push(`/nutrition${date !== today ? `?date=${date}` : ""}`);
  };

  /** Continues in the dish composer, where more barcodes and photos can be added. */
  const compose = async () => {
    const valid = items.filter((i) => i.ingredient.grams > 0);
    if (!valid.length || !analysis) return;
    const thumb = file ? await photoThumb(file).catch(() => undefined) : undefined;
    await addToNewDraft(photoPart(dishName.trim() || analysis.meal_name, photoItemsToIngredients(valid), thumb));
    router.push(`/nutrition/compose?meal=${slot}&date=${date}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.back()}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader kicker="Vision IA" title="Scanner mon repas" subtitle="Photo → aliments, portions et macros estimés" />

      {!analysis && (
        <Panel padded={false} className="overflow-hidden">
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Photo du repas" className="max-h-[60dvh] w-full object-cover" />
              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-void/55 backdrop-blur-[2px]">
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-arise shadow-[0_0_24px_6px_rgb(77_163_255/0.7)]"
                      initial={{ top: "0%" }}
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <Sparkles className="size-8 animate-pulse text-arise" />
                    <p className="label mt-3 text-arise">Analyse du Système…</p>
                    <p className="mt-1 text-xs text-ink-2">Identification des aliments et des portions</p>
                  </motion.div>
                )}
              </AnimatePresence>
              {!loading && (
                <button type="button" onClick={reset} className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-void/70 text-ink" aria-label="Retirer la photo">
                  <X className="size-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              <Button variant="secondary" size="lg" className="h-36 flex-col" onClick={() => cameraRef.current?.click()}>
                <Camera className="size-8!" /> Prendre une photo
              </Button>
              <Button variant="secondary" size="lg" className="h-36 flex-col" onClick={() => galleryRef.current?.click()}>
                <ImageUp className="size-8!" /> Importer
              </Button>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {preview && (
            <div className="space-y-3 p-4">
              <Field label="Précision (optionnel)" hint="Ex. « cuit à l'huile d'olive », « sauce curry au lait de coco »">
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ingrédients cachés, quantité connue…" />
              </Field>
              <Button block size="lg" onClick={analyze} disabled={loading}>
                <Sparkles /> Analyser le repas
              </Button>
            </div>
          )}
        </Panel>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBox
            title="Analyse impossible"
            message={error}
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={analyze} disabled={!file || loading}>
                  <RotateCcw /> Réessayer
                </Button>
                <Link href="/settings#ai" className="inline-flex h-9 items-center text-sm text-arise">
                  Configurer l&apos;IA →
                </Link>
              </div>
            }
          />
        </div>
      )}

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Panel glow hud>
            <p className="label text-arise">Repas détecté</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">{analysis.meal_name}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                ["kcal", fmtInt(totals.kcal)],
                ["Prot.", `${fmtInt(totals.protein)} g`],
                ["Gluc.", `${fmtInt(totals.carbs)} g`],
                ["Lip.", `${fmtInt(totals.fat)} g`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/[0.04] py-2">
                  <p className="font-display text-lg font-semibold text-ink">{v}</p>
                  <p className="text-[10px] text-ink-3">{l}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Notice tone="warn">
            <strong>Estimation IA :</strong> vérifie les quantités pour améliorer la précision. {plainDashes(analysis.notes ?? "")}
          </Notice>

          <Panel className="space-y-3">
            <Segmented
              value={kind}
              onChange={setKind}
              size="sm"
              ariaLabel="Type de repas"
              options={[
                { value: "dish", label: "Plat composé", icon: <UtensilsCrossed /> },
                { value: "products", label: "Produits séparés", icon: <Package /> },
              ]}
            />
            {kind === "dish" ? (
              knownMeal ? (
                <p className="flex items-center gap-2 rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-sm text-ink">
                  <BookmarkCheck className="size-4 shrink-0 text-good" /> Déjà dans tes plats : <strong className="truncate">{knownMeal.name}</strong>
                </p>
              ) : (
                <>
                  <Field label="Nom du plat">
                    <TextInput value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="Ex. Assiette de curry poulet" />
                  </Field>
                  <Toggle checked={remember} onChange={setRemember} label="Enregistrer ce plat dans Mes plats" description="Il sera reconnu à la prochaine photo, et ajoutable en un tap" />
                </>
              )
            ) : (
              <Toggle
                checked={remember}
                onChange={setRemember}
                label="Mémoriser les nouveaux produits"
                description={`Ajoutés à Mes aliments sans doublon (${items.filter((i) => !i.known).length} nouveau${items.filter((i) => !i.known).length > 1 ? "x" : ""}, ${items.filter((i) => i.known).length} déjà connu${items.filter((i) => i.known).length > 1 ? "s" : ""})`}
              />
            )}
          </Panel>

          <ul className="space-y-2">
            {items.map((it, i) => {
              const f = it.ingredient.grams / 100;
              return (
                <li key={it.key} className="panel p-3">
                  {/* Name on its own line, quantity below: the stepper keeps a readable width on phones. */}
                  <div className="flex items-center gap-1">
                    <TextInput
                      value={it.ingredient.name}
                      onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ingredient: { ...x.ingredient, name: e.target.value } } : x)))}
                      aria-label="Nom de l'aliment"
                      className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-1 font-medium"
                    />
                    <IconButton label={`Retirer ${it.ingredient.name}`} size="sm" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>
                      <X />
                    </IconButton>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-ink-3">
                      <span>
                        <span className="font-semibold text-ink-2">{fmtInt(it.ingredient.per100.kcal * f)} kcal</span> · P {fmtDec(it.ingredient.per100.protein * f)} · G {fmtDec(it.ingredient.per100.carbs * f)} · L {fmtDec(it.ingredient.per100.fat * f)}
                      </span>
                      {it.known ? (
                        <Badge color="#34d399">
                          <History className="mr-0.5 inline size-3" /> Connu
                        </Badge>
                      ) : (
                        it.confidence && <Badge color={CONF_META[it.confidence][1]}>{CONF_META[it.confidence][0]}</Badge>
                      )}
                    </p>
                    <NumberInput
                      value={it.ingredient.grams}
                      onChange={(v) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ingredient: { ...x.ingredient, grams: v ?? 0 } } : x)))}
                      step={10}
                      min={0}
                      max={3000}
                      unit="g"
                      decimals={0}
                      className="w-48 shrink-0"
                      ariaLabel={`Quantité de ${it.ingredient.name}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="secondary" block onClick={() => setPicking(true)}>
              <Plus /> Ajouter un aliment oublié
            </Button>
            <Button variant="secondary" block onClick={compose} disabled={!items.length}>
              <UtensilsCrossed /> Composer un plat avec
            </Button>
          </div>
          <p className="-mt-2 text-xs text-ink-3">« Composer un plat » : ajoute d&apos;autres photos ou codes-barres (sauce, fromage…) avant de l&apos;enregistrer comme un seul plat.</p>

          <Segmented value={slot} onChange={setSlot} size="sm" ariaLabel="Repas" options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.label.replace("Petit-déjeuner", "Petit-déj.") }))} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>
              <RotateCcw /> Recommencer
            </Button>
            <Button block size="lg" onClick={save} disabled={!items.length}>
              Ajouter au journal · {fmtInt(totals.kcal)} kcal
            </Button>
          </div>
        </motion.div>
      )}

      <FoodPickerSheet open={picking} onClose={() => setPicking(false)} onPick={(food) => setItems((xs) => [...xs, { key: `${Date.now()}`, ingredient: foodToIngredient(food) }])} />
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ScanScreen />
    </Suspense>
  );
}

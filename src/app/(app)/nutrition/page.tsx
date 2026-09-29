"use client";

import { BookOpen, Camera, Plus, ScanBarcode } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { FoodSheet } from "@/components/nutrition/FoodSheet";
import { MacroBars } from "@/components/nutrition/MacroBars";
import { MealSection } from "@/components/nutrition/MealSection";
import { QuickAddSheet } from "@/components/nutrition/QuickAddSheet";
import { SaveMealSheet } from "@/components/nutrition/SaveMealSheet";
import { ScorePill } from "@/components/nutrition/ScoreBadge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { DayNav, useDateParam } from "@/components/ui/DayNav";
import { PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Ring } from "@/components/ui/Progress";
import { FOOD_BY_ID } from "@/lib/data/foods";
import { db } from "@/lib/db";
import { useDayEntries } from "@/lib/db/hooks";
import { copyMeal } from "@/lib/db/repos/nutrition";
import type { FoodEntry, FoodItem, MealSlot } from "@/lib/db/types";
import { entriesScore, MEAL_SLOTS, totalsOf } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";
import { addDays } from "@/lib/utils/date";
import { fmtInt } from "@/lib/utils/format";

function NutritionJournal() {
  const { profile } = useGame();
  const [date, setDate] = useDateParam();
  const entries = useDayEntries(date);
  const [editing, setEditing] = useState<{ entry: FoodEntry; food: FoodItem | null } | null>(null);
  const [quickEdit, setQuickEdit] = useState<FoodEntry | null>(null);
  const [saveSlot, setSaveSlot] = useState<MealSlot | null>(null);

  const bySlot = useMemo(() => {
    const m = new Map<MealSlot, FoodEntry[]>(MEAL_SLOTS.map((s) => [s.id, []]));
    for (const e of entries ?? []) m.get(e.meal)?.push(e);
    return m;
  }, [entries]);

  if (!profile || entries === undefined) return <PageSkeleton />;
  const t = profile.targets;
  const totals = totalsOf(entries);
  const quality = entriesScore(entries, profile.goal);
  const left = t.kcal - totals.kcal;

  const edit = async (e: FoodEntry) => {
    if (e.source === "quick" || !e.per100) {
      setQuickEdit(e);
      return;
    }
    const food = e.foodId ? (FOOD_BY_ID.get(e.foodId) ?? ((await db.foods.get(e.foodId)) as FoodItem | undefined) ?? null) : null;
    setEditing({ entry: e, food });
  };

  const copyYesterday = async (slot: MealSlot) => {
    const n = await copyMeal(addDays(date, -1), slot, date);
    toast(n ? { tone: "success", title: `${n} aliment(s) copié(s) depuis hier` } : { tone: "warn", title: "Rien à copier", message: "Ce repas était vide hier." });
  };

  const addHref = (slot: MealSlot) => `/nutrition/add?meal=${slot}&date=${date}`;

  return (
    <>
      <PageHeader kicker="Journal alimentaire" title="Nutrition" action={<DayNav date={date} onChange={setDate} />} className="flex-wrap" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-4">
          <Panel className="flex flex-col items-center gap-5 sm:flex-row">
            <Ring value={totals.kcal} max={t.kcal} size={150} stroke={12} label={`${fmtInt(totals.kcal)} kilocalories sur ${fmtInt(t.kcal)}`}>
              <span className="font-display text-3xl font-bold text-white">
                <AnimatedNumber value={totals.kcal} />
              </span>
              <span className="text-[11px] text-ink-3">/ {fmtInt(t.kcal)} kcal</span>
            </Ring>
            <div className="w-full flex-1 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={left >= 0 ? "text-arise" : "text-warn"}>{left >= 0 ? `${fmtInt(left)} kcal restantes` : `${fmtInt(-left)} kcal au-dessus`}</span>
                {quality != null && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-3">
                    Qualité du jour <ScorePill score={quality} />
                  </span>
                )}
              </div>
              <MacroBars compact totals={totals} targets={t} />
            </div>
          </Panel>

          <div className="grid grid-cols-4 gap-2">
            {[
              { href: `/nutrition/add?date=${date}`, label: "Ajouter", icon: Plus, primary: true },
              { href: "/nutrition/scan", label: "Photo IA", icon: Camera },
              { href: "/nutrition/barcode", label: "Code-barres", icon: ScanBarcode },
              { href: "/nutrition/library", label: "Repas", icon: BookOpen },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center text-[12px] font-medium transition active:scale-95 ${a.primary ? "bg-arise-gradient border-transparent text-white shadow-glow" : "border-line bg-deep/60 text-ink-2 hover:border-line-strong"}`}
              >
                <a.icon className="size-5" />
                {a.label}
              </Link>
            ))}
          </div>

          {MEAL_SLOTS.map((s) => (
            <MealSection
              key={s.id}
              meal={s.id}
              entries={bySlot.get(s.id) ?? []}
              goal={profile.goal}
              addHref={addHref(s.id)}
              onEdit={edit}
              onCopyYesterday={() => copyYesterday(s.id)}
              onSaveAsMeal={() => setSaveSlot(s.id)}
            />
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8">
          <Panel>
            <p className="label mb-2">Détail du jour</p>
            <dl className="space-y-1.5 text-sm">
              {(
                [
                  ["Sucres", totals.sugar, "g"],
                  ["Graisses saturées", totals.satFat, "g"],
                  ["Sel", totals.salt, "g"],
                  ["Fibres", totals.fiber, "g"],
                ] as [string, number, string][]
              ).map(([k, v, u]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-ink tabular">
                    {v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} {u}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-ink-3">Repères : fibres ≥ 25–30 g/jour, sel ≤ 5 g/jour (OMS).</p>
          </Panel>
          <Panel>
            <p className="label mb-2">Astuce</p>
            <p className="text-sm text-ink-2">Pèse tes aliments crus quand c&apos;est possible : les valeurs changent beaucoup à la cuisson (le riz triple de poids).</p>
          </Panel>
        </aside>
      </div>

      <FoodSheet open={!!editing} onClose={() => setEditing(null)} food={editing?.food ?? null} entry={editing?.entry} date={date} meal={editing?.entry.meal ?? "lunch"} />
      <QuickAddSheet open={!!quickEdit} onClose={() => setQuickEdit(null)} date={date} meal={quickEdit?.meal ?? "lunch"} entry={quickEdit} />
      <SaveMealSheet open={!!saveSlot} onClose={() => setSaveSlot(null)} entries={saveSlot ? (bySlot.get(saveSlot) ?? []) : []} slot={saveSlot ?? "lunch"} />
    </>
  );
}

export default function NutritionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NutritionJournal />
    </Suspense>
  );
}

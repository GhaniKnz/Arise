"use client";

import { BookmarkPlus, Copy, Plus } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import type { FoodEntry, MealSlot } from "@/lib/db/types";
import { MEAL_SLOTS, nutritionScore, totalsOf } from "@/lib/domain/nutrition";
import type { GoalType } from "@/lib/db/types";
import { fmtInt } from "@/lib/utils/format";
import { ScorePill } from "./ScoreBadge";

interface Props {
  meal: MealSlot;
  entries: FoodEntry[];
  goal: GoalType;
  addHref: string;
  onEdit: (e: FoodEntry) => void;
  onCopyYesterday: () => void;
  onSaveAsMeal: () => void;
}

export function MealSection({ meal, entries, goal, addHref, onEdit, onCopyYesterday, onSaveAsMeal }: Props) {
  const meta = MEAL_SLOTS.find((m) => m.id === meal)!;
  const t = totalsOf(entries);
  return (
    <section className="panel overflow-hidden" aria-labelledby={`meal-${meal}`}>
      <header className="flex items-center gap-3 border-b border-line/70 px-4 py-3">
        <span className="text-xl" aria-hidden>
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`meal-${meal}`} className="font-display text-[15px] font-semibold tracking-wide text-ink">
            {meta.label}
          </h2>
          {entries.length > 0 && (
            <p className="text-[11px] text-ink-3 tabular">
              P {fmtInt(t.protein)} · G {fmtInt(t.carbs)} · L {fmtInt(t.fat)}
            </p>
          )}
        </div>
        <span className="font-display text-lg font-semibold text-ink tabular">
          {fmtInt(t.kcal)}
          <span className="ml-0.5 text-xs font-normal text-ink-3">kcal</span>
        </span>
        <Link href={addHref} className="flex size-9 items-center justify-center rounded-xl bg-arise/15 text-arise transition active:scale-90" aria-label={`Ajouter au ${meta.label.toLowerCase()}`}>
          <Plus className="size-5" />
        </Link>
      </header>
      {entries.length > 0 ? (
        <ul className="divide-y divide-line/50">
          <AnimatePresence initial={false}>
            {entries.map((e) => {
              const score = e.per100 ? nutritionScore({ ...e.per100, nova: e.nova, category: e.category }, goal).score : null;
              return (
                <motion.li key={e.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <button type="button" onClick={() => onEdit(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/[0.02]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{e.name}</span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {e.brand ? `${e.brand} · ` : ""}
                        {e.grams > 0 ? `${fmtInt(e.grams)} ${e.category === "drinks" ? "ml" : "g"}` : "Ajout rapide"} · P {fmtInt(e.protein)} g
                      </span>
                    </span>
                    {score != null && <ScorePill score={score} />}
                    <span className="w-14 shrink-0 text-right text-sm font-semibold text-ink tabular">{fmtInt(e.kcal)}</span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-ink-3">Rien d&apos;enregistré.</p>
          <button type="button" onClick={onCopyYesterday} className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink">
            <Copy className="size-3.5" /> Copier d&apos;hier
          </button>
        </div>
      )}
      {entries.length > 1 && (
        <div className="flex justify-end border-t border-line/50 px-4 py-2">
          <button type="button" onClick={onSaveAsMeal} className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
            <BookmarkPlus className="size-3.5" /> Enregistrer comme repas
          </button>
        </div>
      )}
    </section>
  );
}

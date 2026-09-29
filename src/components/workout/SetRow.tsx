"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useState } from "react";
import type { WorkoutSet } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";
import { fmtDec, parseNum } from "@/lib/utils/format";

interface Props {
  set: WorkoutSet;
  index: number;
  previous?: { weightKg: number; reps: number };
  weighted: boolean;
  onCommit: (changes: { weightKg: number; reps: number }) => void;
  onToggleDone: (values: { weightKg: number; reps: number }) => void;
  onMenu: () => void;
  isPR?: boolean;
}

const numText = (n: number) => (n ? String(n).replace(".", ",") : "");

/** One set line: number · previous · kg · reps · validate. Built for one-thumb input. */
export function SetRow({ set, index, previous, weighted, onCommit, onToggleDone, onMenu, isPR }: Props) {
  const [w, setW] = useState(numText(set.weightKg));
  const [r, setR] = useState(numText(set.reps));
  const [synced, setSynced] = useState({ weightKg: set.weightKg, reps: set.reps });
  if (synced.weightKg !== set.weightKg || synced.reps !== set.reps) {
    setSynced({ weightKg: set.weightKg, reps: set.reps });
    setW(numText(set.weightKg));
    setR(numText(set.reps));
  }

  const values = () => ({ weightKg: Math.max(0, parseNum(w) ?? 0), reps: Math.max(0, Math.round(parseNum(r) ?? 0)) });
  const commit = () => {
    const v = values();
    if (v.weightKg !== set.weightKg || v.reps !== set.reps) onCommit(v);
  };

  const inputCls =
    "h-12 w-full min-w-0 rounded-xl border bg-void/60 text-center font-display text-lg font-semibold text-ink tabular outline-none transition focus:border-arise focus:shadow-[0_0_0_3px_rgb(77_163_255/0.18)]";

  return (
    <motion.div
      layout
      className={cn(
        "grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-2 rounded-2xl px-1.5 py-1.5 transition-colors",
        set.done ? "bg-good/[0.08]" : "",
      )}
    >
      <button
        type="button"
        onClick={onMenu}
        className={cn("flex size-9 items-center justify-center rounded-lg font-display text-sm font-bold", set.warmup ? "bg-warn/15 text-warn" : "bg-white/[0.05] text-ink-2")}
        aria-label={`Options de la série ${index + 1}`}
      >
        {set.warmup ? "É" : index + 1}
      </button>
      <span className="truncate text-center text-xs text-ink-3 tabular" title="Performance précédente">
        {previous ? (weighted && previous.weightKg > 0 ? `${fmtDec(previous.weightKg)}×${previous.reps}` : `${previous.reps} reps`) : "—"}
      </span>
      <input
        inputMode="decimal"
        enterKeyHint="next"
        aria-label={weighted ? `Charge série ${index + 1} en kg` : `Lest série ${index + 1} en kg`}
        placeholder={weighted ? "kg" : "+kg"}
        value={w}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setW(e.target.value)}
        onBlur={commit}
        className={cn(inputCls, set.done ? "border-good/30" : "border-line-strong")}
      />
      <input
        inputMode="numeric"
        enterKeyHint="done"
        aria-label={`Répétitions série ${index + 1}`}
        placeholder="reps"
        value={r}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setR(e.target.value)}
        onBlur={commit}
        className={cn(inputCls, set.done ? "border-good/30" : "border-line-strong")}
      />
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => onToggleDone(values())}
        aria-pressed={set.done}
        aria-label={set.done ? `Annuler la validation de la série ${index + 1}` : `Valider la série ${index + 1}`}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition",
          set.done ? "border-good bg-good text-void shadow-[0_0_16px_rgb(52_211_153/0.6)]" : "border-line-strong bg-deep text-ink-3 hover:border-good/60",
        )}
      >
        <Check className="size-6" strokeWidth={3} />
        {isPR && <span className="absolute -top-2 -right-2 rounded-full bg-warn px-1 text-[9px] font-bold text-void">PR</span>}
      </motion.button>
    </motion.div>
  );
}

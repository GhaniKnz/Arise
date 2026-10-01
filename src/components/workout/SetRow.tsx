"use client";

import { motion, useDragControls, useReducedMotionConfig } from "motion/react";
import { Check, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import type { WorkoutSet } from "@/lib/db/types";
import type { SetGain } from "@/lib/domain/strength";
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
  /** Better than the same set last session. */
  gain?: SetGain | null;
  /** Swipe left to delete. */
  onDelete?: () => void;
  readOnly?: boolean;
}

const SWIPE_DELETE = 72;

export const gainLabel = (g: SetGain) => (g.kind === "weight" ? `+${fmtDec(g.amount)} kg` : `+${g.amount} rep${g.amount > 1 ? "s" : ""}`);

type Tone = "done" | "gain" | "pr";
const TONE_COLOR: Record<Tone, string> = { done: "#34d399", gain: "#34d399", pr: "#f5b94a" };

/** One-shot celebration around the validate button. */
function Burst({ tone, label }: { tone: Tone; label?: string }) {
  const reduce = useReducedMotionConfig();
  const color = TONE_COLOR[tone];
  const count = reduce || tone === "done" ? 0 : tone === "gain" ? 10 : 18;
  return (
    <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
      <motion.span
        className="absolute size-12 rounded-xl border-2"
        style={{ borderColor: color, boxShadow: `0 0 18px ${color}` }}
        initial={{ scale: 0.85, opacity: 0.9 }}
        animate={{ scale: tone === "done" ? 1.45 : 2.3, opacity: 0 }}
        transition={{ duration: tone === "done" ? 0.55 : 0.9, ease: "easeOut" }}
      />
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const d = 34 + (i % 3) * 14;
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: i % 4 === 0 ? "#ffffff" : color, boxShadow: `0 0 8px ${color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.8 + (i % 4) * 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
      {label && (
        <motion.span
          className="absolute -top-3 rounded-full px-1.5 py-0.5 font-display text-[11px] font-bold whitespace-nowrap text-void"
          style={{ background: color, boxShadow: `0 0 14px ${color}` }}
          initial={{ y: 0, opacity: 0, scale: 0.6 }}
          animate={{ y: -30, opacity: [0, 1, 1, 0], scale: 1 }}
          transition={{ duration: 1.8, times: [0, 0.12, 0.75, 1], ease: "easeOut" }}
        >
          {label}
        </motion.span>
      )}
    </span>
  );
}

const numText = (n: number) => (n ? String(n).replace(".", ",") : "");

/** One set line: number · previous · kg · reps · validate. Built for one-thumb input. */
export function SetRow({ set, index, previous, weighted, onCommit, onToggleDone, onMenu, isPR, gain, onDelete, readOnly }: Props) {
  const [w, setW] = useState(numText(set.weightKg));
  const [r, setR] = useState(numText(set.reps));
  // Celebrate when the set flips to done (not when an already-done set mounts).
  const [wasDone, setWasDone] = useState(set.done);
  const [burst, setBurst] = useState(0);
  if (set.done !== wasDone) {
    setWasDone(set.done);
    if (set.done) setBurst((b) => b + 1);
  }
  const tone: Tone = isPR ? "pr" : gain ? "gain" : "done";
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

  const swipeable = !!onDelete && !readOnly;
  const dragControls = useDragControls();

  return (
    <div className="relative overflow-x-clip rounded-2xl">
      {swipeable && (
        <div className="absolute inset-0 flex items-center justify-end rounded-2xl bg-bad/20 pr-4 text-bad" aria-hidden>
          <Trash2 className="size-5" />
        </div>
      )}
      <motion.div
        layout
        drag={swipeable ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        dragSnapToOrigin
        dragControls={dragControls}
        onPointerDown={(e) => {
          // Motion ignores drags that start on inputs; on touch screens the kg/reps fields cover most of the row.
          if (swipeable && e.pointerType === "touch" && e.target instanceof HTMLInputElement) dragControls.start(e);
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_DELETE) onDelete?.();
        }}
        className={cn(
          "relative grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-2 rounded-2xl px-1.5 py-1.5 transition-colors",
          swipeable && !set.done && "bg-deep",
          set.done && isPR ? "bg-[color-mix(in_srgb,var(--color-warn)_8%,var(--color-deep))] shadow-[inset_0_0_0_1px_rgb(245_185_74/0.45),0_0_18px_-6px_rgb(245_185_74/0.6)]" : set.done && gain ? "bg-[color-mix(in_srgb,var(--color-good)_10%,var(--color-deep))] shadow-[inset_0_0_0_1px_rgb(52_211_153/0.35)]" : set.done ? "bg-[color-mix(in_srgb,var(--color-good)_8%,var(--color-deep))]" : "",
          burst > 0 && isPR && "pr-flash",
        )}
      >
        <button
          type="button"
          onClick={onMenu}
          disabled={readOnly}
          className={cn("touch-target flex size-11 items-center justify-center rounded-lg font-display text-sm font-bold", set.warmup ? "bg-warn/15 text-warn" : "bg-white/[0.05] text-ink-2")}
          aria-label={`Options de la série ${index + 1}`}
        >
          {set.warmup ? "É" : index + 1}
        </button>
        <span className="flex min-w-0 flex-col items-center text-center text-xs text-ink-3 tabular" title="Performance précédente">
          <span className="max-w-full truncate">{previous ? (weighted && previous.weightKg > 0 ? `${fmtDec(previous.weightKg)}×${previous.reps}` : `${previous.reps} reps`) : "-"}</span>
          {set.done && gain && (
            <span className={cn("max-w-full truncate text-[10px] font-bold", isPR ? "text-warn" : "text-good")} aria-label={`Progression ${gainLabel(gain)} par rapport à la dernière séance`}>
              ▲ {gainLabel(gain)}
            </span>
          )}
        </span>
        <input
          inputMode="decimal"
          enterKeyHint="next"
          aria-label={weighted ? `Charge série ${index + 1} en kg` : `Lest série ${index + 1} en kg`}
          placeholder={weighted ? "kg" : "+kg"}
          value={w}
          readOnly={readOnly}
          onFocus={(e) => !readOnly && e.currentTarget.select()}
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
          readOnly={readOnly}
          onFocus={(e) => !readOnly && e.currentTarget.select()}
          onChange={(e) => setR(e.target.value)}
          onBlur={commit}
          className={cn(inputCls, set.done ? "border-good/30" : "border-line-strong")}
        />
        <motion.button
          type="button"
          whileTap={readOnly ? undefined : { scale: 0.85 }}
          disabled={readOnly}
          onClick={() => onToggleDone(values())}
          aria-pressed={set.done}
          aria-label={set.done ? `Annuler la validation de la série ${index + 1}` : `Valider la série ${index + 1}`}
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition",
            set.done && isPR ? "border-warn bg-warn text-void shadow-[0_0_18px_rgb(245_185_74/0.75)]" : set.done ? "border-good bg-good text-void shadow-[0_0_16px_rgb(52_211_153/0.6)]" : "border-line-strong bg-deep text-ink-3 hover:border-good/60",
          )}
        >
          <Check className="size-6" strokeWidth={3} />
          {isPR && (
            <span className="absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full bg-warn px-1 text-[9px] font-bold text-void shadow-[0_0_10px_rgb(245_185_74/0.9)]">
              <Trophy className="size-2.5" /> PR
            </span>
          )}
          {burst > 0 && <Burst key={burst} tone={tone} label={isPR ? "RECORD !" : gain ? gainLabel(gain) : undefined} />}
        </motion.button>
      </motion.div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, SkipForward } from "lucide-react";
import { MiniRing } from "@/components/ui/Progress";
import { cn } from "@/lib/utils/cn";
import { fmtClock } from "@/lib/utils/format";

interface Props {
  active: boolean;
  remaining: number;
  total: number;
  done: boolean;
  onAdd: (s: number) => void;
  onSkip: () => void;
  onPreset: (s: number) => void;
}

export function RestTimerBar({ active, remaining, total, done, onAdd, onSkip, onPreset }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,var(--safe-bottom))]"
          role="timer"
          aria-live="polite"
          aria-label={done ? "Repos terminé" : `Repos : ${fmtClock(remaining)}`}
        >
          <div className={cn("panel mx-auto max-w-xl p-3", done ? "border-good/60 shadow-[0_0_30px_-4px_rgb(52_211_153/0.6)]" : "panel-glow")}>
            <div className="flex items-center gap-3">
              <MiniRing value={remaining} max={total || 1} size={56} stroke={5} color={done ? "var(--color-good)" : "var(--color-arise)"}>
                {done ? <Bell className="size-5 text-good" /> : <span className="text-[10px] text-ink-3">repos</span>}
              </MiniRing>
              <div className="min-w-0 flex-1">
                <p className={cn("font-display text-3xl font-bold tabular", done ? "text-good" : "text-ink")}>{done ? "GO !" : fmtClock(remaining)}</p>
                <div className="mt-1 flex gap-1 overflow-x-auto no-scrollbar">
                  {[60, 90, 120, 180].map((s) => (
                    <button key={s} type="button" onClick={() => onPreset(s)} className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium", total === s ? "bg-arise/20 text-ink" : "text-ink-3 hover:text-ink-2")}>
                      {s < 120 ? `${s}s` : `${s / 60}m`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" onClick={() => onAdd(-15)} className="h-11 rounded-xl border border-line-strong bg-deep px-2.5 text-sm font-semibold text-ink-2 active:scale-95" aria-label="Retirer 15 secondes">
                  −15
                </button>
                <button type="button" onClick={() => onAdd(15)} className="h-11 rounded-xl border border-line-strong bg-deep px-2.5 text-sm font-semibold text-ink-2 active:scale-95" aria-label="Ajouter 15 secondes">
                  +15
                </button>
                <button type="button" onClick={onSkip} className="flex size-11 items-center justify-center rounded-xl bg-arise/15 text-arise active:scale-95" aria-label="Passer le repos">
                  <SkipForward className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

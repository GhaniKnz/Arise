"use client";

import { ProgressBar } from "@/components/ui/Progress";
import type { Targets } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";
import { fmtInt } from "@/lib/utils/format";

export const MACROS = [
  { key: "protein", label: "Protéines", color: "var(--color-protein)" },
  { key: "carbs", label: "Glucides", color: "var(--color-carbs)" },
  { key: "fat", label: "Lipides", color: "var(--color-fat)" },
  { key: "fiber", label: "Fibres", color: "var(--color-fiber)" },
] as const;

export type MacroKey = (typeof MACROS)[number]["key"];

export function MacroBars({ totals, targets, compact, className }: { totals: Record<MacroKey, number>; targets: Targets; compact?: boolean; className?: string }) {
  return (
    <ul className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1", className)}>
      {MACROS.map((m) => {
        const v = totals[m.key];
        const t = targets[m.key];
        const left = t - v;
        return (
          <li key={m.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2 rounded-full" style={{ background: m.color }} aria-hidden />
                {m.label}
              </span>
              <span className="tabular text-ink">
                <strong className="font-semibold">{fmtInt(v)}</strong>
                <span className="text-ink-3"> / {fmtInt(t)} g</span>
              </span>
            </div>
            <ProgressBar value={v} max={t} color={m.color} height={7} label={`${m.label} ${fmtInt(v)} sur ${fmtInt(t)} grammes`} overflow={m.key === "fat" || m.key === "carbs"} />
            {!compact && <p className="mt-1 text-[11px] text-ink-3">{left > 0 ? `${fmtInt(left)} g restants` : m.key === "protein" || m.key === "fiber" ? "Objectif atteint ✓" : `+${fmtInt(-left)} g au-dessus`}</p>}
          </li>
        );
      })}
    </ul>
  );
}

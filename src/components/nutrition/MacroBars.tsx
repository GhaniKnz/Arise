"use client";

import { Beef, Droplet, Leaf, Wheat } from "lucide-react";
import { ProgressBar } from "@/components/ui/Progress";
import type { Targets } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";
import { fmtInt } from "@/lib/utils/format";

export const MACROS = [
  { key: "protein", label: "Protéines", color: "var(--color-protein)", icon: Beef },
  { key: "carbs", label: "Glucides", color: "var(--color-carbs)", icon: Wheat },
  { key: "fat", label: "Lipides", color: "var(--color-fat)", icon: Droplet },
  { key: "fiber", label: "Fibres", color: "var(--color-fiber)", icon: Leaf },
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
            <div className={cn("mb-1.5 flex items-baseline justify-between gap-2 whitespace-nowrap", compact ? "text-xs" : "text-sm")}>
              <span className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">
                <m.icon className="size-3.5 shrink-0" style={{ color: m.color, filter: `drop-shadow(0 0 4px ${m.color})` }} aria-hidden />
                {m.label}
              </span>
              <span className="tabular text-ink">
                <strong className="font-semibold">{fmtInt(v)}</strong>
                <span className="text-ink-3">
                  {" "}
                  / {fmtInt(t)}
                  {compact ? "" : " g"}
                </span>
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

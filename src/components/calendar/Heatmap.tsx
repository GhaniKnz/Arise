"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { addDays, formatShort, weekStart, type DayKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/** Sequential single-hue ramp (light → saturated blue) for the adherence score. */
export function scoreColor(score: number, tracked: boolean): string {
  if (!tracked) return "rgb(255 255 255 / 0.04)";
  if (score >= 90) return "#4da3ff";
  if (score >= 70) return "rgb(77 163 255 / 0.72)";
  if (score >= 50) return "rgb(77 163 255 / 0.45)";
  if (score >= 25) return "rgb(77 163 255 / 0.25)";
  return "rgb(77 163 255 / 0.12)";
}

export const HEAT_LEGEND: [string, string][] = [
  ["Non suivi", scoreColor(0, false)],
  ["< 25", scoreColor(10, true)],
  ["25–49", scoreColor(30, true)],
  ["50–69", scoreColor(60, true)],
  ["70–89", scoreColor(80, true)],
  ["≥ 90", scoreColor(95, true)],
];

/** GitHub-style grid: columns are weeks (Mon→Sun), intensity = daily score. */
export function Heatmap({ weeks = 26, onSelect }: { weeks?: number; onSelect?: (d: DayKey) => void }) {
  const { ledger, today } = useGame();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div>
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-2 no-scrollbar">
        <div className="flex gap-[3px]" role="grid" aria-label={`Adhérence des ${weeks} dernières semaines`}>
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]" role="row">
              {col.map((d) => {
                const l = ledger.days.get(d);
                const future = d > today;
                const s = l?.score.total ?? 0;
                return (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    disabled={future}
                    onClick={() => onSelect?.(d)}
                    title={`${formatShort(d)} : ${l?.score.tracked ? `${s}/100${l.validated ? " (validé)" : ""}` : "non suivi"}`}
                    aria-label={`${formatShort(d)} : ${l?.score.tracked ? `score ${s}` : "non suivi"}`}
                    className={cn("size-3.5 rounded-[3px] transition hover:ring-1 hover:ring-arise sm:size-4", future && "opacity-0", d === today && "ring-1 ring-white/70")}
                    style={{ background: scoreColor(s, !!l?.score.tracked) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-3">
        {HEAT_LEGEND.map(([l, c]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="size-2.5 rounded-[2px]" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

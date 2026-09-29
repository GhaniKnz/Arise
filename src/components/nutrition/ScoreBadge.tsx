"use client";

import { CircleMinus, CirclePlus, Info } from "lucide-react";
import { MiniRing } from "@/components/ui/Progress";
import { TIER_META, type NutritionScore } from "@/lib/domain/nutrition";
import { cn } from "@/lib/utils/cn";

export function ScorePill({ score, className }: { score: number; className?: string }) {
  const color = score >= 80 ? "var(--color-good)" : score >= 65 ? "var(--color-arise)" : score >= 45 ? "var(--color-violet-2)" : score >= 25 ? "var(--color-warn)" : "var(--color-rose)";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 font-display text-[11px] font-bold tabular", className)} style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }} title={`Nutrition Score ${score}/100`}>
      {score}
    </span>
  );
}

export function ScorePanel({ s }: { s: NutritionScore }) {
  const color = TIER_META[s.tier].color;
  return (
    <div className="rounded-2xl border border-line bg-white/[0.02] p-4">
      <div className="flex items-center gap-4">
        <MiniRing value={s.score} max={100} size={64} stroke={6} color={color}>
          <span className="font-display text-lg font-bold text-ink">{s.score}</span>
        </MiniRing>
        <div className="min-w-0">
          <p className="label">Nutrition Score</p>
          <p className="font-display text-xl font-semibold" style={{ color }}>
            {s.label}
          </p>
          <p className="text-xs text-ink-3">{s.verdict}</p>
        </div>
      </div>
      {s.reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {s.reasons.map((r) => (
            <li key={r.text} className="flex items-start gap-2 text-sm text-ink-2">
              {r.kind === "plus" ? <CirclePlus className="mt-0.5 size-4 shrink-0 text-good" /> : r.kind === "minus" ? <CircleMinus className="mt-0.5 size-4 shrink-0 text-warn" /> : <Info className="mt-0.5 size-4 shrink-0 text-ink-3" />}
              {r.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-ink-3">Score contextuel selon ton objectif : aucun aliment n&apos;est « interdit », tout dépend de la quantité et de ta journée.</p>
    </div>
  );
}

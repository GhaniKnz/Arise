"use client";

import { motion } from "motion/react";
import { RANK_META, rankFor, type LevelInfo } from "@/lib/domain/game";
import { cn } from "@/lib/utils/cn";
import { fmtInt } from "@/lib/utils/format";

export function RankBadge({ level, size = "md", className, animated = true }: { level: number; size?: "sm" | "md" | "lg"; className?: string; animated?: boolean }) {
  const rank = rankFor(level);
  const meta = RANK_META[rank];
  const s = size === "sm" ? "size-6 text-[11px]" : size === "lg" ? "size-14 text-2xl" : "size-9 text-sm";
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center font-display font-bold", animated && "aura", s, className)}
      style={{ color: meta.color, "--aura": meta.color } as React.CSSProperties}
      title={meta.label}
      aria-label={meta.label}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden>
        <path d="M20 2 36 11v18L20 38 4 29V11Z" fill={`color-mix(in srgb, ${meta.color} 14%, transparent)`} stroke={meta.color} strokeWidth="1.8" />
      </svg>
      <span className="relative" style={{ textShadow: `0 0 10px ${meta.color}` }}>
        {rank}
      </span>
    </span>
  );
}

export function XpBar({ level, compact, className }: { level: LevelInfo; compact?: boolean; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      {!compact && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="label text-arise">XP</span>
          <span className="tabular text-ink-2">
            {fmtInt(level.xpInLevel)} / {fmtInt(level.xpForNext)}
          </span>
        </div>
      )}
      <div
        className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-label="Expérience vers le niveau suivant"
        aria-valuemin={0}
        aria-valuemax={level.xpForNext}
        aria-valuenow={level.xpInLevel}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-arise via-[#6f8dff] to-violet"
          style={{ boxShadow: "0 0 12px rgb(77 163 255 / 0.6)" }}
          initial={{ width: 0 }}
          animate={{ width: `${level.progress * 100}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

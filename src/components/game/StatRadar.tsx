"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { STAT_ORDER, type StatKey } from "@/lib/domain/game";

/** Hexagonal radar of the six RPG stats. */
export function StatRadar({ stats, size = 260 }: { stats: Record<StatKey, number>; size?: number }) {
  const fillId = `radar-${useId().replace(/:/g, "")}`;
  const c = size / 2;
  const r = size / 2 - 34;
  const max = Math.max(30, ...STAT_ORDER.map((k) => stats[k])) * 1.1;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const d = (v / max) * r;
    return [c + Math.cos(a) * d, c + Math.sin(a) * d] as const;
  };
  const ring = (f: number) =>
    STAT_ORDER.map((_, i) => point(i, max * f))
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
  const shape = STAT_ORDER.map((k, i) => point(i, stats[k]))
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-72" role="img" aria-label={`Statistiques : ${STAT_ORDER.map((k) => `${k} ${stats[k]}`).join(", ")}`}>
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4da3ff" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="rgb(122 146 255 / 0.14)" strokeWidth="1" />
      ))}
      {STAT_ORDER.map((_, i) => {
        const [x, y] = point(i, max);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgb(122 146 255 / 0.1)" strokeWidth="1" />;
      })}
      <motion.polygon
        points={shape}
        fill={`url(#${fillId})`}
        stroke="#7cc0ff"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transformOrigin: `${c}px ${c}px`, filter: "drop-shadow(0 0 8px rgb(77 163 255 / 0.6))" }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
      {STAT_ORDER.map((k, i) => {
        const [x, y] = point(i, max * 1.2);
        return (
          <g key={k}>
            <text x={x} y={y - 6} textAnchor="middle" className="fill-ink font-display text-[12px] font-bold">
              {k}
            </text>
            <text x={x} y={y + 9} textAnchor="middle" className="fill-arise font-display text-[12px]">
              {stats[k]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

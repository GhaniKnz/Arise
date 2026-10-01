"use client";

import { motion, useReducedMotionConfig } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BarProps {
  value: number;
  max: number;
  color?: string;
  gradient?: boolean;
  className?: string;
  height?: number;
  label?: string;
  /** Show the overflow beyond max in a warning tint. */
  overflow?: boolean;
}

export function ProgressBar({ value, max, color = "var(--color-arise)", gradient, className, height = 8, label, overflow }: BarProps) {
  const reduce = useReducedMotionConfig();
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const over = overflow && ratio > 1;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className={cn("relative w-full overflow-hidden rounded-full bg-white/[0.06]", className)}
      style={{ height }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: over ? "var(--color-warn)" : gradient ? `linear-gradient(90deg, ${color}, var(--color-violet-2))` : color,
          boxShadow: `0 0 12px ${over ? "rgb(251 191 36 / 0.45)" : "rgb(77 163 255 / 0.35)"}`,
        }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  colors?: [string, string];
  track?: string;
  label?: string;
  className?: string;
}

/** Circular gauge that fills progressively. Overflow wraps in amber. */
export function Ring({ value, max, size = 180, stroke = 12, children, colors = ["#4da3ff", "#8b5cf6"], track = "rgb(255 255 255 / 0.06)", label, className }: RingProps) {
  const reduce = useReducedMotionConfig();
  const id = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? value / max : 0;
  const main = Math.min(1, Math.max(0, ratio));
  const over = Math.min(1, Math.max(0, ratio - 1));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
          <filter id={`f${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          filter={`url(#f${id})`}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - main) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        {over > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-warn)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduce ? false : { strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - over) }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Small ring for list items (quests, macros). */
export function MiniRing({ value, max, size = 36, stroke = 4, color = "var(--color-arise)", children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

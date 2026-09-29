"use client";

import { motion } from "motion/react";
import { useId } from "react";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  label?: string;
}

/** Tiny trend line with a soft area wash and an end marker. */
export function Sparkline({ values, width = 160, height = 44, color = "#4da3ff", className, label }: Props) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2) return <div style={{ width, height }} className={className} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${pts.at(-1)![0]},${height} L${pts[0][0]},${height} Z`;
  const [ex, ey] = pts.at(-1)!;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ maxWidth: width, height }}>
      <defs>
        <linearGradient id={`sa${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sa${id})`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      <circle cx={ex} cy={ey} r="3.5" fill={color} stroke="#0b1020" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

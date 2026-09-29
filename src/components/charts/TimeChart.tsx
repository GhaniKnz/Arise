"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { formatShort } from "@/lib/utils/date";

export interface Series {
  key: string;
  label: string;
  color: string;
  kind: "line" | "area" | "bar" | "dots";
  dashed?: boolean;
  /** Draw a larger end marker on the last point. */
  endDot?: boolean;
}

interface Props {
  data: Record<string, number | string | null | undefined>[];
  series: Series[];
  height?: number;
  yFormat?: (v: number) => string;
  yDomain?: React.ComponentProps<typeof YAxis>["domain"];
  references?: { y: number; label: string; color?: string }[];
  xFormat?: (d: string) => string;
  ariaLabel: string;
}

const SURFACE = "#0b1020";

function ChartTooltip({ active, payload, label, series, yFormat }: { active?: boolean; payload?: { dataKey?: string | number; value?: number | string }[]; label?: string; series: Series[]; yFormat: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const rows = series
    .map((s) => ({ s, v: payload.find((p) => p.dataKey === s.key)?.value }))
    .filter((r): r is { s: Series; v: number } => typeof r.v === "number");
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-line-strong bg-[#0d1426]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-medium text-ink-2 first-letter:uppercase">{label ? formatShort(label) : ""}</p>
      {rows.map(({ s, v }) => (
        <p key={s.key} className="flex items-center gap-2 text-ink">
          <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
          <span className="text-ink-3">{s.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular">{yFormat(v)}</span>
        </p>
      ))}
    </div>
  );
}

/** Dark-theme time series: one y-axis, hairline grid, hover tooltip, legend when ≥ 2 series. */
export function TimeChart({ data, series, height = 220, yFormat = (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }), yDomain, references, xFormat = formatShort, ariaLabel }: Props) {
  const lastIndex = data.length - 1;
  return (
    <figure className="w-full" aria-label={ariaLabel}>
      {series.length >= 2 && (
        <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              {s.kind === "dots" ? (
                <span className="size-2 rounded-full" style={{ background: s.color }} />
              ) : s.kind === "bar" ? (
                <span className="h-2.5 w-2 rounded-sm" style={{ background: s.color }} />
              ) : (
                <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color, opacity: s.dashed ? 0.7 : 1 }} />
              )}
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              {series
                .filter((s) => s.kind === "area")
                .map((s) => (
                  <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
            </defs>
            <CartesianGrid vertical={false} strokeWidth={1} />
            <XAxis dataKey="date" tickFormatter={xFormat} tickLine={false} axisLine={false} minTickGap={28} fontSize={11} />
            <YAxis tickFormatter={(v: number) => yFormat(v)} tickLine={false} axisLine={false} width={48} fontSize={11} domain={yDomain ?? ["auto", "auto"]} />
            <Tooltip content={<ChartTooltip series={series} yFormat={yFormat} />} cursor={{ stroke: "rgb(122 146 255 / 0.35)", strokeWidth: 1 }} />
            {references?.map((r) => (
              <ReferenceLine key={r.label} y={r.y} stroke={r.color ?? "rgb(163 173 200 / 0.5)"} strokeDasharray="4 4" label={{ value: r.label, position: "insideTopRight", fill: "#a3adc8", fontSize: 10 }} />
            ))}
            {series.map((s) => {
              switch (s.kind) {
                case "bar":
                  return <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive />;
                case "area":
                  return <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#area-${s.key})`} connectNulls dot={false} activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }} />;
                case "dots":
                  return <Scatter key={s.key} dataKey={s.key} name={s.label} fill={s.color} shape={(p: { cx?: number; cy?: number }) => (p.cx == null || p.cy == null ? <g /> : <circle cx={p.cx} cy={p.cy} r={3.5} fill={s.color} fillOpacity={0.55} stroke={SURFACE} strokeWidth={1.5} />)} />;
                case "line":
                default:
                  return (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      strokeDasharray={s.dashed ? "6 5" : undefined}
                      connectNulls
                      dot={
                        s.endDot
                          ? (p: { index?: number; cx?: number; cy?: number }) =>
                              p.index === lastIndex && p.cx != null && p.cy != null ? <circle key="end" cx={p.cx} cy={p.cy} r={5} fill={s.color} stroke={SURFACE} strokeWidth={2} /> : <g key={`d${p.index}`} />
                          : false
                      }
                      activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
                    />
                  );
              }
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

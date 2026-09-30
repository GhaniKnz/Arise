"use client";

import { BicepsFlexed, Bone, Droplets, PieChart, Plus, Ruler, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { TimeChart } from "@/components/charts/TimeChart";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Fields";
import { EmptyState, Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader, StatTile } from "@/components/ui/Panel";
import { deleteMetrics } from "@/lib/db/repos/body";
import type { BodyMetric } from "@/lib/db/types";
import { openSheet } from "@/lib/system/ui";
import { formatDay, formatShort } from "@/lib/utils/date";
import { fmtDec, fmtSigned } from "@/lib/utils/format";

const MEASURES: { key: keyof BodyMetric; label: string; unit: string }[] = [
  { key: "waistCm", label: "Tour de taille", unit: "cm" },
  { key: "chestCm", label: "Poitrine", unit: "cm" },
  { key: "armCm", label: "Bras", unit: "cm" },
  { key: "thighCm", label: "Cuisse", unit: "cm" },
  { key: "hipsCm", label: "Hanches", unit: "cm" },
  { key: "neckCm", label: "Cou", unit: "cm" },
];

function series(metrics: BodyMetric[], key: keyof BodyMetric) {
  return metrics.filter((m) => typeof m[key] === "number").map((m) => ({ date: m.date, value: m[key] as number }));
}

export function MeasuresPanel() {
  const { raw } = useGame();
  const metrics = useMemo(() => [...raw.metrics].sort((a, b) => a.date.localeCompare(b.date)), [raw.metrics]);
  const [selected, setSelected] = useState<keyof BodyMetric>("waistCm");
  const available = MEASURES.filter((m) => series(metrics, m.key).length > 0);
  const data = series(metrics, selected);
  const meta = MEASURES.find((m) => m.key === selected)!;

  if (!available.length)
    return <EmptyState icon={<Ruler />} title="Aucune mensuration" description="Le tour de taille est l'un des meilleurs indicateurs d'une sèche réussie." action={<Button size="sm" onClick={() => openSheet("weight")}><Plus /> Ajouter des mesures</Button>} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {MEASURES.map((m) => {
          const s = series(metrics, m.key);
          if (!s.length) return null;
          const delta = s.length > 1 ? s.at(-1)!.value - s[0].value : null;
          return (
            <button key={m.key} type="button" onClick={() => setSelected(m.key)} className="text-left">
              <StatTile label={m.label} value={fmtDec(s.at(-1)!.value)} unit={m.unit} hint={delta != null ? `${fmtSigned(delta, 1, m.unit)} depuis le ${formatShort(s[0].date)}` : undefined} className={selected === m.key ? "border-arise/50 bg-arise/10" : ""} />
            </button>
          );
        })}
      </div>
      <Panel>
        <PanelHeader title={meta.label} icon={<Ruler />} action={<Button size="sm" variant="secondary" onClick={() => openSheet("weight")}><Plus /> Mesurer</Button>} />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {available.map((m) => (
            <Chip key={m.key} active={selected === m.key} onClick={() => setSelected(m.key)}>
              {m.label}
            </Chip>
          ))}
        </div>
        {data.length > 1 ? (
          <TimeChart ariaLabel={`Évolution : ${meta.label}`} data={data} series={[{ key: "value", label: `${meta.label} (${meta.unit})`, color: "#4da3ff", kind: "area", endDot: true }]} yDomain={["dataMin - 1", "dataMax + 1"]} yFormat={(v) => fmtDec(v)} />
        ) : (
          <p className="py-6 text-center text-sm text-ink-3">Une deuxième mesure est nécessaire pour tracer l&apos;évolution.</p>
        )}
        <p className="mt-2 text-[11px] text-ink-3">Mesure le tour de taille au niveau du nombril, le matin, ventre relâché.</p>
      </Panel>
    </div>
  );
}

export function CompositionPanel() {
  const { raw } = useGame();
  const metrics = useMemo(() => [...raw.metrics].sort((a, b) => a.date.localeCompare(b.date)), [raw.metrics]);
  const bf = series(metrics, "bodyFatPct");
  const muscle = series(metrics, "muscleKg");
  const withBoth = metrics.filter((m) => m.bodyFatPct != null && m.weightKg != null);
  const lean = withBoth.map((m) => ({ date: m.date, lean: Math.round(m.weightKg! * (1 - m.bodyFatPct! / 100) * 10) / 10, fat: Math.round(((m.weightKg! * m.bodyFatPct!) / 100) * 10) / 10 }));

  if (!bf.length && !muscle.length)
    return <EmptyState title="Aucune donnée de composition" description="Si tu as une balance impédancemètre, ajoute masse grasse et masse musculaire lors de ta pesée." action={<Button size="sm" onClick={() => openSheet("weight")}><Plus /> Ajouter</Button>} />;

  const last = lean.at(-1);
  const first = lean[0];
  return (
    <div className="space-y-4">
      <Notice tone="warn">Les balances grand public donnent des <strong>estimations</strong> (impédancemétrie), sensibles à l&apos;hydratation. Regarde la tendance sur plusieurs semaines, dans les mêmes conditions.</Notice>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Masse grasse" icon={<Droplets />} value={bf.length ? fmtDec(bf.at(-1)!.value) : "—"} unit="%" hint={bf.length > 1 ? fmtSigned(bf.at(-1)!.value - bf[0].value, 1, "pts") : undefined} accent="var(--color-warn)" />
        <StatTile label="Masse musculaire" icon={<BicepsFlexed />} value={muscle.length ? fmtDec(muscle.at(-1)!.value) : "—"} unit="kg" hint={muscle.length > 1 ? fmtSigned(muscle.at(-1)!.value - muscle[0].value, 1, "kg") : undefined} accent="var(--color-arise)" />
        <StatTile label="Masse maigre" icon={<Bone />} accent="var(--color-good)" value={last ? fmtDec(last.lean) : "—"} unit="kg" hint={last && first && lean.length > 1 ? fmtSigned(last.lean - first.lean, 1, "kg") : undefined} />
        <StatTile label="Masse grasse (kg)" icon={<PieChart />} accent="var(--color-fat)" value={last ? fmtDec(last.fat) : "—"} unit="kg" hint={last && first && lean.length > 1 ? fmtSigned(last.fat - first.fat, 1, "kg") : undefined} />
      </div>
      {bf.length > 1 && (
        <Panel>
          <PanelHeader title="Masse grasse (%)" />
          <TimeChart ariaLabel="Évolution de la masse grasse" data={bf} series={[{ key: "value", label: "Masse grasse (%)", color: "#c98500", kind: "area", endDot: true }]} yDomain={["dataMin - 1", "dataMax + 1"]} yFormat={(v) => fmtDec(v)} height={200} />
        </Panel>
      )}
      {lean.length > 1 && (
        <Panel>
          <PanelHeader title="Ce que tu as perdu ou gagné" subtitle={`Variation en kg depuis le ${formatShort(first!.date)}`} />
          <TimeChart
            ariaLabel="Variation de la masse maigre et de la masse grasse"
            data={lean.map((l) => ({ date: l.date, dLean: Math.round((l.lean - first!.lean) * 10) / 10, dFat: Math.round((l.fat - first!.fat) * 10) / 10 }))}
            series={[
              { key: "dLean", label: "Masse maigre (Δ kg)", color: "#3987e5", kind: "line", endDot: true },
              { key: "dFat", label: "Masse grasse (Δ kg)", color: "#c98500", kind: "line", endDot: true },
            ]}
            references={[{ y: 0, label: "départ" }]}
            yFormat={(v) => fmtSigned(v, 1)}
            height={220}
          />
          <p className="mt-2 text-[11px] text-ink-3">Idéal en sèche : la masse grasse descend, la masse maigre reste stable.</p>
        </Panel>
      )}
    </div>
  );
}

export function WeighInsList() {
  const { raw } = useGame();
  const list = [...raw.metrics].filter((m) => m.weightKg != null).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  if (!list.length) return null;
  return (
    <Panel>
      <PanelHeader title="Dernières pesées" />
      <ul className="divide-y divide-line/60">
        {list.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
            <button type="button" onClick={() => openSheet("weight", m.date)} className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left">
              <span className="inline-block w-24 shrink-0 truncate text-ink-3 first-letter:uppercase sm:w-28">{formatDay(m.date)}</span>
              <span className="font-display font-semibold whitespace-nowrap text-ink">{fmtDec(m.weightKg)} kg</span>
              {m.bodyFatPct != null && <span className="hidden text-xs whitespace-nowrap text-ink-3 min-[380px]:inline">{fmtDec(m.bodyFatPct)} % MG</span>}
              {m.waistCm != null && <span className="hidden text-xs whitespace-nowrap text-ink-3 sm:inline">taille {fmtDec(m.waistCm)}</span>}
            </button>
            <IconButton label="Supprimer la pesée" size="sm" onClick={() => deleteMetrics(m.date)}>
              <Trash2 />
            </IconButton>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

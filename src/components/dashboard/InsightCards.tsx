"use client";

import { Bot, ChevronRight, Flame, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Sparkline } from "@/components/charts/Sparkline";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EVIDENCE_META } from "@/lib/data/knowledge";
import { tipOfTheDay } from "@/lib/domain/insights";
import { openSheet } from "@/lib/system/ui";
import { addDays, rangeKeys } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { fmtDec, fmtSigned } from "@/lib/utils/format";

export function WeightTrendCard() {
  const { trend, today } = useGame();
  const series = trend.series.filter((p) => p.date >= addDays(today, -30));
  const change = trend.weekChange;
  return (
    <Panel className="h-full">
      <PanelHeader
        title="Poids & tendance"
        icon={<Scale />}
        action={
          <Button size="sm" variant="secondary" onClick={() => openSheet("weight")}>
            Pesée
          </Button>
        }
      />
      {trend.latest ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-ink-3">Actuel</p>
              <p className="font-display text-xl font-bold text-ink">{fmtDec(trend.latest.value)}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-3">Moy. 7 j</p>
              <p className="font-display text-xl font-bold text-arise">{fmtDec(trend.average7)}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-3">7 derniers jours</p>
              <p className={cn("font-display text-xl font-bold", change == null ? "text-ink-3" : "text-ink")}>{change == null ? "-" : fmtSigned(change, 1, "kg")}</p>
            </div>
          </div>
          <Link href="/progress" className="mt-3 block" aria-label="Voir le graphique du poids">
            <Sparkline values={series.map((p) => p.avg)} width={320} height={56} label="Tendance du poids (moyenne 7 jours), 30 derniers jours" />
          </Link>
          <p className="mt-1 text-[11px] text-ink-3">La moyenne 7 jours lisse les variations d&apos;eau quotidiennes.</p>
        </>
      ) : (
        <p className="text-sm text-ink-3">Aucune pesée pour l&apos;instant. Pèse-toi le matin pour suivre ta tendance.</p>
      )}
    </Panel>
  );
}

export function TipCard() {
  const { profile, days, today } = useGame();
  const tip = useMemo(() => (profile ? tipOfTheDay(days, profile.targets, profile.goal, today) : null), [profile, days, today]);
  if (!tip) return null;
  return (
    <Panel className="h-full">
      <PanelHeader title="Conseil du jour" icon={<Bot />} action={<Badge color={tip.evidence === "solide" ? "#34d399" : tip.evidence === "limitée" ? "#fbbf24" : "#a78bfa"}>{EVIDENCE_META[tip.evidence].label}</Badge>} />
      <p className="font-semibold text-ink">{tip.title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{tip.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tip.article && (
          <Link href={`/knowledge/${tip.article}`} className="inline-flex items-center gap-1 text-sm font-medium text-arise hover:underline">
            Lire les sources <ChevronRight className="size-4" />
          </Link>
        )}
        <Link href="/coach" className="ml-auto inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
          Demander à ARISE AI <ChevronRight className="size-4" />
        </Link>
      </div>
    </Panel>
  );
}

export function StreakCard() {
  const { ledger, today } = useGame();
  const days = rangeKeys(addDays(today, -27), today);
  return (
    <Panel className="h-full">
      <PanelHeader title="Série" icon={<Flame />} action={<Link href="/calendar" className="text-xs text-ink-3 hover:text-ink">Calendrier →</Link>} />
      <div className="flex items-end gap-6">
        <div>
          <p className="font-display text-4xl font-bold text-ink">
            {ledger.streak.current}
            <span className="ml-1 text-base font-medium text-ink-3">jours</span>
          </p>
          <p className="text-xs text-ink-3">Meilleure série : {ledger.streak.best} j</p>
        </div>
        <ol className="ml-auto grid grid-cols-7 gap-1" aria-label="28 derniers jours">
          {days.map((k) => {
            const l = ledger.days.get(k);
            const s = l?.score.tracked ? l.score.total : 0;
            const alpha = s === 0 ? 0 : 0.15 + (s / 100) * 0.85;
            return (
              <li
                key={k}
                title={`${k} : ${l?.score.tracked ? `${s}/100` : "non suivi"}`}
                className={cn("size-3.5 rounded-[4px] border", k === today ? "border-arise" : "border-white/5")}
                style={{ background: s ? `rgb(77 163 255 / ${alpha})` : "rgb(255 255 255 / 0.04)" }}
              />
            );
          })}
        </ol>
      </div>
      <p className="mt-3 text-[11px] text-ink-3">Un jour est validé quand ton score atteint 70/100.</p>
    </Panel>
  );
}

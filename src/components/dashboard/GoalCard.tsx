"use client";

import { motion } from "motion/react";
import { ChevronRight, Target } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/providers/GameProvider";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { projectGoal } from "@/lib/domain/trend";
import { formatShort } from "@/lib/utils/date";
import { clamp, fmtDec } from "@/lib/utils/format";

export function useGoalProgress() {
  const { profile, trend, today } = useGame();
  if (!profile) return null;
  const start = profile.startWeightKg;
  const target = profile.targetWeightKg;
  const current = trend.average7 ?? trend.latest?.value ?? start;
  const total = target - start;
  const done = current - start;
  const pct = total === 0 ? 1 : clamp(done / total, 0, 1);
  const plannedRate = (Math.sign(target - start) * profile.weeklyRatePct * current) / 100;
  const projection = projectGoal({ currentKg: current, targetKg: target, today, observedWeeklyRate: trend.weeklyRate, plannedWeeklyRate: plannedRate });
  return { start, target, current, pct, done, remaining: target - current, projection, latest: trend.latest?.value ?? current };
}

export function GoalCard() {
  const g = useGoalProgress();
  if (!g) return null;
  const losing = g.target < g.start;
  return (
    <Panel>
      <PanelHeader
        title="Objectif actuel"
        icon={<Target />}
        action={
          <Link href="/progress" className="flex items-center text-xs text-ink-3 hover:text-ink" aria-label="Voir la progression">
            Détails <ChevronRight className="size-3.5" />
          </Link>
        }
      />
      <div className="flex items-baseline justify-between gap-2 font-display">
        <span className="text-sm text-ink-3">{fmtDec(g.start)} kg</span>
        <span className="text-3xl font-bold text-ink">
          {fmtDec(g.latest)}
          <span className="ml-1 text-base text-ink-3">kg</span>
        </span>
        <span className="text-sm text-arise">{fmtDec(g.target)} kg</span>
      </div>

      <div className="relative mt-3 h-3 rounded-full bg-white/[0.06]" role="progressbar" aria-label="Progression vers l'objectif de poids" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.pct * 100)}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-arise to-violet"
          style={{ boxShadow: "0 0 14px rgb(77 163 255 / 0.5)" }}
          initial={{ width: 0 }}
          animate={{ width: `${g.pct * 100}%` }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-arise shadow-[0_0_14px_#4da3ff]"
          initial={{ left: "0%" }}
          animate={{ left: `${g.pct * 100}%` }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
          <dt className="text-[11px] text-ink-3">{losing ? "Perdu" : "Variation"}</dt>
          <dd className="font-display font-semibold text-ink">{fmtDec(Math.abs(g.done))} kg</dd>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
          <dt className="text-[11px] text-ink-3">Restant</dt>
          <dd className="font-display font-semibold text-ink">{fmtDec(Math.abs(g.remaining))} kg</dd>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
          <dt className="text-[11px] text-ink-3">Progression</dt>
          <dd className="font-display font-semibold text-arise">{Math.round(g.pct * 100)} %</dd>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
          <dt className="text-[11px] text-ink-3">Estimation</dt>
          <dd className="font-display font-semibold text-ink">{g.projection.etaDate ? `~${formatShort(g.projection.etaDate)}` : "—"}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-ink-3">Basé sur ta moyenne 7 jours ({fmtDec(g.current)} kg). Estimation indicative, recalculée à chaque pesée.</p>
    </Panel>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarClock, Check, ChevronRight, Crown, Flag, Percent, Skull, Swords, Target, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/providers/GameProvider";
import { GlyphIcon } from "@/components/icons/GlyphIcon";
import { Sweep } from "@/components/ui/Effects";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { nextBoss, type BossState } from "@/lib/domain/bosses";
import { projectGoal } from "@/lib/domain/trend";
import { formatShort } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
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

const EASE = [0.16, 1, 0.3, 1] as const;

function BossNode({ boss, isNext, index }: { boss: BossState; isNext: boolean; index: number }) {
  const size = boss.final ? "size-10" : "size-8";
  const color = boss.defeated ? "#4da3ff" : isNext ? "#fb4f6e" : "#7c87a6";
  return (
    <motion.div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${boss.pos * 100}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.35 + index * 0.1, type: "spring", stiffness: 420, damping: 20 }}
    >
      {isNext && <span className="absolute inset-0 animate-ping rounded-xl bg-boss/40" aria-hidden />}
      <span
        className={cn("relative flex items-center justify-center rounded-xl border-2 bg-void [&>svg]:size-[55%]", size, boss.defeated && "bg-arise/20")}
        style={{ borderColor: color, color, boxShadow: boss.defeated || isNext ? `0 0 14px ${color}` : undefined }}
        title={`${boss.name} · ${fmtDec(boss.atKg)} kg${boss.defeated ? " · vaincu" : ""}`}
      >
        {boss.defeated ? <Check strokeWidth={3} /> : boss.final ? <Crown /> : <GlyphIcon name={boss.icon} />}
      </span>
    </motion.div>
  );
}

/** Weight goal as a dungeon: floors guarded by bosses, defeated as the 7-day average crosses them. */
function BossPath({ bosses, pct, start }: { bosses: BossState[]; pct: number; start: number }) {
  const reduce = useReducedMotion();
  const nextIdx = bosses.findIndex((b) => !b.defeated);
  return (
    <div className="px-5 pt-9 pb-1">
      <div
        className="relative h-3"
        role="progressbar"
        aria-label="Progression vers l'objectif de poids"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        aria-valuetext={`${Math.round(pct * 100)} %, ${bosses.filter((b) => b.defeated).length} boss vaincus sur ${bosses.length}`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-arise via-cyan to-violet"
            style={{ boxShadow: "0 0 16px rgb(77 163 255 / 0.6)" }}
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1.4, ease: EASE }}
          />
          {!reduce && (
            <motion.div
              className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              initial={{ left: "-10%" }}
              animate={{ left: `${pct * 100}%` }}
              transition={{ duration: 1.4, ease: EASE, repeat: Infinity, repeatDelay: 3.2 }}
              aria-hidden
            />
          )}
        </div>
        <span className="absolute top-1/2 left-0 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-deep text-ink-3" aria-hidden>
          <Flag className="size-3" />
        </span>
        {bosses.map((b, i) => (
          <BossNode key={`${b.atKg}-${i}`} boss={b} isNext={i === nextIdx} index={i} />
        ))}
        <motion.span
          className="absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-arise px-1.5 py-0.5 font-display text-[10px] font-bold text-void shadow-[0_0_12px_#4da3ff]"
          initial={{ left: "0%" }}
          animate={{ left: `${pct * 100}%` }}
          transition={{ duration: 1.4, ease: EASE }}
        >
          TOI
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-arise" aria-hidden />
        </motion.span>
      </div>
      <div className="relative mt-5 h-4 text-[10px] text-ink-3 tabular" aria-hidden>
        <span className="absolute left-0 -translate-x-1/2">{fmtDec(start)}</span>
        {bosses.map((b, i) => (
          <span key={i} className={cn("absolute -translate-x-1/2 whitespace-nowrap", b.defeated ? "text-arise" : i === nextIdx ? "font-semibold text-boss" : "", b.final && "font-semibold text-ink")} style={{ left: `${b.pos * 100}%` }}>
            {fmtDec(b.atKg)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GoalCard() {
  const { bosses } = useGame();
  const g = useGoalProgress();
  if (!g) return null;
  const losing = g.target < g.start;
  const next = bosses.length ? nextBoss(bosses, g.start, g.current) : null;
  const defeatedCount = bosses.filter((b) => b.defeated).length;

  return (
    <Panel className="relative overflow-hidden">
      <Sweep delay={2.5} duration={9} />
      <PanelHeader
        title={bosses.length ? "Donjon de l'objectif" : "Objectif actuel"}
        icon={bosses.length ? <Swords /> : <Target />}
        action={
          <Link href="/progress" className="flex items-center text-xs text-ink-3 hover:text-ink" aria-label="Voir la progression">
            Détails <ChevronRight className="size-3.5" />
          </Link>
        }
      />
      <div className="flex items-baseline justify-between gap-2 font-display">
        <span className="flex items-center gap-1 text-sm text-ink-3">
          <Flag className="size-3.5" /> {fmtDec(g.start)} kg
        </span>
        <span className="text-3xl font-bold text-ink">
          {fmtDec(g.latest)}
          <span className="ml-1 text-base text-ink-3">kg</span>
        </span>
        <span className="flex items-center gap-1 text-sm text-arise">
          <Crown className="size-3.5" /> {fmtDec(g.target)} kg
        </span>
      </div>

      {bosses.length ? (
        <>
          <div className="-mx-1 mt-1">
            <BossPath bosses={bosses} pct={g.pct} start={g.start} />
          </div>
          {next ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-boss/30 bg-boss/[0.07] p-3">
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-boss/60 bg-void/60 text-boss shadow-[0_0_18px_-4px_rgb(251_79_110/0.8)] [&>svg]:size-6">
                {next.boss.final ? <Crown /> : <GlyphIcon name={next.boss.icon} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-boss uppercase">
                  <Skull className="size-3" /> {next.boss.final ? "Boss final" : `Boss ${next.boss.index + 1}/${bosses.length}`}
                </p>
                <p className="truncate text-sm font-semibold text-ink">{next.boss.name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]" aria-label={`Points de vie du boss : ${Math.round(next.hp * 100)} %`}>
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-boss to-warn"
                      initial={{ width: "100%" }}
                      animate={{ width: `${next.hp * 100}%` }}
                      transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
                    />
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-2 tabular">encore {fmtDec(next.remainingKg)} kg</span>
                </div>
              </div>
              <span className="flex shrink-0 flex-col items-center text-arise">
                <Zap className="size-4" />
                <span className="font-display text-xs font-bold">+{next.boss.xp}</span>
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-good/40 bg-good/10 p-3 text-sm text-ink">
              <Crown className="size-6 shrink-0 text-warn" /> Donjon terminé : tous les boss sont vaincus. Objectif atteint !
            </div>
          )}
        </>
      ) : (
        <div className="relative mt-3 h-3 rounded-full bg-white/[0.06]" role="progressbar" aria-label="Progression vers l'objectif de poids" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.pct * 100)}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-arise to-violet"
            style={{ boxShadow: "0 0 14px rgb(77 163 255 / 0.5)" }}
            initial={{ width: 0 }}
            animate={{ width: `${g.pct * 100}%` }}
            transition={{ duration: 1.3, ease: EASE }}
          />
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {(
          [
            [losing ? "Perdu" : "Variation", `${fmtDec(Math.abs(g.done))} kg`, losing ? <TrendingDown key="i" /> : <TrendingUp key="i" />, "text-ink"],
            ["Restant", `${fmtDec(Math.abs(g.remaining))} kg`, <Flag key="i" />, "text-ink"],
            ["Progression", `${Math.round(g.pct * 100)} %${bosses.length ? ` · ${defeatedCount}/${bosses.length}` : ""}`, <Percent key="i" />, "text-arise"],
            ["Estimation", g.projection.etaDate ? `~${formatShort(g.projection.etaDate)}` : "—", <CalendarClock key="i" />, "text-ink"],
          ] as const
        ).map(([label, value, icon, tone]) => (
          <div key={label} className="rounded-xl bg-white/[0.03] px-3 py-2">
            <dt className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <span className="text-arise [&>svg]:size-3.5">{icon}</span>
              {label}
            </dt>
            <dd className={cn("font-display font-semibold", tone)}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-ink-3">Basé sur ta moyenne 7 jours ({fmtDec(g.current)} kg) : un boss tombe quand ta moyenne franchit son palier.</p>
    </Panel>
  );
}

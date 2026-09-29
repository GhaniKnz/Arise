"use client";

import { motion } from "motion/react";
import { Crown, History, Medal } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { RankBadge, XpBar } from "@/components/game/LevelBadge";
import { StatRadar } from "@/components/game/StatRadar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/Progress";
import { db } from "@/lib/db";
import { achievements } from "@/lib/domain/achievements";
import { RANK_META, rankFor, STAT_META, STAT_ORDER, titleFor, type Rank } from "@/lib/domain/game";
import { formatShort } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { fmtInt } from "@/lib/utils/format";

const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];
const RANK_LEVEL: Record<Rank, number> = { E: 1, D: 10, C: 20, B: 30, A: 45, S: 60 };

export default function StatusPage() {
  const { profile, ledger, raw, prs, currentWeight } = useGame();
  const photos = useLiveQuery(() => db.photos.count(), []) ?? 0;
  const achs = useMemo(
    () => (profile ? achievements({ raw, ledger, prs, startWeight: profile.startWeightKg, currentWeight, photos, goal: profile.goal }) : []),
    [raw, ledger, prs, profile, currentWeight, photos],
  );
  if (!profile) return null;
  const lvl = ledger.level;
  const rank = rankFor(lvl.level);
  const unlocked = achs.filter((a) => a.done).length;
  const recent = [...ledger.events].slice(-24).reverse();

  return (
    <>
      <PageHeader kicker="Système" title="Statut" subtitle="Ta fiche de chasseur : chaque habitude fait progresser une statistique." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel glow hud className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.3),transparent_65%)]" aria-hidden />
          <p className="label text-arise">[ Fenêtre de statut ]</p>
          <div className="mt-4 flex items-center gap-4">
            <motion.div initial={{ rotate: -20, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <RankBadge level={lvl.level} size="lg" className="size-20! text-4xl!" />
            </motion.div>
            <div className="min-w-0">
              <p className="text-sm text-ink-3">Nom</p>
              <p className="truncate font-display text-2xl font-bold text-ink">{profile.name}</p>
              <p className="text-sm text-ink-2">
                Titre : <span className="text-gradient font-semibold">{titleFor(lvl.level)}</span>
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line bg-white/[0.02] py-2">
              <dt className="text-[11px] text-ink-3">Niveau</dt>
              <dd className="text-glow font-display text-3xl font-bold text-white">{lvl.level}</dd>
            </div>
            <div className="rounded-xl border border-line bg-white/[0.02] py-2">
              <dt className="text-[11px] text-ink-3">Rang</dt>
              <dd className="font-display text-3xl font-bold" style={{ color: RANK_META[rank].color }}>
                {rank}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-white/[0.02] py-2">
              <dt className="text-[11px] text-ink-3">XP totale</dt>
              <dd className="font-display text-xl leading-9 font-bold text-ink">{fmtInt(lvl.totalXp)}</dd>
            </div>
          </dl>
          <XpBar level={lvl} className="mt-5" />
          <p className="mt-2 text-xs text-ink-3">
            Plus que <strong className="text-ink">{fmtInt(lvl.xpForNext - lvl.xpInLevel)} XP</strong> pour le niveau {lvl.level + 1}.
          </p>
        </Panel>

        <Panel>
          <PanelHeader title="Statistiques" icon={<Crown />} />
          <StatRadar stats={ledger.stats} />
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {STAT_ORDER.map((k) => (
              <li key={k} className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
                <p className="flex items-baseline justify-between">
                  <span className="font-display text-sm font-bold text-ink">
                    {k} <span className="font-sans text-xs font-normal text-ink-3">{STAT_META[k].name}</span>
                  </span>
                  <span className="font-display font-bold text-arise">{ledger.stats[k]}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{STAT_META[k].desc}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Rangs de chasseur" />
        <ol className="grid grid-cols-6 gap-1.5">
          {RANKS.map((r) => {
            const reached = lvl.level >= RANK_LEVEL[r];
            return (
              <li key={r} className={cn("flex flex-col items-center gap-1 rounded-xl border py-2", r === rank ? "border-arise/60 bg-arise/10" : "border-line", !reached && "opacity-40")}>
                <span className="font-display text-xl font-bold" style={{ color: RANK_META[r].color, textShadow: reached ? `0 0 10px ${RANK_META[r].color}` : undefined }}>
                  {r}
                </span>
                <span className="text-[10px] text-ink-3">Niv. {RANK_LEVEL[r]}</span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader title="Succès" icon={<Medal />} action={<span className="text-xs text-ink-3">{unlocked}/{achs.length}</span>} />
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {achs.map((a) => (
              <li key={a.id} className={cn("flex items-center gap-3 rounded-xl border p-2.5", a.done ? "border-arise/40 bg-arise/[0.07]" : "border-line bg-white/[0.02]")}>
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-xl", a.done ? "bg-arise/15" : "bg-white/[0.04] grayscale")} aria-hidden>
                  {a.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", a.done ? "text-ink" : "text-ink-2")}>{a.title}</p>
                  <p className="truncate text-[11px] text-ink-3">{a.desc}</p>
                  {!a.done && <ProgressBar className="mt-1.5" value={a.current} max={a.target} height={4} label={`${a.title} : ${a.current} sur ${a.target}`} />}
                </div>
                {a.done ? <span className="text-xs font-semibold text-good">✓</span> : <span className="text-[11px] text-ink-3 tabular">{fmtInt(a.current)}/{a.target}</span>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title="Journal d'XP" icon={<History />} />
          <ul className="space-y-1.5 text-sm">
            {recent.map((e, i) => (
              <li key={`${e.date}-${i}`} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-ink-3">{formatShort(e.date)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-2">{e.label}</span>
                <span className="rounded bg-white/[0.05] px-1.5 text-[10px] font-semibold text-ink-3">{e.stat}</span>
                <span className="w-12 text-right font-display font-semibold text-arise">+{e.amount}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

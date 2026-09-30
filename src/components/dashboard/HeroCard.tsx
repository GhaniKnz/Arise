"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useGame } from "@/components/providers/GameProvider";
import { RankBadge, XpBar } from "@/components/game/LevelBadge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sweep } from "@/components/ui/Effects";
import { InfoTip } from "@/components/ui/Feedback";
import { Ring } from "@/components/ui/Progress";
import { RANK_META, rankFor, titleFor } from "@/lib/domain/game";
import { formatDayLong, greeting } from "@/lib/utils/date";

export function HeroCard() {
  const { profile, ledger, today } = useGame();
  const lvl = ledger.level;
  const score = ledger.days.get(today)?.score;
  const rank = rankFor(lvl.level);
  return (
    <section className="panel panel-glow hud hero-card relative overflow-hidden p-4 sm:p-6" aria-label="Statut du chasseur">
      <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.25),transparent_65%)]" aria-hidden />
      <Image src="/art/shadow-hunter.png" alt="" aria-hidden width={640} height={960} priority unoptimized className="hero-card__art" />
      <Sweep delay={1} duration={8} />
      <div className="relative mb-3 flex items-center gap-2 font-display text-[10px] font-semibold tracking-[0.22em] text-arise/85 sm:mb-4">
        <span className="size-1.5 rounded-full bg-arise shadow-[0_0_9px_#4da3ff]" />
        SYSTÈME / STATUT
        <span className="ml-auto text-ink-3">{RANK_META[rank].label}</span>
      </div>
      <div className="relative flex items-center gap-4">
        <Link href="/status" aria-label="Voir mon statut" className="shrink-0">
          <RankBadge level={lvl.level} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-3 first-letter:uppercase">{formatDayLong(today)}</p>
          <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="break-words font-display text-2xl leading-tight font-bold text-ink max-[359px]:text-xl sm:text-3xl">
            {greeting()} <span className="text-shimmer">{profile?.name}</span>
          </motion.h1>
          <p className="mt-0.5 text-sm leading-snug text-ink-2 max-[359px]:text-xs">
            <span className="font-display font-semibold whitespace-nowrap text-ink">LEVEL {lvl.level}</span>
            <span className="text-ink-3"> · {titleFor(lvl.level)} · </span>
            <span className="whitespace-nowrap" style={{ color: RANK_META[rank].color }}>{RANK_META[rank].label}</span>
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Ring value={score?.total ?? 0} max={100} size={92} stroke={8} label={`Score du jour ${score?.total ?? 0} sur 100`}>
            <span className="font-display text-2xl font-bold text-ink">
              <AnimatedNumber value={score?.total ?? 0} />
            </span>
            <span className="text-[10px] text-ink-3">score</span>
          </Ring>
        </div>
      </div>
      <div className="relative mt-4 flex items-end gap-4">
        <XpBar level={lvl} className="flex-1" />
        <div className="flex items-center gap-1 sm:hidden">
          <span className="font-display text-lg font-bold text-ink">{score?.total ?? 0}</span>
          <span className="text-[11px] text-ink-3">/100</span>
          <InfoTip label="Score du jour">
            Le score du jour mesure l&apos;adhérence à <strong>tes</strong> objectifs (calories, protéines, séance, pas, sommeil, eau). Ce n&apos;est pas un jugement : juste une boussole.
          </InfoTip>
        </div>
      </div>
    </section>
  );
}

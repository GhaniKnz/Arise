"use client";

import { Flame, Plus } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/providers/GameProvider";
import { MacroBars } from "@/components/nutrition/MacroBars";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { LinkButton } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Ring } from "@/components/ui/Progress";
import { fmtInt } from "@/lib/utils/format";

export function CaloriesCard() {
  const { profile, dayMap, today } = useGame();
  if (!profile) return null;
  const d = dayMap.get(today);
  const t = profile.targets;
  const kcal = d?.kcal ?? 0;
  const left = t.kcal - kcal;
  return (
    <Panel className="h-full">
      <PanelHeader
        title="Calories du jour"
        icon={<Flame />}
        action={
          <LinkButton href="/nutrition/add" size="sm" variant="secondary">
            <Plus /> Repas
          </LinkButton>
        }
      />
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
        <Link href="/nutrition" aria-label="Ouvrir le journal alimentaire" className="shrink-0">
          <Ring value={kcal} max={t.kcal} size={196} stroke={14} label={`${fmtInt(kcal)} kilocalories sur ${fmtInt(t.kcal)}`}>
            <span className="text-glow font-display text-4xl font-bold text-white">
              <AnimatedNumber value={kcal} />
            </span>
            <span className="text-xs text-ink-3">/ {fmtInt(t.kcal)} kcal</span>
            <span className={`mt-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${left >= 0 ? "bg-arise/15 text-arise" : "bg-warn/15 text-warn"}`}>
              {left >= 0 ? `${fmtInt(left)} restantes` : `+${fmtInt(-left)} au-dessus`}
            </span>
          </Ring>
        </Link>
        <MacroBars className="w-full flex-1" totals={{ protein: d?.protein ?? 0, carbs: d?.carbs ?? 0, fat: d?.fat ?? 0, fiber: d?.fiber ?? 0 }} targets={t} />
      </div>
    </Panel>
  );
}

"use client";

import { motion } from "motion/react";
import { Beef, Check, Droplet, Dumbbell, Flame, Footprints, Gift, Moon, Swords, Zap, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGame } from "@/components/providers/GameProvider";
import { Sparkles, Sweep } from "@/components/ui/Effects";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { ALL_QUESTS_BONUS, type QuestState } from "@/lib/domain/game";
import type { QuestId } from "@/lib/db/types";
import { openSheet } from "@/lib/system/ui";
import { cn } from "@/lib/utils/cn";
import { fmtInt, fmtLiters, fmtSleep } from "@/lib/utils/format";

const QUEST_ICON: Record<QuestId, [LucideIcon, string]> = {
  steps: [Footprints, "#4da3ff"],
  protein: [Beef, "#3987e5"],
  calories: [Flame, "#f5b94a"],
  water: [Droplet, "#22d3ee"],
  workout: [Dumbbell, "#34d399"],
  sleep: [Moon, "#a78bfa"],
};

function progressText(q: QuestState): string {
  switch (q.id) {
    case "steps":
      return `${fmtInt(q.current)} / ${fmtInt(q.target)}`;
    case "protein":
      return `${fmtInt(q.current)} / ${fmtInt(q.target)} g`;
    case "calories":
      return `${fmtInt(q.current)} kcal`;
    case "water":
      return `${fmtLiters(q.current)} / ${fmtLiters(q.target)} L`;
    case "sleep":
      return q.current ? fmtSleep(q.current) : "Non renseigné";
    case "workout":
      return q.done ? "Terminée" : "À faire";
  }
}

export function QuestsCard({ compactHeader }: { compactHeader?: boolean }) {
  const { ledger, today } = useGame();
  const router = useRouter();
  const day = ledger.days.get(today);
  const quests = day?.quests ?? [];
  const done = quests.filter((q) => q.done).length;
  const xpToday = day?.xp ?? 0;

  const act = (id: QuestId) => {
    if (id === "steps") openSheet("steps");
    else if (id === "water") openSheet("water");
    else if (id === "sleep") openSheet("sleep");
    else if (id === "workout") router.push("/session");
    else router.push("/nutrition");
  };

  return (
    <Panel glow={day?.allQuestsDone} className="relative h-full overflow-hidden">
      {day?.allQuestsDone && (
        <>
          <Sweep delay={0.5} duration={5} />
          <Sparkles count={8} />
        </>
      )}
      <PanelHeader
        title="Quêtes du jour"
        icon={<Swords />}
        subtitle={compactHeader ? undefined : "Préparation au renforcement du corps"}
        action={
          <span className="rounded-full border border-arise/30 bg-arise/10 px-2 py-0.5 font-display text-xs font-semibold text-arise">
            {done}/{quests.length}
          </span>
        }
      />
      <ul className="space-y-1.5">
        {quests.map((q, i) => {
          const [Icon, color] = QUEST_ICON[q.id];
          return (
            <motion.li key={q.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <button
                type="button"
                onClick={() => act(q.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]",
                  q.done ? "border-arise/30 bg-arise/[0.07]" : "border-line bg-white/[0.02] hover:border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "relative flex size-9 shrink-0 items-center justify-center rounded-xl border transition",
                    q.done ? "border-arise bg-arise text-void shadow-[0_0_14px_#4da3ff]" : "border-line-strong bg-void/40",
                  )}
                  style={q.done ? undefined : { color }}
                  aria-hidden
                >
                  {q.done ? <Check className="size-5" strokeWidth={3} /> : <Icon className="icon-glow size-[18px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-medium", q.done ? "text-ink-2 line-through decoration-arise/60" : "text-ink")}>{q.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.span className="block h-full rounded-full bg-arise" initial={{ width: 0 }} animate={{ width: `${q.progress * 100}%` }} transition={{ duration: 0.9 }} />
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-3 tabular">{progressText(q)}</span>
                  </span>
                </span>
                <span className={cn("flex shrink-0 items-center gap-0.5 font-display text-xs font-semibold", q.done ? "text-arise" : "text-ink-3")}>
                  <Zap className="size-3" />+{q.xp}
                </span>
                <span className="sr-only">{q.done ? "Accomplie" : "En cours"}</span>
              </button>
            </motion.li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-violet/30 bg-violet/5 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-ink-2">
          <Gift className="size-3.5 text-violet-2" /> Bonus toutes quêtes
        </span>
        <span className={cn("font-display font-semibold", day?.allQuestsDone ? "text-good" : "text-violet-2")}>{day?.allQuestsDone ? "Obtenu ✓" : `+${ALL_QUESTS_BONUS} XP`}</span>
      </div>
      <p className="mt-2 text-right text-[11px] text-ink-3">
        XP gagnée aujourd&apos;hui : <span className="font-semibold text-ink-2">{fmtInt(xpToday)}</span>
      </p>
    </Panel>
  );
}

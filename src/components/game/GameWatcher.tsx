"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { kvGet, kvSet } from "@/lib/db/repo";
import { ALL_QUESTS_BONUS, QUEST_DEFS, rankFor, STAT_ORDER, titleFor, type StatKey } from "@/lib/domain/game";
import { cue, setFeedbackPrefs } from "@/lib/system/feedback";
import { showOverlay, toast } from "@/lib/system/store";

/**
 * Turns changes of the derived game state into feedback: quest toasts,
 * the Daily Quest overlay and the Level Up screen. First observation of a
 * value is stored silently so nothing fires for pre-existing progress.
 */
export function GameWatcher() {
  const { ready, profile, ledger, today } = useGame();
  const busy = useRef(false);
  const pending = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (profile) setFeedbackPrefs({ sound: profile.sound, vibration: profile.vibration });
    document.documentElement.dataset.effects = profile?.effects ?? "full";
  }, [profile]);

  useEffect(() => {
    if (!ready || !profile) return;
    if (busy.current) {
      pending.current = true;
      return;
    }
    busy.current = true;
    (async () => {
      const todayLedger = ledger.days.get(today);
      const doneNow = todayLedger?.quests.filter((q) => q.done).map((q) => q.id) ?? [];
      const questKey = `seen:quests:${today}`;
      const seen = await kvGet<string[]>(questKey);
      if (seen === undefined) {
        await kvSet(questKey, doneNow);
      } else {
        const fresh = doneNow.filter((id) => !seen.includes(id));
        for (const id of fresh) {
          const q = todayLedger!.quests.find((x) => x.id === id)!;
          toast({ tone: "quest", title: `Quête accomplie : ${QUEST_DEFS[id].label}`, message: q.title, xp: q.xp });
        }
        if (fresh.length) cue("quest");
        if (fresh.length || doneNow.length !== seen.length) await kvSet(questKey, doneNow);

        const allKey = `seen:allquests:${today}`;
        if (todayLedger?.allQuestsDone && fresh.length && !(await kvGet<boolean>(allKey))) {
          await kvSet(allKey, true);
          const xp = todayLedger.quests.reduce((a, q) => a + q.xp, 0) + ALL_QUESTS_BONUS;
          showOverlay({ kind: "quests", xp });
          cue("levelup");
        }
      }

      const level = ledger.level.level;
      const seenLevel = await kvGet<number>("seen:level");
      const seenStats = await kvGet<Record<StatKey, number>>("seen:stats");
      if (seenLevel === undefined) {
        await kvSet("seen:level", level);
        await kvSet("seen:stats", ledger.stats);
      } else if (level > seenLevel) {
        const gains: Partial<Record<StatKey, number>> = {};
        for (const k of STAT_ORDER) gains[k] = ledger.stats[k] - (seenStats?.[k] ?? ledger.stats[k]);
        await kvSet("seen:level", level);
        await kvSet("seen:stats", ledger.stats);
        showOverlay({ kind: "levelup", level, rank: rankFor(level), title: titleFor(level), gains });
        cue("levelup");
      } else if (level < seenLevel) {
        // Data was corrected or deleted: follow silently.
        await kvSet("seen:level", level);
        await kvSet("seen:stats", ledger.stats);
      }
    })().finally(() => {
      busy.current = false;
      if (pending.current) {
        pending.current = false;
        setTick((t) => t + 1);
      }
    });
  }, [ready, profile, ledger, today, tick]);

  return null;
}

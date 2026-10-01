"use client";

import { Activity, BatteryCharging, Droplet, Dumbbell, Footprints, HeartPulse, Moon, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/providers/GameProvider";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/Progress";
import { addWater } from "@/lib/db/repos/body";
import { activeKcalEstimate, recoveryLevel, RECOVERY_META, sessionMinutes } from "@/lib/domain/daily";
import { cue } from "@/lib/system/feedback";
import { openSheet } from "@/lib/system/ui";
import { fmtDuration, fmtInt, fmtLiters, fmtSleep } from "@/lib/utils/format";

export function ActivityCard() {
  const { profile, raw, dayMap, today, currentWeight } = useGame();
  if (!profile) return null;
  const d = dayMap.get(today);
  const log = raw.logs.find((l) => l.date === today);
  const sessions = raw.sessions.filter((s) => s.date === today);
  const cardio = raw.cardio.filter((c) => c.date === today);
  const done = sessions.find((s) => s.status === "done");
  const active = sessions.find((s) => s.status === "active");
  const activeKcal = activeKcalEstimate({ steps: d?.steps, weightKg: currentWeight ?? 75, cardio, sessions, log });

  return (
    <Panel className="h-full">
      <PanelHeader title="Activité du jour" icon={<Activity />} />
      <button type="button" onClick={() => openSheet("steps")} className="w-full rounded-xl text-left" aria-label="Modifier les pas">
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-2 text-sm text-ink-2">
            <Footprints className="size-4 text-arise" /> Pas
          </span>
          <span className="font-display text-2xl font-bold text-ink">
            <AnimatedNumber value={d?.steps ?? 0} />
            <span className="ml-1 text-sm font-normal text-ink-3">/ {fmtInt(profile.targets.steps)}</span>
          </span>
        </div>
        <ProgressBar className="mt-2" value={d?.steps ?? 0} max={profile.targets.steps} gradient height={8} label="Pas du jour" />
      </button>
      <ul className="mt-4 space-y-2.5 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-ink-2">
            <Zap className="size-4 text-warn" /> Calories actives
          </span>
          <span className="font-semibold text-ink">~{fmtInt(activeKcal)} kcal</span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-ink-2">
            <Dumbbell className="size-4 text-good" /> Entraînement
          </span>
          <span className="truncate font-semibold text-ink">
            {done ? `${done.name} · terminé` : active ? `${active.name} · en cours` : d?.workoutPlanned ? "Prévu" : "Repos"}
          </span>
        </li>
        {(done || active) && (
          <li className="flex items-center justify-between gap-2">
            <span className="pl-6 text-ink-3">Durée</span>
            <span className="font-semibold text-ink">{fmtDuration(sessionMinutes((done ?? active)!) * 60)}</span>
          </li>
        )}
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-ink-2">
            <HeartPulse className="size-4 text-rose" /> Cardio
          </span>
          <button type="button" onClick={() => openSheet("cardio")} className="font-semibold text-ink underline-offset-2 hover:underline">
            {cardio.length ? `${fmtInt(d?.cardioMin ?? 0)} min` : "Ajouter"}
          </button>
        </li>
      </ul>
    </Panel>
  );
}

export function DayStateCard() {
  const { profile, dayMap, today } = useGame();
  if (!profile) return null;
  const d = dayMap.get(today);
  const rec = recoveryLevel(d?.sleepMin, d?.energy, profile.targets.sleepMin);
  const water = d?.waterMl ?? 0;

  const plus = async () => {
    await addWater(today, 250);
    cue("tap");
  };

  return (
    <Panel className="h-full">
      <PanelHeader title="État du jour" icon={<BatteryCharging />} />
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => openSheet("sleep")} className="rounded-xl border border-line bg-white/[0.02] p-3 text-left transition hover:border-line-strong">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <Moon className="size-3.5 text-violet-2" /> Sommeil
          </span>
          <span className="mt-0.5 block font-display text-lg font-semibold text-ink">{fmtSleep(d?.sleepMin)}</span>
        </button>
        <button type="button" onClick={() => openSheet("sleep")} className="rounded-xl border border-line bg-white/[0.02] p-3 text-left transition hover:border-line-strong">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <Zap className="size-3.5 text-warn" /> Énergie
          </span>
          <span className="mt-0.5 block font-display text-lg font-semibold text-ink">{d?.energy != null ? `${d.energy}/10` : "-"}</span>
        </button>
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <BatteryCharging className="size-3.5" style={{ color: RECOVERY_META[rec].color }} /> Récupération
          </span>
          <span className="mt-0.5 block font-display text-lg font-semibold" style={{ color: RECOVERY_META[rec].color }}>
            {RECOVERY_META[rec].label}
          </span>
        </div>
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <Droplet className="size-3.5 text-cyan" /> Eau
            </span>
            <button type="button" onClick={plus} aria-label="Ajouter 250 ml d'eau" className="flex size-6 items-center justify-center rounded-md bg-cyan/15 text-cyan transition active:scale-90">
              <Plus className="size-3.5" />
            </button>
          </div>
          <button type="button" onClick={() => openSheet("water")} className="mt-0.5 block font-display text-lg font-semibold text-ink">
            {fmtLiters(water)} <span className="text-xs font-normal text-ink-3">/ {fmtLiters(profile.targets.waterMl)} L</span>
          </button>
        </div>
      </div>
      <Link href="/calendar" className="mt-3 block text-right text-[11px] text-ink-3 hover:text-ink">
        Voir l&apos;historique →
      </Link>
    </Panel>
  );
}

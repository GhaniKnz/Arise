"use client";

import { Check, Dumbbell, HeartPulse, Scale, Utensils, X } from "lucide-react";
import Link from "next/link";
import { useGame } from "@/components/providers/GameProvider";
import { LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { formatDayLong, type DayKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { fmtDec, fmtInt, fmtSleep } from "@/lib/utils/format";

export function DaySheet({ date, onClose }: { date: DayKey | null; onClose: () => void }) {
  const { ledger, raw, profile } = useGame();
  const l = date ? ledger.days.get(date) : undefined;
  const sessions = date ? raw.sessions.filter((s) => s.date === date && s.status === "done") : [];
  const cardio = date ? raw.cardio.filter((c) => c.date === date) : [];
  return (
    <Sheet open={!!date} onClose={onClose} title={date ? formatDayLong(date) : ""} description={l?.score.tracked ? `Score ${l.score.total}/100${l.validated ? " · jour validé" : ""} · ${fmtInt(l.xp)} XP` : "Aucune donnée ce jour-là"}>
      {date && l && profile && (
        <div className="space-y-4">
          <ul className="space-y-2">
            {l.score.parts.map((p) => (
              <li key={p.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-ink-2">{p.label}</span>
                  <span className="text-ink tabular">{p.value}/100</span>
                </div>
                <ProgressBar value={p.value} max={100} height={6} label={`${p.label} ${p.value} sur 100`} />
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <Utensils className="size-3.5" /> Nutrition
              </p>
              <p className="font-display text-lg font-semibold text-ink">{fmtInt(l.day.kcal)} kcal</p>
              <p className="text-[11px] text-ink-3">P {fmtInt(l.day.protein)} · G {fmtInt(l.day.carbs)} · L {fmtInt(l.day.fat)}</p>
            </div>
            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <Scale className="size-3.5" /> Poids · pas
              </p>
              <p className="font-display text-lg font-semibold text-ink">{l.day.weightKg ? `${fmtDec(l.day.weightKg)} kg` : "-"}</p>
              <p className="text-[11px] text-ink-3">
                {fmtInt(l.day.steps ?? 0)} pas · sommeil {fmtSleep(l.day.sleepMin)}
              </p>
            </div>
          </div>
          {(sessions.length > 0 || cardio.length > 0) && (
            <ul className="space-y-1.5">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/workout/history/${s.id}`} onClick={onClose} className="flex items-center gap-2 rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-sm text-ink">
                    <Dumbbell className="size-4 text-good" /> {s.name}
                  </Link>
                </li>
              ))}
              {cardio.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-ink">
                  <HeartPulse className="size-4 text-rose" /> Cardio {c.durationMin} min
                </li>
              ))}
            </ul>
          )}
          <ul className="grid grid-cols-2 gap-1.5 text-xs">
            {l.quests.map((q) => (
              <li key={q.id} className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1.5", q.done ? "bg-arise/10 text-ink" : "bg-white/[0.03] text-ink-3")}>
                {q.done ? <Check className="size-3.5 text-arise" /> : <X className="size-3.5" />}
                <span className="truncate">{q.title}</span>
              </li>
            ))}
          </ul>
          <LinkButton href={`/nutrition?date=${date}`} variant="secondary" block size="sm">
            Ouvrir le journal de ce jour
          </LinkButton>
        </div>
      )}
    </Sheet>
  );
}

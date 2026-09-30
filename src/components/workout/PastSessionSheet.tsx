"use client";

import { CalendarDays, CalendarPlus, Clock, Info, Sparkles, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { ExerciseIcon, RoutineIcon } from "@/components/icons/ExerciseIcon";
import { Button } from "@/components/ui/Button";
import { Chip, Field, NumberInput, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { useExerciseLibrary, useRoutines } from "@/lib/db/hooks";
import { logPastSession } from "@/lib/db/repos/workout";
import type { Routine } from "@/lib/db/types";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { toast } from "@/lib/system/store";
import { addDays, formatDayLong, weekdayIndex, type DayKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const FREE = "";

/**
 * Logs a session done on an earlier day (forgotten entry). Sets are prefilled
 * with the performance that preceded that day, then adjusted on the next screen.
 */
export function PastSessionSheet({ open, onClose, onCreated, initialDate }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; initialDate?: DayKey }) {
  const { today, profile, raw } = useGame();
  const routines = useRoutines();
  const { byId } = useExerciseLibrary();
  const yesterday = addDays(today, -1);
  const plannedFor = (d: DayKey) => profile?.schedule[weekdayIndex(d)] ?? null;

  const [date, setDate] = useState<DayKey>(initialDate ?? yesterday);
  /** Program picked by the user; null = follow the weekly plan of the chosen day. */
  const [choice, setChoice] = useState<string | null>(null);
  const [name, setName] = useState("Séance libre");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState<number | undefined>(60);
  const [busy, setBusy] = useState(false);

  useResetOnOpen(open, () => {
    setDate(initialDate ?? yesterday);
    setChoice(null);
    setName("Séance libre");
    setTime("18:00");
    setDuration(60);
  });

  const planned = plannedFor(date);
  const routineId = choice ?? (routines?.some((r) => r.id === planned) ? planned! : (routines?.[0]?.id ?? FREE));
  const routine: Routine | undefined = routines?.find((r) => r.id === routineId);
  const existing = useMemo(() => raw.sessions.filter((s) => s.status === "done" && s.date === date), [raw.sessions, date]);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;

  const save = async () => {
    if (!validDate) return;
    setBusy(true);
    try {
      const s = await logPastSession({
        date,
        routine,
        name: routine?.name ?? (name.trim() || "Séance libre"),
        type: routine?.type ?? "custom",
        durationMin: duration ?? 60,
        startTime: time,
      });
      toast({ tone: "success", title: "Séance ajoutée à l'historique", message: routine ? "Séries préremplies : ajuste poids et reps" : "Ajoute les exercices que tu as faits" });
      onCreated(s.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajouter une séance passée"
      description="Tu as oublié de noter une séance ? Ajoute-la ici : tu pourras corriger chaque série juste après."
      tall
      footer={
        <Button block size="lg" onClick={save} disabled={busy || !validDate}>
          <CalendarPlus /> Créer et remplir
        </Button>
      }
    >
      <div className="space-y-5">
        <Field
          label={
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> Jour
            </span>
          }
          htmlFor="past-date"
          error={!validDate ? "Choisis un jour passé" : undefined}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {[
              [yesterday, "Hier"],
              [addDays(today, -2), "Avant-hier"],
              [today, "Aujourd'hui"],
            ].map(([d, label]) => (
              <Chip key={d} active={date === d} onClick={() => setDate(d)}>
                {label}
              </Chip>
            ))}
          </div>
          <TextInput id="past-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          {validDate && <p className="mt-1 text-xs text-ink-3 first-letter:uppercase">{formatDayLong(date)}</p>}
        </Field>

        {existing.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-warn" />
            Déjà enregistré ce jour-là : {existing.map((s) => s.name).join(", ")}. Vérifie que ce n&apos;est pas un doublon.
          </p>
        )}

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-2">Séance faite</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(routines ?? []).map((r) => {
              const color = routineColor(r);
              const selected = r.id === routineId;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setChoice(r.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                    selected ? "border-arise/70 bg-arise/10 shadow-[0_0_20px_-8px_rgb(77_163_255/0.7)]" : "border-line bg-deep/50 hover:border-line-strong",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-void/50" style={{ borderColor: `color-mix(in srgb, ${color} 55%, transparent)` }}>
                    <RoutineIcon icon={routineIcon(r)} color={color} className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-ink">{r.name}</span>
                      {r.id === planned && <span className="shrink-0 rounded-full bg-arise/15 px-1.5 py-0.5 text-[9px] font-semibold text-arise uppercase">Prévue</span>}
                    </span>
                    <span className="mt-1 flex gap-0.5">
                      {r.exercises.slice(0, 6).map((e, i) => {
                        const ex = byId(e.exerciseId);
                        return ex ? <ExerciseIcon key={`${e.exerciseId}-${i}`} exercise={ex} className="h-6 w-4.5" /> : null;
                      })}
                      <span className="ml-1 self-center text-[11px] text-ink-3">{r.exercises.length} exos</span>
                    </span>
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={routineId === FREE}
              onClick={() => setChoice(FREE)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                routineId === FREE ? "border-arise/70 bg-arise/10 shadow-[0_0_20px_-8px_rgb(77_163_255/0.7)]" : "border-dashed border-line-strong bg-deep/30 hover:border-arise/50",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-void/50 text-violet-2">
                <Sparkles className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">Séance libre</span>
                <span className="block text-[11px] text-ink-3">Tu choisis les exercices ensuite</span>
              </span>
            </button>
          </div>
        </div>

        {routineId === FREE && (
          <Field label="Nom" htmlFor="past-name">
            <TextInput id="past-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex. Push, Bras, Full body…" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> Début
              </span>
            }
            htmlFor="past-time"
          >
            <TextInput id="past-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <Timer className="size-3.5" /> Durée
              </span>
            }
            htmlFor="past-duration"
          >
            <NumberInput id="past-duration" value={duration} onChange={setDuration} step={5} min={5} max={300} unit="min" decimals={0} stepper={false} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

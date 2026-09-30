"use client";

import { CalendarDays, Clock, Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, Field, NumberInput, TextArea, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { updateSessionInfo } from "@/lib/db/repos/workout";
import type { Session } from "@/lib/db/types";
import { sessionMinutes } from "@/lib/domain/daily";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { toast } from "@/lib/system/store";
import { todayKey } from "@/lib/utils/date";

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Edits a finished session's name, date, time, duration, RPE and notes. */
export function SessionInfoSheet({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const [name, setName] = useState(session.name);
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(hhmm(session.startedAt));
  const [duration, setDuration] = useState<number | undefined>(Math.round(sessionMinutes(session)) || 60);
  const [rpe, setRpe] = useState<number | undefined>(session.rpe);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [busy, setBusy] = useState(false);

  useResetOnOpen(open, () => {
    setName(session.name);
    setDate(session.date);
    setTime(hhmm(session.startedAt));
    setDuration(Math.round(sessionMinutes(session)) || 60);
    setRpe(session.rpe);
    setNotes(session.notes ?? "");
  });

  const valid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayKey() && (duration ?? 0) > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Infos de la séance"
      footer={
        <Button
          block
          size="lg"
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await updateSessionInfo(session, { name: name.trim(), date, startTime: time, durationMin: duration ?? 60, rpe, notes: notes.trim() || undefined });
              toast({ tone: "success", title: "Séance mise à jour" });
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Enregistrer
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nom" htmlFor="session-name">
          <TextInput id="session-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Date
              </span>
            }
            htmlFor="session-date"
            error={date > todayKey() ? "Pas dans le futur" : undefined}
          >
            <TextInput id="session-date" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> Début
              </span>
            }
            htmlFor="session-time"
          >
            <TextInput id="session-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field
          label={
            <span className="flex items-center gap-1.5">
              <Timer className="size-3.5" /> Durée
            </span>
          }
          htmlFor="session-duration"
        >
          <NumberInput id="session-duration" value={duration} onChange={setDuration} step={5} min={5} max={300} decimals={0} unit="min" />
        </Field>
        <Field label="Difficulté globale (RPE séance)">
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <Chip key={v} active={rpe === v} onClick={() => setRpe(rpe === v ? undefined : v)} className="justify-center">
                {v}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Notes" htmlFor="session-notes">
          <TextArea id="session-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sensations, douleurs, réglages machine…" />
        </Field>
      </div>
    </Sheet>
  );
}

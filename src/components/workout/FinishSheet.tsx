"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, Field, TextArea } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import type { WorkoutSet } from "@/lib/db/types";
import { fmtDuration, fmtInt } from "@/lib/utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
  sets: WorkoutSet[];
  elapsedSec: number;
  prCount: number;
  onFinish: (opts: { rpe?: number; notes?: string }) => Promise<void>;
  onDiscard: () => Promise<void>;
}

export function FinishSheet({ open, onClose, sets, elapsedSec, prCount, onFinish, onDiscard }: Props) {
  const [rpe, setRpe] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const done = sets.filter((s) => s.done && !s.warmup);
  const pending = sets.filter((s) => !s.done).length;
  const volume = done.reduce((a, s) => a + s.weightKg * s.reps, 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Terminer la séance"
      footer={
        <div className="space-y-2">
          <Button
            block
            size="lg"
            disabled={busy || done.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await onFinish({ rpe, notes: notes.trim() || undefined });
              } finally {
                setBusy(false);
              }
            }}
          >
            Valider la séance
          </Button>
          {confirmDiscard ? (
            <Button variant="danger" block onClick={onDiscard}>
              Confirmer : supprimer la séance
            </Button>
          ) : (
            <Button variant="ghost" block size="sm" onClick={() => setConfirmDiscard(true)}>
              Abandonner la séance
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Durée", fmtDuration(elapsedSec)],
            ["Séries", String(done.length)],
            ["Volume", `${fmtInt(volume)} kg`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-line bg-white/[0.02] py-2.5">
              <p className="font-display text-lg font-semibold text-ink">{v}</p>
              <p className="text-[11px] text-ink-3">{l}</p>
            </div>
          ))}
        </div>
        {prCount > 0 && (
          <p className="flex items-center justify-center gap-2 rounded-xl border border-warn/30 bg-warn/10 py-2 text-sm text-ink">
            <Trophy className="size-4 text-warn" /> {prCount} record{prCount > 1 ? "s" : ""} battu{prCount > 1 ? "s" : ""} aujourd&apos;hui
          </p>
        )}
        {pending > 0 && <Notice>{pending} série(s) non validée(s) seront retirées.</Notice>}
        {done.length === 0 && <Notice tone="warn">Valide au moins une série pour enregistrer la séance.</Notice>}
        <Field label="Difficulté globale (RPE séance)">
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <Chip key={v} active={rpe === v} onClick={() => setRpe(v)} className="justify-center">
                {v}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sensations, douleurs, réglages machine…" />
        </Field>
      </div>
    </Sheet>
  );
}

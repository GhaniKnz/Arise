"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

/** Confirms removing an exercise from a session, optionally from its program too. */
export function RemoveExerciseSheet({
  open,
  onClose,
  exerciseName,
  setCount,
  routineName,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  setCount: number;
  /** Program that also contains the exercise (offers to remove it there). */
  routineName?: string;
  onConfirm: (alsoRoutine: boolean) => Promise<void> | void;
}) {
  const [alsoRoutine, setAlsoRoutine] = useState(false);
  const [busy, setBusy] = useState(false);
  useResetOnOpen(open, () => setAlsoRoutine(false));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Retirer ${exerciseName} ?`}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" block onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="danger"
            block
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(alsoRoutine);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 /> Retirer
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-2">{setCount > 0 ? `Ses ${setCount} série${setCount > 1 ? "s" : ""} de cette séance seront supprimées.` : "Il sera retiré de cette séance."}</p>
        {routineName && <Toggle checked={alsoRoutine} onChange={setAlsoRoutine} label={`Retirer aussi du programme « ${routineName} »`} description="Il ne sera plus prévu dans tes prochaines séances" />}
      </div>
    </Sheet>
  );
}

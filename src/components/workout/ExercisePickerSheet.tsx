"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { ExerciseIcon } from "@/components/icons/ExerciseIcon";
import { Button } from "@/components/ui/Button";
import { Chip, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIPMENT_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL } from "@/lib/data/exercises";
import { normalize } from "@/lib/data/foods";
import { useExerciseLibrary } from "@/lib/db/hooks";
import type { Exercise, Muscle } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";
import { ExerciseEditorSheet } from "./ExerciseEditorSheet";

export function filterExercises(all: Exercise[], q: string, muscle: Muscle | null) {
  const nq = normalize(q);
  return all.filter((e) => {
    if (muscle && e.primary !== muscle && !e.secondary.includes(muscle)) return false;
    if (!nq) return true;
    return normalize(`${e.name} ${e.nameEn ?? ""} ${MUSCLE_LABEL[e.primary]}`).includes(nq);
  });
}

export function ExerciseListItem({ ex, onClick, trailing, selected }: { ex: Exercise; onClick?: () => void; trailing?: React.ReactNode; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition hover:bg-white/[0.03] active:scale-[0.99]", selected ? "border-arise/50 bg-arise/10" : "border-transparent")}
    >
      <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.03]">
        <ExerciseIcon exercise={ex} className="h-11 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{ex.name}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
          {MUSCLE_LABEL[ex.primary]} · <EquipmentIcon equipment={ex.equipment} className="size-3.5" /> {EQUIPMENT_LABEL[ex.equipment]}
        </span>
      </span>
      {trailing}
    </button>
  );
}

/**
 * Pick an exercise to add. `added` lists exercises already in the session or
 * program: they stay pickable (an exercise can be done several times) and show a count.
 */
export function ExercisePickerSheet({ open, onClose, onPick, added = [] }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void; added?: string[] }) {
  const { all } = useExerciseLibrary();
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [creating, setCreating] = useState(false);
  const list = useMemo(() => filterExercises(all, q, muscle), [all, q, muscle]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of added) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [added]);

  const pick = (e: Exercise) => {
    onPick(e);
    onClose();
    setQ("");
    setCreating(false);
  };

  return (
    <>
      <Sheet open={open && !creating} onClose={onClose} title="Ajouter un exercice" tall size="lg">
        <div className="sticky top-0 z-10 -mx-5 space-y-2 bg-[#0f1628] px-5 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (développé, squat, curl…)" className="pl-9" aria-label="Rechercher un exercice" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <Chip active={!muscle} onClick={() => setMuscle(null)}>
              Tous
            </Chip>
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
        <ul className="mt-1 space-y-0.5">
          {list.map((e) => (
            <li key={e.id}>
              <ExerciseListItem
                ex={e}
                onClick={() => pick(e)}
                selected={counts.has(e.id)}
                trailing={
                  <span className="flex shrink-0 items-center gap-1.5">
                    {counts.has(e.id) && <span className="rounded-full bg-arise/15 px-1.5 py-0.5 text-[10px] font-semibold text-arise">déjà ×{counts.get(e.id)}</span>}
                    <Plus className="size-4 text-arise" />
                  </span>
                }
              />
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Button variant="ghost" block onClick={() => setCreating(true)}>
            <Plus /> Créer un exercice personnalisé
          </Button>
        </div>
      </Sheet>
      <ExerciseEditorSheet open={open && creating} onClose={() => setCreating(false)} onSaved={pick} />
    </>
  );
}

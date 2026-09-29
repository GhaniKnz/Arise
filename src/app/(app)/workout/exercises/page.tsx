"use client";

import { ArrowLeft, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { ExerciseIcon } from "@/components/icons/ExerciseIcon";
import { ExerciseEditorSheet } from "@/components/workout/ExerciseEditorSheet";
import { filterExercises } from "@/components/workout/ExercisePickerSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, TextInput } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL } from "@/lib/data/exercises";
import { useExerciseLibrary } from "@/lib/db/hooks";
import type { Equipment, Muscle } from "@/lib/db/types";

export default function ExercisesPage() {
  const router = useRouter();
  const { all, customized } = useExerciseLibrary();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const list = useMemo(() => filterExercises(all, q, muscle).filter((e) => !equipment || e.equipment === equipment), [all, q, muscle, equipment]);

  return (
    <>
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/workout")}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader
        kicker="Workout"
        title="Exercices"
        subtitle={`${all.length} exercices · touche un exercice pour le voir ou le modifier`}
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> Créer
          </Button>
        }
      />
      <ExerciseEditorSheet open={creating} onClose={() => setCreating(false)} onSaved={(e) => router.push(`/workout/exercises/${encodeURIComponent(e.id)}`)} />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un exercice" className="pl-10" aria-label="Rechercher un exercice" />
      </div>
      <div className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="Filtrer par muscle">
        <Chip active={!muscle} onClick={() => setMuscle(null)}>
          Tous les muscles
        </Chip>
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m.id} active={muscle === m.id} onClick={() => setMuscle(muscle === m.id ? null : m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="Filtrer par équipement">
        {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((k) => (
          <Chip key={k} active={equipment === k} onClick={() => setEquipment(equipment === k ? null : k)}>
            <EquipmentIcon equipment={k} className="size-3.5" /> {EQUIPMENT_LABEL[k]}
          </Chip>
        ))}
      </div>
      {list.length ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((e) => (
            <li key={e.id}>
              <Link href={`/workout/exercises/${encodeURIComponent(e.id)}`} className="panel card-hover relative flex h-full flex-col items-center p-3 text-center active:scale-[0.98]">
                {customized(e.id) && (
                  <span className="absolute top-2 right-2 text-violet-2" title="Personnalisé">
                    <Sparkles className="size-3.5" />
                  </span>
                )}
                <ExerciseIcon exercise={e} className="h-20 w-14" />
                <p className="mt-2 line-clamp-2 text-sm leading-tight font-medium text-ink">{e.name}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-3">
                  <EquipmentIcon equipment={e.equipment} className="size-3.5" /> {MUSCLE_LABEL[e.primary]}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-3">{LEVEL_LABEL[e.level]}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aucun exercice" description="Modifie les filtres ou crée ton propre exercice." />
      )}
    </>
  );
}

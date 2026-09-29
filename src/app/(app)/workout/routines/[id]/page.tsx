"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { ExercisePickerSheet } from "@/components/workout/ExercisePickerSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, NumberInput, Select, TextArea, TextInput } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { ROUTINE_TYPE_META, TEMPLATES } from "@/lib/data/routines";
import { MUSCLE_LABEL } from "@/lib/data/exercises";
import { useExerciseLibrary, useRoutine } from "@/lib/db/hooks";
import { deleteRoutine, saveRoutine } from "@/lib/db/repos/workout";
import type { RoutineExercise, RoutineType } from "@/lib/db/types";
import { toast } from "@/lib/system/store";

export default function RoutineEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const routine = useRoutine(isNew ? undefined : id);
  const { byId } = useExerciseLibrary();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoutineType>("custom");
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [picking, setPicking] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  if (routine && !loaded) {
    setName(routine.name);
    setType(routine.type);
    setItems(routine.exercises);
    setNotes(routine.notes ?? "");
    setLoaded(true);
  }

  if (!isNew && routine === undefined) return <PageSkeleton />;
  if (!isNew && routine === null) return <EmptyState title="Programme introuvable" action={<Button onClick={() => router.push("/workout")}>Retour</Button>} />;

  const update = (i: number, patch: Partial<RoutineExercise>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const next = [...xs];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });

  const save = async () => {
    if (!name.trim()) {
      toast({ tone: "error", title: "Donne un nom au programme" });
      return;
    }
    await saveRoutine({ id: isNew ? undefined : id, name: name.trim(), type, exercises: items, notes: notes.trim() || undefined });
    toast({ tone: "success", title: "Programme enregistré", message: name });
    router.push("/workout");
  };

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    if (!name) setName(t.name);
    setType(t.type);
    setItems(t.exercises.map((e) => ({ ...e })));
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/workout")}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader kicker="Programme" title={isNew ? "Nouveau programme" : "Modifier le programme"} />

      <Panel className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Push A" />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as RoutineType)}>
              {(Object.keys(ROUTINE_TYPE_META) as RoutineType[]).map((t) => (
                <option key={t} value={t}>
                  {ROUTINE_TYPE_META[t].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {isNew && (
          <Field label="Partir d'un modèle (optionnel)">
            <Select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">—</option>
              {Object.values(TEMPLATES).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Panel>

      <div className="mt-4 space-y-2">
        {items.map((it, i) => {
          const ex = byId(it.exerciseId);
          return (
            <Panel key={`${it.exerciseId}-${i}`} className="space-y-3">
              <div className="flex items-center gap-3">
                {ex && <MuscleIcon primary={ex.primary} secondary={ex.secondary} className="h-12 w-9" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{ex?.name ?? it.exerciseId}</p>
                  <p className="text-[11px] text-ink-3">{ex ? MUSCLE_LABEL[ex.primary] : ""}</p>
                </div>
                <IconButton label="Monter" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp />
                </IconButton>
                <IconButton label="Descendre" size="sm" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown />
                </IconButton>
                <IconButton label="Retirer" size="sm" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>
                  <Trash2 />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field label="Séries">
                  <NumberInput value={it.sets} onChange={(v) => update(i, { sets: Math.max(1, Math.round(v ?? 1)) })} min={1} max={10} decimals={0} stepper={false} />
                </Field>
                <Field label="Reps min">
                  <NumberInput value={it.repsMin} onChange={(v) => update(i, { repsMin: Math.max(1, Math.round(v ?? 1)) })} min={1} max={100} decimals={0} stepper={false} />
                </Field>
                <Field label="Reps max">
                  <NumberInput value={it.repsMax} onChange={(v) => update(i, { repsMax: Math.max(it.repsMin, Math.round(v ?? it.repsMin)) })} min={1} max={100} decimals={0} stepper={false} />
                </Field>
                <Field label="Repos">
                  <NumberInput value={it.restSec} onChange={(v) => update(i, { restSec: Math.max(15, Math.round(v ?? 90)) })} min={15} max={600} step={15} unit="s" decimals={0} stepper={false} />
                </Field>
              </div>
            </Panel>
          );
        })}
        <Button variant="secondary" block onClick={() => setPicking(true)}>
          <Plus /> Ajouter un exercice
        </Button>
      </div>

      <Panel className="mt-4">
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Échauffement, tempo, consignes…" />
        </Field>
      </Panel>

      <div className="mt-4 flex gap-2">
        {!isNew && (
          <Button
            variant="danger"
            onClick={async () => {
              await deleteRoutine(id);
              router.push("/workout");
            }}
          >
            <Trash2 /> Supprimer
          </Button>
        )}
        <Button block size="lg" onClick={save}>
          Enregistrer
        </Button>
      </div>

      <ExercisePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        exclude={items.map((i) => i.exerciseId)}
        onPick={(e) => setItems((xs) => [...xs, { exerciseId: e.id, sets: 3, repsMin: e.mechanic === "compound" ? 6 : 10, repsMax: e.mechanic === "compound" ? 10 : 15, restSec: e.restSec }])}
      />
    </div>
  );
}

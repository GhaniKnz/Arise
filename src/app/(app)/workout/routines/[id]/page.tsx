"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Copy, Minus, Palette, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ExerciseIcon, RoutineIcon } from "@/components/icons/ExerciseIcon";
import { ExerciseEditorSheet } from "@/components/workout/ExerciseEditorSheet";
import { ExercisePickerSheet } from "@/components/workout/ExercisePickerSheet";
import { ColorPicker, RoutineIconPicker } from "@/components/workout/IconPicker";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, NumberInput, Select, TextArea, TextInput } from "@/components/ui/Fields";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { ROUTINE_TYPE_ICON, ROUTINE_TYPE_META, TEMPLATES } from "@/lib/data/routines";
import { MUSCLE_LABEL } from "@/lib/data/exercises";
import { useExerciseLibrary, useRoutine } from "@/lib/db/hooks";
import { deleteRoutine, duplicateRoutine, saveRoutine } from "@/lib/db/repos/workout";
import type { Exercise, RoutineExercise, RoutineType } from "@/lib/db/types";
import { toast } from "@/lib/system/store";

const MAX_SETS = 30;

export default function RoutineEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const routine = useRoutine(isNew ? undefined : id);
  const { byId } = useExerciseLibrary();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoutineType>("custom");
  const [color, setColor] = useState<string | undefined>();
  const [icon, setIcon] = useState<string | undefined>();
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [picking, setPicking] = useState(false);
  const [styling, setStyling] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  if (routine && !loaded) {
    setName(routine.name);
    setType(routine.type);
    setColor(routine.color);
    setIcon(routine.icon);
    setItems(routine.exercises);
    setNotes(routine.notes ?? "");
    setLoaded(true);
  }

  if (!isNew && routine === undefined) return <PageSkeleton />;
  if (!isNew && routine === null) return <EmptyState title="Programme introuvable" action={<Button onClick={() => router.push("/workout")}>Retour</Button>} />;

  const shownColor = color ?? ROUTINE_TYPE_META[type].color;
  const shownIcon = icon ?? ROUTINE_TYPE_ICON[type];
  const totalSets = items.reduce((a, e) => a + e.sets, 0);

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
    await saveRoutine({ id: isNew ? undefined : id, name: name.trim(), type, exercises: items, notes: notes.trim() || undefined, color, icon });
    toast({ tone: "success", title: "Programme enregistré", message: name.trim() });
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
    <div className="mx-auto max-w-2xl pb-6">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/workout")}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader kicker="Programme" title={isNew ? "Nouveau programme" : "Modifier le programme"} />

      <Panel className="space-y-4 overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${shownColor} 45%, transparent)` }}>
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full opacity-40 blur-2xl" style={{ background: shownColor }} aria-hidden />
        <div className="relative flex items-end gap-3">
          <button
            type="button"
            onClick={() => setStyling(true)}
            className="group relative flex size-16 shrink-0 items-center justify-center rounded-2xl border bg-void/60 transition active:scale-95"
            style={{ borderColor: shownColor, boxShadow: `0 0 20px -4px ${shownColor}` }}
            aria-label="Changer l'icône et la couleur"
          >
            <RoutineIcon icon={shownIcon} color={shownColor} className="size-10" />
            <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border border-line-strong bg-deep text-ink-2">
              <Palette className="size-3.5" />
            </span>
          </button>
          <Field label="Nom de la séance" className="min-w-0 flex-1">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Push lourd, Dos-Biceps…" className="font-display text-lg font-semibold" />
          </Field>
        </div>
        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Catégorie">
            <Select value={type} onChange={(e) => setType(e.target.value as RoutineType)}>
              {(Object.keys(ROUTINE_TYPE_META) as RoutineType[]).map((t) => (
                <option key={t} value={t}>
                  {ROUTINE_TYPE_META[t].label}
                </option>
              ))}
            </Select>
          </Field>
          {isNew ? (
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
          ) : (
            <div className="flex items-end">
              <Button variant="secondary" block onClick={() => setStyling(true)}>
                <Palette /> Icône & couleur
              </Button>
            </div>
          )}
        </div>
        <p className="relative text-xs text-ink-3">
          {items.length} exercice{items.length > 1 ? "s" : ""} · {totalSets} série{totalSets > 1 ? "s" : ""}
        </p>
      </Panel>

      <div className="mt-4 space-y-2">
        {items.map((it, i) => {
          const ex = byId(it.exerciseId);
          return (
            <Panel key={`${it.exerciseId}-${i}`} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.03]">{ex && <ExerciseIcon exercise={ex} className="h-12 w-9" />}</span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ex && setEditing(ex)} aria-label={`Modifier l'exercice ${ex?.name ?? ""}`}>
                  <span className="flex items-center gap-1.5">
                    <span className="line-clamp-2 leading-tight font-medium text-ink">{ex?.name ?? it.exerciseId}</span>
                    <Pencil className="size-3.5 shrink-0 text-ink-3" />
                  </span>
                  <span className="block text-[11px] text-ink-3">{ex ? MUSCLE_LABEL[ex.primary] : ""}</span>
                </button>
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

              <div className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-1.5">
                <span className="pl-1.5 text-[12px] font-medium text-ink-2">Séries</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <IconButton label="Retirer une série" size="sm" disabled={it.sets <= 1} onClick={() => update(i, { sets: Math.max(1, it.sets - 1) })}>
                    <Minus />
                  </IconButton>
                  <div className="flex max-w-40 flex-wrap justify-center gap-1" aria-live="polite" aria-label={`${it.sets} séries`}>
                    {Array.from({ length: Math.min(it.sets, 12) }, (_, k) => (
                      <span key={k} className="size-2.5 rounded-sm" style={{ background: shownColor, boxShadow: `0 0 6px ${shownColor}` }} />
                    ))}
                    {it.sets > 12 && <span className="text-[11px] text-ink-3">+{it.sets - 12}</span>}
                  </div>
                  <span className="w-6 text-center font-display text-lg font-bold text-ink tabular">{it.sets}</span>
                  <IconButton label="Ajouter une série" size="sm" disabled={it.sets >= MAX_SETS} onClick={() => update(i, { sets: Math.min(MAX_SETS, it.sets + 1) })}>
                    <Plus />
                  </IconButton>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
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

      <div className="mt-4 flex flex-wrap gap-2">
        {!isNew && routine && (
          <>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Supprimer
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const copy = await duplicateRoutine(routine);
                toast({ tone: "success", title: "Programme dupliqué" });
                router.push(`/workout/routines/${copy}`);
              }}
            >
              <Copy /> Dupliquer
            </Button>
          </>
        )}
        <Button className="min-w-40 flex-1" size="lg" onClick={save}>
          <Save /> Enregistrer
        </Button>
      </div>

      <Sheet open={styling} onClose={() => setStyling(false)} title="Icône & couleur" size="lg" footer={<Button block onClick={() => setStyling(false)}>Valider</Button>}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl border bg-void/60" style={{ borderColor: shownColor, boxShadow: `0 0 20px -4px ${shownColor}` }}>
              <RoutineIcon icon={shownIcon} color={shownColor} className="size-9" />
            </span>
            <p className="min-w-0 truncate font-display text-lg font-bold text-ink">{name || "Ma séance"}</p>
          </div>
          <ColorPicker value={shownColor} onChange={setColor} />
          <RoutineIconPicker value={shownIcon} color={shownColor} onChange={setIcon} />
        </div>
      </Sheet>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer ce programme ?"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              block
              onClick={async () => {
                await deleteRoutine(id);
                router.push("/workout");
              }}
            >
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-2">Les séances déjà réalisées restent dans ton historique. Les jours du planning qui l&apos;utilisaient passent en repos.</p>
      </Sheet>

      <ExercisePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        exclude={items.map((i) => i.exerciseId)}
        onPick={(e) => setItems((xs) => [...xs, { exerciseId: e.id, sets: 3, repsMin: e.mechanic === "compound" ? 6 : 10, repsMax: e.mechanic === "compound" ? 10 : 15, restSec: e.restSec }])}
      />
      <ExerciseEditorSheet open={!!editing} onClose={() => setEditing(null)} exercise={editing ?? undefined} />
    </div>
  );
}

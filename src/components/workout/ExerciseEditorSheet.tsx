"use client";

import { ChevronDown, Lightbulb, ListOrdered, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { ExerciseIcon } from "@/components/icons/ExerciseIcon";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { suggestPoses } from "@/components/icons/PoseIcon";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Segmented, TextArea, TextInput, Toggle } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { EQUIPMENT_LABEL, EXERCISE_BY_ID, MUSCLE_GROUPS } from "@/lib/data/exercises";
import { db } from "@/lib/db";
import { useExerciseLibrary } from "@/lib/db/hooks";
import { deleteExercise, isBuiltInExercise, newExerciseId, saveExercise } from "@/lib/db/repos/workout";
import type { Equipment, Exercise, Muscle } from "@/lib/db/types";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { ExerciseIconPicker } from "./IconPicker";
import { StepsEditor } from "./StepsEditor";

const blank = (): Exercise => ({
  id: newExerciseId(),
  name: "",
  primary: "chest",
  secondary: [],
  equipment: "dumbbell",
  level: "intermediate",
  mechanic: "compound",
  weighted: true,
  instructions: [],
  restSec: 90,
});

interface Props {
  open: boolean;
  onClose: () => void;
  /** Exercise to edit; omit to create a new one. */
  exercise?: Exercise;
  onSaved?: (e: Exercise) => void;
  /** Scrolls to a section when the sheet opens. */
  focus?: "instructions";
}

const cleanList = (xs: string[] | undefined) => (xs ?? []).map((s) => s.trim()).filter(Boolean);
const sameList = (a: string[] | undefined, b: string[] | undefined) => cleanList(a).join("\n") === cleanList(b).join("\n");

/** Create or personalize an exercise: name, pictogram, muscles, equipment, how-to steps, tips, rest, notes. */
export function ExerciseEditorSheet({ open, onClose, exercise, onSaved, focus }: Props) {
  const { customized } = useExerciseLibrary();
  const [draft, setDraft] = useState<Exercise>(blank);
  const [busy, setBusy] = useState(false);
  /** A new exercise follows the name's suggested movement until an icon is picked by hand. */
  const [iconTouched, setIconTouched] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const howToRef = useRef<HTMLDivElement>(null);
  useResetOnOpen(
    open,
    () => {
      setDraft(exercise ? { ...exercise, secondary: [...exercise.secondary], instructions: [...exercise.instructions], tips: exercise.tips ? [...exercise.tips] : undefined } : blank());
      setIconTouched(!!exercise);
      setShowIcons(!exercise);
    },
    exercise?.id,
  );

  useEffect(() => {
    if (!open || focus !== "instructions") return;
    const t = setTimeout(() => howToRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    return () => clearTimeout(t);
  }, [open, focus]);

  const isNew = !exercise;
  const builtIn = !!exercise && isBuiltInExercise(exercise.id);
  const original = builtIn ? EXERCISE_BY_ID.get(exercise.id) : undefined;
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setName = (name: string) =>
    setDraft((d) => {
      if (iconTouched) return { ...d, name };
      const pose = suggestPoses(name)[0];
      return { ...d, name, icon: pose ? `p:${pose}` : undefined };
    });
  const pickIcon = (icon: string | undefined) => {
    setIconTouched(true);
    set("icon", icon);
  };
  const toggleSecondary = (m: Muscle) =>
    setDraft((d) => ({ ...d, secondary: d.secondary.includes(m) ? d.secondary.filter((x) => x !== m) : [...d.secondary, m].filter((x) => x !== d.primary) }));

  const save = async () => {
    const name = draft.name.trim();
    if (!name) {
      toast({ tone: "error", title: "Donne un nom à l'exercice" });
      return;
    }
    setBusy(true);
    try {
      const tips = cleanList(draft.tips);
      const row: Exercise = {
        ...draft,
        name,
        notes: draft.notes?.trim() || undefined,
        secondary: draft.secondary.filter((m) => m !== draft.primary),
        instructions: cleanList(draft.instructions),
        tips: tips.length ? tips : undefined,
      };
      await saveExercise(row);
      toast({ tone: "success", title: isNew ? "Exercice créé" : "Exercice mis à jour", message: name });
      onSaved?.(row);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const resetOrDelete = async () => {
    if (!exercise) return;
    if (!builtIn) {
      const used = await db.sets.where("exerciseId").equals(exercise.id).count();
      if (used > 0) {
        toast({ tone: "warn", title: "Exercice utilisé dans ton historique", message: `${used} série(s) enregistrée(s) : renomme-le plutôt que de le supprimer.` });
        return;
      }
    }
    await deleteExercise(exercise.id);
    toast({ tone: "success", title: builtIn ? "Version d'origine rétablie" : "Exercice supprimé" });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isNew ? "Nouvel exercice" : "Modifier l'exercice"}
      description={builtIn ? "Ta version remplace celle de la bibliothèque ; ton historique et tes records sont conservés." : undefined}
      size="lg"
      tall
      footer={
        <div className="flex gap-2">
          {exercise && (builtIn ? customized(exercise.id) : true) && (
            <Button variant={builtIn ? "ghost" : "danger"} onClick={resetOrDelete} disabled={busy}>
              {builtIn ? <RotateCcw /> : <Trash2 />} {builtIn ? "Original" : "Supprimer"}
            </Button>
          )}
          <Button block onClick={save} disabled={busy || !draft.name.trim()}>
            <Save /> Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-arise/30 bg-arise/[0.06] p-3">
          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-void/50">
            <ExerciseIcon exercise={draft} className="h-14 w-10" />
          </span>
          <div className="min-w-0 flex-1">
            <Field label="Nom" htmlFor="exercise-name">
              <TextInput id="exercise-name" value={draft.name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Développé Hammer Strength" />
            </Field>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowIcons((v) => !v)}
            aria-expanded={showIcons}
            className="mb-2 flex w-full items-center gap-2 text-left text-[13px] font-medium text-ink-2"
          >
            Icône
            {isNew && !iconTouched && draft.icon && <span className="rounded-full bg-arise/15 px-2 py-0.5 text-[10px] font-semibold text-arise">choisie d&apos;après le nom</span>}
            <span className="ml-auto flex items-center gap-1 text-xs text-arise">
              {showIcons ? "Masquer" : "Changer l'icône"} <ChevronDown className={cn("size-4 transition", showIcons && "rotate-180")} />
            </span>
          </button>
          {showIcons && <ExerciseIconPicker value={draft.icon} name={draft.name} primary={draft.primary} secondary={draft.secondary} onChange={pickIcon} />}
        </div>

        <div ref={howToRef} className="scroll-mt-4 space-y-4 rounded-2xl border border-line bg-white/[0.015] p-3">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[13px] font-medium text-ink">
              <ListOrdered className="size-4 text-arise" /> Comment le faire
            </p>
            <p className="mb-2.5 text-xs text-ink-3">Une étape par ligne, dans l&apos;ordre. Colle un texte à plusieurs lignes : chaque ligne devient une étape.</p>
            <StepsEditor
              items={draft.instructions}
              onChange={(v) => set("instructions", v)}
              addLabel="Ajouter une étape"
              itemLabel="Étape"
              placeholder="Ex. Omoplates serrées, pieds à plat au sol"
            />
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink">
              <Lightbulb className="size-4 text-warn" /> Conseils
            </p>
            <StepsEditor
              items={draft.tips ?? []}
              onChange={(v) => set("tips", v)}
              numbered={false}
              marker={<Lightbulb className="size-3.5" />}
              addLabel="Ajouter un conseil"
              itemLabel="Conseil"
              placeholder="Ex. Descends en 2 secondes, remonte explosif"
            />
          </div>
          {original && (!sameList(draft.instructions, original.instructions) || !sameList(draft.tips, original.tips)) && (
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, instructions: [...original.instructions], tips: original.tips ? [...original.tips] : undefined }))}
              className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> Rétablir les instructions d&apos;origine
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-2">Muscle principal</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={draft.primary === m.id}
                onClick={() => setDraft((d) => ({ ...d, primary: m.id, secondary: d.secondary.filter((x) => x !== m.id) }))}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5 text-[10px] leading-tight transition active:scale-95",
                  draft.primary === m.id ? "border-arise/70 bg-arise/15 text-ink shadow-[0_0_14px_-2px_rgb(77_163_255/0.6)]" : "border-line bg-white/[0.02] text-ink-3",
                )}
              >
                <MuscleIcon primary={m.id} className="h-8 w-5" />
                <span className="w-full truncate text-center">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-2">Muscles secondaires</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.filter((m) => m.id !== draft.primary).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={draft.secondary.includes(m.id)}
                onClick={() => toggleSecondary(m.id)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12px] transition",
                  draft.secondary.includes(m.id) ? "border-violet/60 bg-violet/15 text-ink" : "border-line bg-deep/60 text-ink-3",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-2">Équipement</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((eq) => (
              <button
                key={eq}
                type="button"
                aria-pressed={draft.equipment === eq}
                onClick={() => setDraft((d) => ({ ...d, equipment: eq, weighted: eq === "bodyweight" ? false : d.equipment === "bodyweight" ? true : d.weighted }))}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[12px] transition active:scale-95",
                  draft.equipment === eq ? "border-arise/70 bg-arise/15 text-ink" : "border-line bg-white/[0.02] text-ink-3",
                )}
              >
                <EquipmentIcon equipment={eq} className="size-5 text-arise" />
                <span className="truncate">{EQUIPMENT_LABEL[eq]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type de mouvement">
            <Segmented
              value={draft.mechanic}
              onChange={(v) => set("mechanic", v)}
              ariaLabel="Type de mouvement"
              options={[
                { value: "compound", label: "Poly-articulaire" },
                { value: "isolation", label: "Isolation" },
              ]}
            />
          </Field>
          <Field label="Repos par défaut">
            <NumberInput value={draft.restSec} onChange={(v) => set("restSec", Math.max(15, Math.round(v ?? 90)))} min={15} max={600} step={15} unit="s" decimals={0} />
          </Field>
        </div>

        <Toggle checked={draft.weighted} onChange={(v) => set("weighted", v)} label="Charge externe" description="Désactive pour un exercice au poids du corps (tu pourras quand même ajouter du lest)" />

        <Field label="Notes perso">
          <TextArea value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Réglage du siège, prise, tempo…" />
        </Field>

        {builtIn && EXERCISE_BY_ID.get(draft.id)?.name !== draft.name && <p className="text-[11px] text-ink-3">Nom d&apos;origine : {EXERCISE_BY_ID.get(draft.id)?.name}</p>}
      </div>
    </Sheet>
  );
}

"use client";

import { Check, Wand2 } from "lucide-react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { GLYPHS, GlyphIcon } from "@/components/icons/GlyphIcon";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { POSES, PoseIcon, suggestPoses } from "@/components/icons/PoseIcon";
import { EQUIPMENT_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL } from "@/lib/data/exercises";
import { ROUTINE_COLORS } from "@/lib/data/routines";
import type { Equipment, Muscle } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";

const SILHOUETTES: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps", "abs", "quads", "hamstrings", "glutes", "calves"];

function Tile({ selected, onClick, label, children, caption }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode; caption?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 rounded-xl border transition active:scale-95",
        caption ? "px-0.5 pt-1.5 pb-1" : "aspect-square",
        selected ? "border-arise/70 bg-arise/15 shadow-[0_0_16px_-2px_rgb(77_163_255/0.6)]" : "border-line bg-white/[0.02] hover:border-line-strong",
      )}
    >
      {children}
      {caption && <span className="w-full truncate text-center text-[9px] leading-tight text-ink-3">{caption}</span>}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-arise text-void">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Group({ title, hint, children, icon }: { title: string; hint?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
        {icon}
        {title}
        {hint && <span className="font-normal tracking-normal normal-case">· {hint}</span>}
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">{children}</div>
    </div>
  );
}

function PoseTiles({ keys, value, onChange, color }: { keys: string[]; value: string | undefined; onChange: (v: string) => void; color?: string }) {
  return keys.map((k) => (
    <Tile key={k} selected={value === `p:${k}`} onClick={() => onChange(`p:${k}`)} label={POSES[k].label} caption={POSES[k].short ?? POSES[k].label}>
      <span className={cn("flex", !color && "text-arise")} style={color ? { color } : undefined}>
        <PoseIcon pose={k} className="size-9" />
      </span>
    </Tile>
  ));
}

/** Pictogram picker for programs: movements, muscle silhouettes or glyphs. */
export function RoutineIconPicker({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <Group title="Mouvements">
        <PoseTiles keys={Object.keys(POSES)} value={value} onChange={onChange} color={color} />
      </Group>
      <Group title="Silhouettes">
        {SILHOUETTES.map((m) => (
          <Tile key={m} selected={value === `m:${m}`} onClick={() => onChange(`m:${m}`)} label={MUSCLE_LABEL[m]}>
            <MuscleIcon primary={m} className="h-11 w-7" />
          </Tile>
        ))}
      </Group>
      <Group title="Pictos">
        {Object.entries(GLYPHS).map(([k, g]) => (
          <Tile key={k} selected={value === `g:${k}`} onClick={() => onChange(`g:${k}`)} label={g.label}>
            <span style={{ color }} className="[&>svg]:size-5">
              <GlyphIcon name={k} />
            </span>
          </Tile>
        ))}
      </Group>
    </div>
  );
}

/** Pictogram picker for exercises: movements, silhouettes, equipment or glyphs. */
export function ExerciseIconPicker({ value, name = "", primary, secondary, onChange }: { value: string | undefined; name?: string; primary: Muscle; secondary: Muscle[]; onChange: (v: string | undefined) => void }) {
  const suggested = suggestPoses(name);
  const views: [string | undefined, string, "auto" | "front" | "back" | "both"][] = [
    [undefined, "Automatique", "auto"],
    ["view:front", "Vue de face", "front"],
    ["view:back", "Vue de dos", "back"],
    ["view:both", "Face et dos", "both"],
  ];
  return (
    <div className="space-y-3">
      {suggested.length > 0 && (
        <Group title="Suggérées" hint={`d'après « ${name.trim()} »`} icon={<Wand2 className="size-3.5 text-arise" />}>
          <PoseTiles keys={suggested} value={value} onChange={onChange} />
        </Group>
      )}
      <Group title="Mouvements">
        <PoseTiles keys={Object.keys(POSES)} value={value} onChange={onChange} />
      </Group>
      <Group title="Silhouette des muscles ciblés" hint="suit les muscles choisis plus bas">
        {views.map(([v, label, view]) => (
          <Tile key={label} selected={value === v} onClick={() => onChange(v)} label={label} caption={label}>
            <MuscleIcon primary={primary} secondary={secondary} view={view} className={view === "both" ? "h-9 w-11" : "h-9 w-6"} />
          </Tile>
        ))}
      </Group>
      <Group title="Silhouette par muscle">
        {MUSCLE_GROUPS.map((m) => (
          <Tile key={m.id} selected={value === `m:${m.id}`} onClick={() => onChange(`m:${m.id}`)} label={m.label} caption={m.label}>
            <MuscleIcon primary={m.id} className="h-9 w-6" />
          </Tile>
        ))}
      </Group>
      <Group title="Équipement">
        {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((eq) => (
          <Tile key={eq} selected={value === `eq:${eq}`} onClick={() => onChange(`eq:${eq}`)} label={EQUIPMENT_LABEL[eq]}>
            <span className="text-arise [&>svg]:size-6">
              <EquipmentIcon equipment={eq} />
            </span>
          </Tile>
        ))}
      </Group>
      <Group title="Pictos">
        {Object.entries(GLYPHS).map(([k, g]) => (
          <Tile key={k} selected={value === `g:${k}`} onClick={() => onChange(`g:${k}`)} label={g.label}>
            <span className="text-arise [&>svg]:size-5">
              <GlyphIcon name={k} />
            </span>
          </Tile>
        ))}
      </Group>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleur">
      {ROUTINE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c.toLowerCase()}
          aria-label={`Couleur ${c}`}
          onClick={() => onChange(c)}
          className={cn("size-8 rounded-full border-2 transition active:scale-90", value.toLowerCase() === c.toLowerCase() ? "scale-110 border-white" : "border-transparent")}
          style={{ background: c, boxShadow: value.toLowerCase() === c.toLowerCase() ? `0 0 14px ${c}` : undefined }}
        />
      ))}
    </div>
  );
}

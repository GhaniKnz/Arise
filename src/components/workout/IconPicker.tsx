"use client";

import { Check } from "lucide-react";
import { EquipmentIcon } from "@/components/icons/EquipmentIcon";
import { GLYPHS, GlyphIcon } from "@/components/icons/GlyphIcon";
import { MuscleIcon } from "@/components/icons/MuscleIcon";
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from "@/lib/data/exercises";
import { ROUTINE_COLORS } from "@/lib/data/routines";
import type { Equipment, Muscle } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";

const SILHOUETTES: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps", "abs", "quads", "hamstrings", "glutes", "calves"];

function Tile({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-xl border transition active:scale-95",
        selected ? "border-arise/70 bg-arise/15 shadow-[0_0_16px_-2px_rgb(77_163_255/0.6)]" : "border-line bg-white/[0.02] hover:border-line-strong",
      )}
    >
      {children}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-arise text-void">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">{title}</p>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">{children}</div>
    </div>
  );
}

/** Pictogram picker for programs: muscle silhouettes or glyphs. */
export function RoutineIconPicker({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
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

/** Pictogram picker for exercises: silhouette views, equipment or glyphs. */
export function ExerciseIconPicker({ value, primary, secondary, onChange }: { value: string | undefined; primary: Muscle; secondary: Muscle[]; onChange: (v: string | undefined) => void }) {
  const views: [string | undefined, string, "auto" | "front" | "back" | "both"][] = [
    [undefined, "Silhouette automatique", "auto"],
    ["view:front", "Vue de face", "front"],
    ["view:back", "Vue de dos", "back"],
    ["view:both", "Face et dos", "both"],
  ];
  return (
    <div className="space-y-3">
      <Group title="Silhouette (muscles ciblés)">
        {views.map(([v, label, view]) => (
          <Tile key={label} selected={value === v} onClick={() => onChange(v)} label={label}>
            <MuscleIcon primary={primary} secondary={secondary} view={view} className={view === "both" ? "h-10 w-12" : "h-11 w-7"} />
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

"use client";

import { CalendarRange, Check } from "lucide-react";
import { useState } from "react";
import { RoutineIcon } from "@/components/icons/ExerciseIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ROUTINE_TYPE_ICON, ROUTINE_TYPE_META, SPLIT_PRESETS, TEMPLATES } from "@/lib/data/routines";
import { applySplitPreset } from "@/lib/db/repos/workout";
import { toast } from "@/lib/system/store";
import { WEEKDAYS_SHORT } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/** Pick a ready-made weekly split; creates the missing programs and fills the planning. */
export function SplitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await applySplitPreset(selected);
      const preset = SPLIT_PRESETS.find((p) => p.key === selected)!;
      toast({ tone: "success", title: `Planning : ${preset.label}`, message: res?.created ? `${res.created} programme(s) créé(s), renomme-les à ta guise.` : "Tes programmes existants ont été réutilisés." });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Choisir un split"
      description="Remplit ton planning de la semaine. Tu pourras ensuite renommer et modifier chaque séance."
      size="lg"
      tall
      footer={
        <Button block size="lg" onClick={apply} disabled={!selected || busy}>
          <CalendarRange /> Appliquer
        </Button>
      }
    >
      <ul className="space-y-2">
        {SPLIT_PRESETS.map((p) => {
          const active = selected === p.key;
          return (
            <li key={p.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(p.key)}
                className={cn(
                  "w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  active ? "border-arise/70 bg-arise/10 shadow-[0_0_24px_-8px_rgb(77_163_255/0.7)]" : "border-line bg-white/[0.02] hover:border-line-strong",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-display font-bold text-ink">{p.label}</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-ink-3">{p.days} j/sem.</span>
                  {active && <Check className="ml-auto size-4 text-arise" />}
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">{p.description}</span>
                <span className="mt-2.5 grid grid-cols-7 gap-1" aria-hidden>
                  {p.schedule.map((k, i) => {
                    const tpl = k ? TEMPLATES[k] : null;
                    const color = tpl ? ROUTINE_TYPE_META[tpl.type].color : undefined;
                    return (
                      <span key={i} className="flex flex-col items-center gap-1 rounded-lg border border-line bg-void/40 py-1.5">
                        <span className="text-[9px] font-semibold text-ink-3">{WEEKDAYS_SHORT[i]}</span>
                        {tpl && color ? <RoutineIcon icon={ROUTINE_TYPE_ICON[tpl.type]} color={color} className="size-5" /> : <span className="size-5 text-center text-[10px] leading-5 text-ink-3">—</span>}
                        <span className="w-full truncate px-0.5 text-center text-[9px]" style={{ color: color ?? "var(--color-ink-3)" }}>
                          {tpl ? tpl.name : "Repos"}
                        </span>
                      </span>
                    );
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

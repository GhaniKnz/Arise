import type { Equipment, Exercise, Muscle } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";
import { EquipmentIcon } from "./EquipmentIcon";
import { GlyphIcon } from "./GlyphIcon";
import { MuscleIcon } from "./MuscleIcon";
import { PoseIcon } from "./PoseIcon";

type IconSource = Pick<Exercise, "primary" | "secondary" | "icon">;

/**
 * An exercise's pictogram: the muscle silhouette by default, or the
 * movement/muscle/equipment/glyph the user picked. Size it like MuscleIcon (e.g. `h-12 w-9`).
 */
export function ExerciseIcon({ exercise, className }: { exercise: IconSource; className?: string }) {
  const icon = exercise.icon;
  if (!icon || icon.startsWith("view:")) {
    const view = icon ? (icon.slice(5) as "front" | "back" | "both") : "auto";
    return <MuscleIcon primary={exercise.primary} secondary={exercise.secondary} view={view} className={className} />;
  }
  if (icon.startsWith("m:")) return <MuscleIcon primary={icon.slice(2) as Muscle} className={className} />;
  const pose = icon.startsWith("p:");
  return (
    <span className={cn("flex shrink-0 items-center justify-center text-arise drop-shadow-[0_0_6px_rgb(77_163_255/0.55)]", pose ? "[&>svg]:size-full" : "[&>svg]:size-[78%]", className)} aria-hidden>
      {pose ? <PoseIcon pose={icon.slice(2)} /> : icon.startsWith("eq:") ? <EquipmentIcon equipment={icon.slice(3) as Equipment} /> : <GlyphIcon name={icon.slice(2)} strokeWidth={1.8} />}
    </span>
  );
}

/** A program's pictogram: `m:<muscle>` silhouette, `p:<movement>` or `g:<glyph>`, tinted with its color. */
export function RoutineIcon({ icon, color, className }: { icon: string; color: string; className?: string }) {
  if (icon.startsWith("m:")) return <MuscleIcon primary={icon.slice(2) as Muscle} className={className} />;
  return (
    <span className={cn("flex shrink-0 items-center justify-center [&>svg]:size-full", className)} style={{ color, filter: `drop-shadow(0 0 5px ${color})` }} aria-hidden>
      {icon.startsWith("p:") ? <PoseIcon pose={icon.slice(2)} /> : <GlyphIcon name={icon.slice(2)} strokeWidth={2} />}
    </span>
  );
}

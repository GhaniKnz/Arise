"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { POSE_LABEL } from "@/components/quick/PhotoSheet";
import { Button } from "@/components/ui/Button";
import { Field, Segmented, TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { deletePhoto, updatePhoto } from "@/lib/db/repos/body";
import type { Pose, ProgressPhoto } from "@/lib/db/types";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { toast } from "@/lib/system/store";
import { formatDayLong, todayKey } from "@/lib/utils/date";
import { fmtDec } from "@/lib/utils/format";
import { PhotoImage } from "./PhotoCompare";

interface Props {
  photo: ProgressPhoto | null;
  role?: "before" | "after";
  onClose: () => void;
  onSetRole: (role: "before" | "after") => void;
}

/** Full-size photo with its details: load it into the before/after viewer, fix its date or pose, delete it. */
export function PhotoViewerSheet({ photo, role, onClose, onSetRole }: Props) {
  const [date, setDate] = useState("");
  const [pose, setPose] = useState<Pose>("front");
  const [confirming, setConfirming] = useState(false);
  useResetOnOpen(!!photo, () => {
    setDate(photo?.date ?? "");
    setPose(photo?.pose ?? "front");
    setConfirming(false);
  }, photo?.id);
  if (!photo) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const dirty = date !== photo.date || pose !== photo.pose;
  const facts = [photo.weightKg ? `${fmtDec(photo.weightKg)} kg` : null, photo.waistCm ? `taille ${fmtDec(photo.waistCm)} cm` : null, photo.bodyFatPct ? `${fmtDec(photo.bodyFatPct)} % MG` : null].filter(Boolean).join(" · ");

  return (
    <Sheet open onClose={onClose} title={<span className="first-letter:uppercase">{formatDayLong(photo.date)}</span>} description={[POSE_LABEL[photo.pose], facts].filter(Boolean).join(" · ")} size="lg">
      <div className="space-y-4">
        <div className="relative mx-auto aspect-[3/4] max-h-[55dvh] overflow-hidden rounded-2xl border border-line bg-black">
          <PhotoImage photo={photo} full className="size-full object-contain" />
          {role && <span className="absolute top-2 left-2 rounded-lg bg-arise px-2 py-1 text-xs font-bold text-void">{role === "before" ? "AVANT" : "APRÈS"}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={role === "before" ? "primary" : "secondary"} onClick={() => onSetRole("before")}>
            {role === "before" && <Check />} Mettre en AVANT
          </Button>
          <Button variant={role === "after" ? "primary" : "secondary"} onClick={() => onSetRole("after")}>
            {role === "after" && <Check />} Mettre en APRÈS
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-white/[0.02] p-3 sm:grid-cols-2">
          <Field label="Date de la photo" htmlFor="photo-date">
            <TextInput id="photo-date" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Pose">
            <Segmented value={pose} onChange={setPose} options={(["front", "side", "back"] as Pose[]).map((p) => ({ value: p, label: POSE_LABEL[p] }))} ariaLabel="Pose" />
          </Field>
          {dirty && (
            <Button
              size="sm"
              className="sm:col-span-2"
              disabled={!date}
              onClick={async () => {
                await updatePhoto(photo.id, { date, pose });
                toast({ tone: "success", title: "Photo mise à jour" });
              }}
            >
              Enregistrer la date et la pose
            </Button>
          )}
        </div>

        <Button
          variant={confirming ? "danger" : "ghost"}
          size="sm"
          block
          onClick={async () => {
            if (!confirming) return setConfirming(true);
            await deletePhoto(photo.id);
            toast({ tone: "system", title: "Photo supprimée" });
            onClose();
          }}
        >
          <Trash2 /> {confirming ? "Confirmer la suppression" : "Supprimer la photo"}
        </Button>
      </div>
    </Sheet>
  );
}

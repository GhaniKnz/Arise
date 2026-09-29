"use client";

import { Camera, ImageUp } from "lucide-react";
import { useRef, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { addPhoto } from "@/lib/db/repos/body";
import type { Pose } from "@/lib/db/types";
import { useBlobUrl } from "@/lib/hooks/useBlobUrl";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { toast } from "@/lib/system/store";
import { closeSheet } from "@/lib/system/ui";
import { relativeDayLabel, type DayKey } from "@/lib/utils/date";

export const POSE_LABEL: Record<Pose, string> = { front: "Face", side: "Profil", back: "Dos" };

export function PhotoSheet({ open, date }: { open: boolean; date: DayKey }) {
  const { raw, currentWeight } = useGame();
  const [pose, setPose] = useState<Pose>("front");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const preview = useBlobUrl(file);
  useResetOnOpen(open, () => setFile(null));

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const m = raw.metrics.filter((x) => x.date <= date);
      await addPhoto({
        date,
        pose,
        file,
        weightKg: m.filter((x) => x.weightKg != null).at(-1)?.weightKg ?? currentWeight ?? undefined,
        waistCm: m.filter((x) => x.waistCm != null).at(-1)?.waistCm,
        bodyFatPct: m.filter((x) => x.bodyFatPct != null).at(-1)?.bodyFatPct,
      });
      toast({ tone: "success", title: "Photo enregistrée", message: `${POSE_LABEL[pose]} · ${relativeDayLabel(date)}` });
      closeSheet();
    } catch (e) {
      toast({ tone: "error", title: "Impossible d'enregistrer la photo", message: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      title="Photo de progression"
      description={relativeDayLabel(date)}
      footer={
        <Button block size="lg" onClick={save} disabled={!file || saving}>
          Enregistrer la photo
        </Button>
      }
    >
      <div className="space-y-4">
        <Segmented value={pose} onChange={setPose} options={(["front", "side", "back"] as Pose[]).map((p) => ({ value: p, label: POSE_LABEL[p] }))} ariaLabel="Pose" />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Aperçu de la photo" className="mx-auto max-h-80 rounded-2xl border border-line object-contain" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" className="h-28 flex-col" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-6!" /> Prendre
            </Button>
            <Button variant="secondary" size="lg" className="h-28 flex-col" onClick={() => galleryRef.current?.click()}>
              <ImageUp className="size-6!" /> Importer
            </Button>
          </div>
        )}
        {preview && (
          <Button variant="ghost" size="sm" block onClick={() => setFile(null)}>
            Changer de photo
          </Button>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Notice>Tes photos restent privées sur cet appareil (compressées). Même lumière, même heure, même pose : la comparaison sera fiable.</Notice>
      </div>
    </Sheet>
  );
}

"use client";

import { Camera, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { POSE_LABEL } from "@/components/quick/PhotoSheet";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Fields";
import { EmptyState, Notice, PageSkeleton } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { usePhotos } from "@/lib/db/hooks";
import { deletePhoto } from "@/lib/db/repos/body";
import type { Pose } from "@/lib/db/types";
import { openSheet } from "@/lib/system/ui";
import { PhotoCompare, PhotoThumb } from "./PhotoCompare";

export function PhotosPanel() {
  const photos = usePhotos();
  const [pose, setPose] = useState<Pose>("front");
  const list = useMemo(() => (photos ?? []).filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date)), [photos, pose]);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  useEffect(() => {
    setBeforeId(list[0]?.id ?? null);
    setAfterId(list.at(-1)?.id ?? null);
  }, [list]);

  if (photos === undefined) return <PageSkeleton />;
  const before = list.find((p) => p.id === beforeId);
  const after = list.find((p) => p.id === afterId);

  const pick = (id: string) => {
    // Tap = choose "after"; tap on the current "after" = make it "before".
    if (id === afterId) setBeforeId(id);
    else setAfterId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={pose} onChange={setPose} options={(["front", "side", "back"] as Pose[]).map((p) => ({ value: p, label: POSE_LABEL[p] }))} ariaLabel="Pose" className="flex-1" />
        <Button onClick={() => openSheet("photo")}>
          <Camera /> Photo
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Camera />} title={`Aucune photo « ${POSE_LABEL[pose]} »`} description="Une photo toutes les 2–4 semaines, même lumière et même pose : c'est le meilleur juge de ta sèche." action={<Button size="sm" onClick={() => openSheet("photo")}>Prendre la première</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <Panel>
            <PanelHeader title="Avant / Après" />
            {before && after && before.id !== after.id ? (
              <PhotoCompare before={before} after={after} />
            ) : (
              <Notice>Ajoute une deuxième photo pour activer le comparateur.</Notice>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Galerie" subtitle="Touche une photo pour la comparer" />
            <ul className="grid grid-cols-3 gap-2">
              {list.map((p) => (
                <li key={p.id} className="relative">
                  <PhotoThumb photo={p} selected={p.id === afterId || p.id === beforeId} badge={p.id === beforeId ? "AVANT" : p.id === afterId ? "APRÈS" : undefined} onClick={() => pick(p.id)} />
                </li>
              ))}
            </ul>
            {after && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => deletePhoto(after.id)}>
                <Trash2 /> Supprimer la photo « après »
              </Button>
            )}
          </Panel>
        </div>
      )}
      <Notice>Tes photos sont stockées uniquement sur cet appareil{process.env.NEXT_PUBLIC_SUPABASE_URL ? " (et dans ton espace cloud privé si la synchronisation est active)" : ""}.</Notice>
    </div>
  );
}

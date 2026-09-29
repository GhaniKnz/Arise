"use client";

import { Database, Download, FileSpreadsheet, ImageOff, RotateCcw, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented, Toggle } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { deleteHistory, download, exportCsv, exportData, importData } from "@/lib/db/backup";
import { deleteAllPhotos } from "@/lib/db/repos/body";
import { clearAllData, seedDemo } from "@/lib/db/seed";
import { toast } from "@/lib/system/store";
import { todayKey } from "@/lib/utils/date";

type Danger = "photos" | "history" | "all" | "demo" | null;

export function DataSection() {
  const router = useRouter();
  const [withPhotos, setWithPhotos] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [danger, setDanger] = useState<Danger>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    setBusy(true);
    try {
      download(await exportData(withPhotos), `arise-sauvegarde-${todayKey()}.json`);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    try {
      const { rows } = await importData(file, mode);
      toast({ tone: "success", title: "Import terminé", message: `${rows} éléments restaurés` });
    } catch (e) {
      toast({ tone: "error", title: "Import impossible", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      if (danger === "photos") await deleteAllPhotos();
      if (danger === "history") await deleteHistory();
      if (danger === "demo") {
        await seedDemo();
        router.push("/");
      }
      if (danger === "all") {
        await clearAllData();
        router.replace("/onboarding");
      }
      toast({ tone: "success", title: "C'est fait" });
      setDanger(null);
    } finally {
      setBusy(false);
    }
  };

  const DANGER_TEXT: Record<Exclude<Danger, null>, [string, string]> = {
    photos: ["Supprimer toutes les photos ?", "Les photos de progression seront définitivement effacées de cet appareil."],
    history: ["Supprimer tout l'historique ?", "Repas, séances, pesées, pas, sommeil, photos et rapports seront effacés. Ton profil, tes programmes et tes aliments personnalisés sont conservés."],
    demo: ["Charger les données de démo ?", "Toutes tes données actuelles seront remplacées par 45 jours de démonstration."],
    all: ["Tout réinitialiser ?", "Toutes les données et le profil seront effacés. Tu reviendras à l'écran d'accueil."],
  };

  return (
    <Panel id="data">
      <PanelHeader title="Mes données" icon={<Database />} subtitle="Stockées localement dans ce navigateur (IndexedDB)" />
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <p className="text-sm font-medium text-ink">Sauvegarde complète (JSON)</p>
          <Toggle checked={withPhotos} onChange={setWithPhotos} label="Inclure les photos" description="Fichier plus lourd" />
          <Button size="sm" onClick={doExport} disabled={busy}>
            <Download /> Exporter
          </Button>
        </div>
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <p className="mb-2 text-sm font-medium text-ink">Restaurer une sauvegarde</p>
          <Segmented size="sm" value={mode} onChange={setMode} ariaLabel="Mode d'import" options={[{ value: "merge", label: "Fusionner" }, { value: "replace", label: "Remplacer tout" }]} />
          <Button className="mt-2" size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload /> Choisir un fichier
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="rounded-xl border border-line bg-white/[0.02] p-3">
          <p className="mb-2 text-sm font-medium text-ink">Exports CSV (tableur)</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["food", "Repas"],
                ["body", "Poids & mesures"],
                ["sets", "Séries"],
                ["daily", "Pas, eau, sommeil"],
              ] as const
            ).map(([k, l]) => (
              <Button key={k} size="sm" variant="ghost" onClick={async () => download(await exportCsv(k), `arise-${k}-${todayKey()}.csv`)}>
                <FileSpreadsheet /> {l}
              </Button>
            ))}
          </div>
        </div>
        <Notice>Sans synchronisation cloud, pense à exporter régulièrement : effacer les données du navigateur supprime aussi ARISE.</Notice>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setDanger("demo")}>
            <Sparkles /> Données de démo
          </Button>
          <Button variant="secondary" onClick={() => setDanger("photos")}>
            <ImageOff /> Supprimer les photos
          </Button>
          <Button variant="danger" onClick={() => setDanger("history")}>
            <Trash2 /> Supprimer l&apos;historique
          </Button>
          <Button variant="danger" onClick={() => setDanger("all")}>
            <RotateCcw /> Tout réinitialiser
          </Button>
        </div>
      </div>
      <Sheet
        open={!!danger}
        onClose={() => setDanger(null)}
        title={danger ? DANGER_TEXT[danger][0] : ""}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => setDanger(null)}>
              Annuler
            </Button>
            <Button variant={danger === "demo" ? "primary" : "danger"} block onClick={confirm} disabled={busy}>
              Confirmer
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-2">{danger ? DANGER_TEXT[danger][1] : ""}</p>
      </Sheet>
    </Panel>
  );
}

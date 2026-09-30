"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, ImageUp, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Fields";
import { ErrorBox } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { ApiError } from "@/lib/api";
import { photoPart, type DishPart } from "@/lib/db/repos/dishDraft";
import { analysisToIngredients, analyzeMealPhoto, photoThumb } from "@/lib/food/mealPhoto";
import { useBlobUrl } from "@/lib/hooks/useBlobUrl";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";
import { cue } from "@/lib/system/feedback";

/** Photo → AI analysis → ingredients added to the dish as one removable group. */
export function DishPhotoSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (part: DishPart) => void }) {
  const [file, setFile] = useState<Blob | null>(null);
  const preview = useBlobUrl(file);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useResetOnOpen(open, () => {
    setFile(null);
    setNote("");
    setError(null);
    setLoading(false);
  });

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const [analysis, thumb] = await Promise.all([analyzeMealPhoto(file, note), photoThumb(file).catch(() => undefined)]);
      const items = analysisToIngredients(analysis);
      if (!analysis.is_food || !items.length) {
        setError("Aucun aliment détecté sur cette photo. Essaie avec l'assiette bien visible, vue de dessus.");
        return;
      }
      cue("quest");
      onAdd(photoPart(analysis.meal_name, items, thumb));
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Analyse impossible.");
    } finally {
      setLoading(false);
    }
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setError(null);
  };

  return (
    <Sheet open={open} onClose={loading ? () => undefined : onClose} size="md" title="Photo IA" description="L'IA estime les aliments et les portions de la photo, tu corriges ensuite">
      <div className="space-y-4">
        {preview ? (
          <div className="relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Photo du plat" className="max-h-[45dvh] w-full object-cover" />
            <AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-void/55 backdrop-blur-[2px]">
                  <motion.div
                    className="absolute inset-x-0 h-0.5 bg-arise shadow-[0_0_24px_6px_rgb(77_163_255/0.7)]"
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <Sparkles className="size-8 animate-pulse text-arise" />
                  <p className="label mt-3 text-arise">Analyse du Système…</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!loading && (
              <button type="button" onClick={() => setFile(null)} className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-void/70 text-ink" aria-label="Changer de photo">
                <X className="size-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" className="h-32 flex-col" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-7!" /> Prendre une photo
            </Button>
            <Button variant="secondary" size="lg" className="h-32 flex-col" onClick={() => galleryRef.current?.click()}>
              <ImageUp className="size-7!" /> Importer
            </Button>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        {preview && (
          <>
            <Field label="Précision (optionnel)" hint="Ex. « cuit à l'huile d'olive », « 200 g de pâtes crues »">
              <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ingrédients cachés, quantité connue…" disabled={loading} />
            </Field>
            <Button block size="lg" onClick={analyze} disabled={loading}>
              <Sparkles /> Analyser et ajouter au plat
            </Button>
          </>
        )}

        {error && (
          <ErrorBox
            title="Analyse impossible"
            message={error}
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={analyze} disabled={!file || loading}>
                  <RotateCcw /> Réessayer
                </Button>
                <Link href="/settings#ai" className="inline-flex h-9 items-center text-sm text-arise">
                  Configurer l&apos;IA →
                </Link>
              </div>
            }
          />
        )}
      </div>
    </Sheet>
  );
}

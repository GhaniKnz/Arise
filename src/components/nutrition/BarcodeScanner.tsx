"use client";

import { Camera, Loader2, PenLine, RotateCcw, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Fields";
import { ErrorBox } from "@/components/ui/Feedback";
import { apiFetch, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import type { FoodItem } from "@/lib/db/types";
import { decodeBarcodeImage } from "@/lib/food/barcodeDecode";
import { isValidBarcode } from "@/lib/food/off";
import { useBarcodeScanner, type ScannerStatus } from "@/lib/hooks/useBarcodeScanner";
import { cue } from "@/lib/system/feedback";
import { CustomFoodSheet } from "./CustomFoodSheet";

const STATUS_TEXT: Partial<Record<ScannerStatus, string>> = {
  denied: "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou prends le code-barres en photo.",
  insecure: "Le scan en direct demande une connexion sécurisée (https). Prends le code-barres en photo, ça marche partout.",
  unsupported: "Scan en direct indisponible sur ce navigateur : prends le code-barres en photo ou tape les chiffres.",
  error: "Caméra indisponible (utilisée par une autre app ?). Prends le code-barres en photo.",
};

/**
 * Barcode input with three ways in: live camera, photo of the barcode (works
 * everywhere, even without https) and typed digits. Resolves the product
 * locally first, then on Open Food Facts.
 */
export function BarcodeScanner({ active, onFood }: { active: boolean; onFood: (food: FoodItem) => void }) {
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState<"lookup" | "photo" | null>(null);
  const [error, setError] = useState<{ title: string; message: string; code?: string } | null>(null);
  const [createFor, setCreateFor] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const lookup = async (code: string) => {
    setError(null);
    if (!isValidBarcode(code)) {
      setError({ title: "Code-barres invalide", message: "Un code-barres fait de 8 à 13 chiffres." });
      return;
    }
    cue("set");
    setBusy("lookup");
    try {
      // Known locally (custom or cached) first — works offline.
      const local = (await db.foods.where("barcode").equals(code).first()) as FoodItem | undefined;
      if (local) {
        onFood(local);
        return;
      }
      const res = await apiFetch<{ food: FoodItem }>(`/api/food/barcode/${code}`);
      onFood(res.food);
    } catch (e) {
      setError({ title: "Produit non trouvé", message: `${e instanceof ApiError ? e.message : "Recherche impossible."} (code ${code})`, code });
    } finally {
      setBusy(null);
    }
  };

  const { videoRef, status, slow, start, stop } = useBarcodeScanner((code) => void lookup(code));

  useEffect(() => {
    if (active) void start();
    else stop();
  }, [active, start, stop]);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    stop();
    setError(null);
    setBusy("photo");
    try {
      const code = await decodeBarcodeImage(file);
      if (!code) {
        setError({ title: "Code-barres illisible", message: "Prends-le de plus près, bien net et sans reflet (les chiffres doivent être lisibles) — ou tape les chiffres ci-dessous." });
        return;
      }
      await lookup(code);
    } catch {
      setError({ title: "Photo illisible", message: "Impossible d'ouvrir cette image. Réessaie ou tape les chiffres ci-dessous." });
    } finally {
      setBusy(null);
    }
  };

  const takePhoto = () => {
    stop();
    photoRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline aria-label="Aperçu caméra" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[42%] w-[80%] rounded-2xl border-2 border-arise/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.45),0_0_24px_rgb(77_163_255/0.6)]">
            {status === "scanning" && <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-arise shadow-[0_0_12px_#4da3ff]" />}
          </div>
        </div>
        {status === "scanning" && (
          <p className="absolute inset-x-0 bottom-2 text-center text-[11px] text-white/80">{slow ? "Rien ne sort ? Essaie « Photo du code-barres » ↓" : "Place le code-barres dans le cadre, à ~15 cm"}</p>
        )}
        {(status !== "scanning" || busy) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-void/85 p-6 text-center">
            {status === "starting" || busy ? (
              <>
                <Loader2 className="size-8 animate-spin text-arise" />
                <p className="text-sm text-ink-2">{busy === "photo" ? "Lecture du code-barres…" : busy === "lookup" ? "Recherche du produit…" : "Ouverture de la caméra…"}</p>
              </>
            ) : (
              <>
                <ScanBarcode className="size-10 text-ink-3" />
                <p className="text-sm text-ink-2">{STATUS_TEXT[status] ?? "Caméra en pause."}</p>
                {status !== "insecure" && status !== "unsupported" && (
                  <Button variant="secondary" size="sm" onClick={() => void start()}>
                    {status === "idle" ? <RotateCcw /> : <Camera />} {status === "idle" ? "Scanner à nouveau" : "Activer la caméra"}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Button variant={slow || status === "insecure" || status === "unsupported" || status === "denied" || status === "error" ? "primary" : "secondary"} block onClick={takePhoto} disabled={!!busy}>
        <Camera /> Photo du code-barres
      </Button>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          stop();
          void lookup(manual.trim());
        }}
      >
        <Field label="Ou tape les chiffres" className="flex-1">
          <TextInput inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} placeholder="3017620422003" maxLength={14} />
        </Field>
        <Button type="submit" variant="secondary" disabled={!!busy || manual.length < 6}>
          Chercher
        </Button>
      </form>

      {error && (
        <ErrorBox
          title={error.title}
          message={error.message}
          action={
            error.code ? (
              <Button size="sm" variant="secondary" onClick={() => setCreateFor(error.code!)}>
                <PenLine /> Créer ce produit
              </Button>
            ) : undefined
          }
        />
      )}

      <CustomFoodSheet open={!!createFor} onClose={() => setCreateFor(null)} barcode={createFor ?? undefined} onSaved={(f) => onFood(f)} />
    </div>
  );
}

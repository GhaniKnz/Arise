"use client";

import { ArrowLeft, Camera, Loader2, PenLine, ScanBarcode } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CustomFoodSheet } from "@/components/nutrition/CustomFoodSheet";
import { FoodSheet } from "@/components/nutrition/FoodSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Fields";
import { ErrorBox, Notice, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { apiFetch, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { useToday } from "@/lib/db/hooks";
import type { FoodItem, MealSlot } from "@/lib/db/types";
import { mealForHour } from "@/lib/domain/nutrition";
import { isValidBarcode } from "@/lib/food/off";
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { cue } from "@/lib/system/feedback";

function BarcodeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const date = params.get("date") ?? today;
  const meal = (params.get("meal") as MealSlot) || mealForHour(new Date().getHours());
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [food, setFood] = useState<FoodItem | null>(null);
  const [createFor, setCreateFor] = useState<string | null>(null);

  const lookup = async (code: string) => {
    setError(null);
    if (!isValidBarcode(code)) {
      setError({ message: "Code-barres invalide (6 à 14 chiffres)." });
      return;
    }
    cue("set");
    setLoading(true);
    try {
      // Known locally (custom or cached) first — works offline.
      const local = (await db.foods.where("barcode").equals(code).first()) as FoodItem | undefined;
      if (local) {
        setFood(local);
        return;
      }
      const res = await apiFetch<{ food: FoodItem }>(`/api/food/barcode/${code}`);
      setFood(res.food);
    } catch (e) {
      const err = e as ApiError;
      setError({ message: err.message, code });
    } finally {
      setLoading(false);
    }
  };

  const { videoRef, status, start, stop } = useBarcodeScanner((code) => void lookup(code));

  useEffect(() => {
    void start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.back()}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader kicker="Nutrition" title="Scanner un code-barres" subtitle="Les données viennent d'Open Food Facts" />

      <Panel padded={false} className="relative overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-black">
          <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline aria-label="Aperçu caméra" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-32 w-64 rounded-2xl border-2 border-arise/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.45),0_0_24px_rgb(77_163_255/0.6)]">
              {status === "scanning" && <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-arise shadow-[0_0_12px_#4da3ff]" />}
            </div>
          </div>
          {status !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-void/80 p-6 text-center">
              {status === "starting" || loading ? (
                <Loader2 className="size-8 animate-spin text-arise" />
              ) : (
                <>
                  <ScanBarcode className="size-10 text-ink-3" />
                  <p className="text-sm text-ink-2">
                    {status === "denied"
                      ? "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou saisis le code."
                      : status === "unsupported"
                        ? "Scanner indisponible sur ce navigateur : saisis le code ci-dessous."
                        : status === "error"
                          ? "Caméra indisponible."
                          : "Caméra en pause."}
                  </p>
                  {status !== "unsupported" && (
                    <Button variant="secondary" size="sm" onClick={() => void start()}>
                      <Camera /> Activer la caméra
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Panel>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(manual.trim());
        }}
      >
        <Field label="Ou saisis le code" className="flex-1">
          <TextInput inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} placeholder="3017620422003" maxLength={14} />
        </Field>
        <Button type="submit" disabled={loading || manual.length < 6}>
          Chercher
        </Button>
      </form>

      {error && (
        <div className="mt-4">
          <ErrorBox
            title="Produit non trouvé"
            message={error.message}
            action={
              error.code ? (
                <Button size="sm" variant="secondary" onClick={() => setCreateFor(error.code!)}>
                  <PenLine /> Créer ce produit
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      <Notice className="mt-4">Les produits scannés sont gardés sur ton appareil : la prochaine fois, ils s&apos;affichent même hors-ligne.</Notice>

      <FoodSheet
        open={!!food}
        onClose={() => {
          setFood(null);
          void start();
        }}
        food={food}
        date={date}
        meal={meal}
        source="barcode"
        onAdded={() => router.push(`/nutrition${date !== today ? `?date=${date}` : ""}`)}
      />
      <CustomFoodSheet open={!!createFor} onClose={() => setCreateFor(null)} barcode={createFor ?? undefined} onSaved={(f) => setFood(f)} />
    </div>
  );
}

export default function BarcodePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BarcodeScreen />
    </Suspense>
  );
}

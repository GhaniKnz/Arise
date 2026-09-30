"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BarcodeScanner } from "@/components/nutrition/BarcodeScanner";
import { FoodSheet } from "@/components/nutrition/FoodSheet";
import { IconButton } from "@/components/ui/Button";
import { Notice, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { useToday } from "@/lib/db/hooks";
import { addToNewDraft, foodPart } from "@/lib/db/repos/dishDraft";
import { ensureFoodCached } from "@/lib/db/repos/nutrition";
import type { FoodItem, MealSlot } from "@/lib/db/types";
import { mealForHour } from "@/lib/domain/nutrition";
import { toast } from "@/lib/system/store";

function BarcodeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = useToday();
  const date = params.get("date") ?? today;
  const meal = (params.get("meal") as MealSlot) || mealForHour(new Date().getHours());
  const [food, setFood] = useState<FoodItem | null>(null);

  const addToDish = async (f: FoodItem, grams: number) => {
    if (f.source !== "builtin") await ensureFoodCached(f);
    await addToNewDraft(foodPart(f, grams, "barcode"));
    toast({ tone: "success", title: "Ajouté au plat", message: f.name });
    router.push(`/nutrition/compose?meal=${meal}&date=${date}`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.back()}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader kicker="Nutrition" title="Scanner un code-barres" subtitle="Les données viennent d'Open Food Facts" />

      <Panel>
        <BarcodeScanner active={!food} onFood={setFood} />
      </Panel>
      <Notice className="mt-4">Les produits scannés sont gardés sur ton appareil : la prochaine fois, ils s&apos;affichent même hors-ligne.</Notice>

      <FoodSheet
        open={!!food}
        onClose={() => setFood(null)}
        food={food}
        date={date}
        meal={meal}
        source="barcode"
        onAdded={() => router.push(`/nutrition${date !== today ? `?date=${date}` : ""}`)}
        onAddToDish={(f, g) => void addToDish(f, g)}
      />
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

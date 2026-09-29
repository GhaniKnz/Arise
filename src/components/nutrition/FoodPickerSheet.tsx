"use client";

import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { TextInput } from "@/components/ui/Fields";
import { Sheet } from "@/components/ui/Sheet";
import { FOODS } from "@/lib/data/foods";
import type { FoodItem } from "@/lib/db/types";
import { useFoodSearch } from "@/lib/hooks/useFoodSearch";
import { FoodRow } from "./FoodRow";
import { useResetOnOpen } from "@/lib/hooks/useResetOnOpen";

/** Search sheet that returns a food (used by meal and recipe editors). */
export function FoodPickerSheet({ open, onClose, onPick, title = "Choisir un aliment" }: { open: boolean; onClose: () => void; onPick: (f: FoodItem) => void; title?: string }) {
  const { profile } = useGame();
  const [q, setQ] = useState("");
  const search = useFoodSearch(q);
  useResetOnOpen(open, () => setQ(""));
  const goal = profile?.goal ?? "maintain";
  const suggestions = FOODS.filter((f) => ["meat", "fish", "eggs", "grains", "vegetables"].includes(f.category)).slice(0, 12);

  return (
    <Sheet open={open} onClose={onClose} title={title} tall size="lg">
      <div className="sticky top-0 z-10 -mx-5 bg-[#0f1628] px-5 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <TextInput data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" aria-label="Rechercher un aliment" />
        </div>
      </div>
      <ul className="mt-1">
        {(q ? search.local : suggestions).map((f) => (
          <FoodRow key={f.id} food={f} goal={goal} onSelect={(x) => { onPick(x); onClose(); }} />
        ))}
        {q &&
          search.remote.map((f) => (
            <FoodRow key={f.id} food={f} goal={goal} onSelect={(x) => { onPick(x); onClose(); }} />
          ))}
      </ul>
      {search.loading && (
        <p className="flex items-center gap-2 px-2 py-3 text-sm text-ink-3">
          <Loader2 className="size-4 animate-spin" /> Recherche Open Food Facts…
        </p>
      )}
    </Sheet>
  );
}

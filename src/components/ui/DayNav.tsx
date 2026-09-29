"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useToday } from "@/lib/db/hooks";
import { addDays, relativeDayLabel, type DayKey } from "@/lib/utils/date";
import { IconButton } from "./Button";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Selected day stored in the `?date=` search param (defaults to today). */
export function useDateParam(): [DayKey, (d: DayKey) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const today = useToday();
  const raw = params.get("date");
  const date = raw && KEY_RE.test(raw) ? raw : today;
  const set = useCallback(
    (d: DayKey) => {
      const sp = new URLSearchParams(params.toString());
      if (d === today) sp.delete("date");
      else sp.set("date", d);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname, today],
  );
  return [date, set];
}

export function DayNav({ date, onChange }: { date: DayKey; onChange: (d: DayKey) => void }) {
  const today = useToday();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-deep/60 p-1">
      <IconButton label="Jour précédent" size="sm" onClick={() => onChange(addDays(date, -1))}>
        <ChevronLeft />
      </IconButton>
      <button type="button" onClick={() => onChange(today)} className="min-w-28 px-2 text-center text-sm font-semibold text-ink capitalize" aria-label="Revenir à aujourd'hui">
        {relativeDayLabel(date, today)}
      </button>
      <IconButton label="Jour suivant" size="sm" onClick={() => onChange(addDays(date, 1))} disabled={date >= today}>
        <ChevronRight />
      </IconButton>
    </div>
  );
}

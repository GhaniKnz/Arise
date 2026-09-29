"use client";

import { useEffect } from "react";
import { useToday } from "@/lib/db/hooks";
import { parseStepsText } from "@/lib/domain/steps";
import { openSheet, useUi } from "@/lib/system/ui";
import { CardioSheet } from "./CardioSheet";
import { SleepSheet, StepsSheet, WaterSheet } from "./DailySheets";
import { PhotoSheet } from "./PhotoSheet";
import { MoreSheet, QuickMenuSheet } from "./QuickMenu";
import { WeightSheet } from "./WeightSheet";

/** Hosts every quick-entry sheet; any component can open one with openSheet(). */
export function QuickSheets() {
  const { sheet, date, prefill } = useUi();
  const today = useToday();
  const d = date ?? today;

  // Links like /?pas=8432&date=2026-09-29 (automations, shortcuts) open the steps sheet prefilled.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("pas") ?? params.get("steps");
    if (!raw) return;
    const found = parseStepsText(`${params.get("date") ?? ""} ${raw}`, today);
    for (const k of ["pas", "steps", "date"]) params.delete(k);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    if (found[0]) openSheet("steps", found[0].date, found[0].steps);
  }, [today]);

  return (
    <>
      <QuickMenuSheet open={sheet === "menu"} />
      <MoreSheet open={sheet === "more"} />
      <WeightSheet open={sheet === "weight"} date={d} />
      <StepsSheet open={sheet === "steps"} date={d} prefill={prefill} />
      <WaterSheet open={sheet === "water"} date={d} />
      <SleepSheet open={sheet === "sleep"} date={d} />
      <CardioSheet open={sheet === "cardio"} date={d} />
      <PhotoSheet open={sheet === "photo"} date={d} />
    </>
  );
}

"use client";

import { useToday } from "@/lib/db/hooks";
import { useUi } from "@/lib/system/ui";
import { CardioSheet } from "./CardioSheet";
import { SleepSheet, StepsSheet, WaterSheet } from "./DailySheets";
import { PhotoSheet } from "./PhotoSheet";
import { MoreSheet, QuickMenuSheet } from "./QuickMenu";
import { WeightSheet } from "./WeightSheet";

/** Hosts every quick-entry sheet; any component can open one with openSheet(). */
export function QuickSheets() {
  const { sheet, date } = useUi();
  const today = useToday();
  const d = date ?? today;
  return (
    <>
      <QuickMenuSheet open={sheet === "menu"} />
      <MoreSheet open={sheet === "more"} />
      <WeightSheet open={sheet === "weight"} date={d} />
      <StepsSheet open={sheet === "steps"} date={d} />
      <WaterSheet open={sheet === "water"} date={d} />
      <SleepSheet open={sheet === "sleep"} date={d} />
      <CardioSheet open={sheet === "cardio"} date={d} />
      <PhotoSheet open={sheet === "photo"} date={d} />
    </>
  );
}

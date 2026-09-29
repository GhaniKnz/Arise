"use client";

import { useSyncExternalStore } from "react";
import type { DayKey } from "@/lib/utils/date";

export type QuickSheet = "menu" | "weight" | "steps" | "water" | "sleep" | "cardio" | "photo" | "more";

interface UiState {
  sheet: QuickSheet | null;
  date?: DayKey;
}

let state: UiState = { sheet: null };
const listeners = new Set<() => void>();

export function openSheet(sheet: QuickSheet, date?: DayKey) {
  state = { sheet, date };
  listeners.forEach((l) => l());
}

export function closeSheet() {
  state = { sheet: null };
  listeners.forEach((l) => l());
}

export function useUi(): UiState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

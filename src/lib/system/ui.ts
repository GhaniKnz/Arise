"use client";

import { useSyncExternalStore } from "react";
import type { DayKey } from "@/lib/utils/date";

export type QuickSheet = "menu" | "weight" | "steps" | "water" | "sleep" | "cardio" | "photo" | "more";

interface UiState {
  sheet: QuickSheet | null;
  date?: DayKey;
  /** Value to prefill (e.g. steps read from a link). */
  prefill?: number;
}

let state: UiState = { sheet: null };
const listeners = new Set<() => void>();

export function openSheet(sheet: QuickSheet, date?: DayKey, prefill?: number) {
  state = { sheet, date, prefill };
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

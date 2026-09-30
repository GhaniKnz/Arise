"use client";

import { useSyncExternalStore } from "react";
import type { Rank, StatKey } from "@/lib/domain/game";
import type { PRKind } from "@/lib/domain/strength";

export type ToastTone = "system" | "quest" | "success" | "warn" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  xp?: number;
  /** Optional one-tap action (e.g. undo). */
  action?: { label: string; onClick: () => void };
}

export type Overlay =
  | { kind: "levelup"; level: number; rank: Rank; title: string; gains: Partial<Record<StatKey, number>> }
  | { kind: "quests"; xp: number }
  | { kind: "pr"; exercise: string; weightKg: number; reps: number; kinds: PRKind[]; weighted: boolean; beat?: string; xp?: number }
  | { kind: "boss"; name: string; atKg: number; xp: number; next?: string };

interface State {
  toasts: Toast[];
  overlays: Overlay[];
}

let state: State = { toasts: [], overlays: [] };
let nextId = 1;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function toast(t: Omit<Toast, "id">, durationMs = 3600) {
  const id = nextId++;
  set({ ...state, toasts: [...state.toasts.slice(-3), { ...t, id }] });
  if (typeof window !== "undefined") window.setTimeout(() => dismissToast(id), durationMs);
  return id;
}

export function dismissToast(id: number) {
  set({ ...state, toasts: state.toasts.filter((t) => t.id !== id) });
}

export function showOverlay(o: Overlay) {
  set({ ...state, overlays: [...state.overlays, o] });
}

export function dismissOverlay() {
  set({ ...state, overlays: state.overlays.slice(1) });
}

export function useSystemState(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

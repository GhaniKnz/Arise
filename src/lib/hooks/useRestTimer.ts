"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cue } from "@/lib/system/feedback";

const STORAGE_KEY = "arise:rest-timer";

interface TimerState {
  endsAt: number;
  total: number;
}

function load(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TimerState;
    return s.endsAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function save(s: TimerState | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

async function notifyDone() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body: "Série suivante : c'est parti.", tag: "arise-rest", icon: "/icons/icon-192.png" };
    if (reg) await reg.showNotification("Repos terminé", opts);
    else new Notification("Repos terminé", opts);
  } catch {
    /* notifications unavailable */
  }
}

/** Rest countdown based on an absolute end time, so it survives backgrounding and reloads. */
export function useRestTimer() {
  const [state, setState] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    setState(load());
  }, []);

  useEffect(() => {
    if (!state) return;
    firedRef.current = false;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const onVis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state]);

  const remaining = state ? Math.max(0, (state.endsAt - now) / 1000) : 0;

  useEffect(() => {
    if (state && remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      cue("timer");
      void notifyDone();
      const t = window.setTimeout(() => {
        setState(null);
        save(null);
      }, 1800);
      return () => window.clearTimeout(t);
    }
  }, [state, remaining]);

  const start = useCallback((seconds: number) => {
    const s = { endsAt: Date.now() + seconds * 1000, total: seconds };
    setNow(Date.now());
    setState(s);
    save(s);
  }, []);

  const add = useCallback((seconds: number) => {
    setState((s) => {
      if (!s) return s;
      const next = { endsAt: Math.max(Date.now() + 5000, s.endsAt + seconds * 1000), total: Math.max(5, s.total + seconds) };
      save(next);
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    setState(null);
    save(null);
  }, []);

  return { active: !!state, remaining, total: state?.total ?? 0, done: !!state && remaining <= 0, start, add, skip };
}

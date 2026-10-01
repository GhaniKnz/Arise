"use client";

import type { SoundPack } from "@/lib/db/types";
import { duckMusic } from "@/lib/music/player";
import { playSystemCue, type SystemCue } from "./sfx";

let ctx: AudioContext | null = null;
let prefs: { sound: boolean; vibration: boolean; pack: SoundPack } = { sound: true, vibration: true, pack: "system" };

export function setFeedbackPrefs(p: { sound: boolean; vibration: boolean; pack?: SoundPack }) {
  prefs = { ...p, pack: p.pack ?? "system" };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gain = 0.06, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + duration);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + duration + 0.05);
}

/** start = session begins ("Arise"), clear = last set of an exercise, finish = session done. */
export type Cue = SystemCue;

/** Short synthesized cues — no audio files needed. `pack` overrides the setting (previews). */
export function cue(kind: Cue, pack: SoundPack = prefs.pack) {
  if (prefs.vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern: Record<Cue, number | number[]> = {
      tap: 8,
      set: 18,
      quest: [20, 40, 20],
      levelup: [40, 60, 40, 60, 80],
      pr: [30, 50, 30, 50, 60],
      timer: [200, 100, 200],
      start: [60, 80, 120],
      clear: [20, 40, 40],
      finish: [40, 60, 40, 60, 120],
    };
    try {
      navigator.vibrate(pattern[kind]);
    } catch {
      /* unsupported */
    }
  }
  if (!prefs.sound) return;
  // Long cues: lower the training music for a moment so they're heard.
  if (kind === "timer" || kind === "pr" || kind === "levelup" || kind === "finish" || kind === "start") duckMusic(kind === "timer" ? 1400 : 2200);
  try {
    if (pack === "system") {
      const a = audio();
      if (a) playSystemCue(a, kind);
      return;
    }
    switch (kind) {
      case "tap":
        break;
      case "set":
        tone(880, 0, 0.12, 0.04, "triangle");
        break;
      case "quest":
      case "clear":
        tone(660, 0, 0.15);
        tone(990, 0.1, 0.25);
        break;
      case "start":
        tone(440, 0, 0.2, 0.05, "triangle");
        tone(660, 0.15, 0.3, 0.05, "triangle");
        break;
      case "levelup":
      case "finish":
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.35, 0.05, "triangle"));
        break;
      case "pr":
        [392, 523, 784].forEach((f, i) => tone(f, i * 0.08, 0.3, 0.05, "sawtooth"));
        break;
      case "timer":
        tone(880, 0, 0.18, 0.08, "square");
        tone(880, 0.28, 0.18, 0.08, "square");
        tone(1175, 0.56, 0.3, 0.08, "square");
        break;
    }
  } catch {
    /* audio blocked */
  }
}

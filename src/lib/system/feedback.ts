"use client";

let ctx: AudioContext | null = null;
let prefs = { sound: true, vibration: true };

export function setFeedbackPrefs(p: { sound: boolean; vibration: boolean }) {
  prefs = p;
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

export type Cue = "tap" | "set" | "quest" | "levelup" | "pr" | "timer";

/** Short synthesized cues — no audio files needed. */
export function cue(kind: Cue) {
  if (prefs.vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern: Record<Cue, number | number[]> = { tap: 8, set: 18, quest: [20, 40, 20], levelup: [40, 60, 40, 60, 80], pr: [30, 50, 30, 50, 60], timer: [200, 100, 200] };
    try {
      navigator.vibrate(pattern[kind]);
    } catch {
      /* unsupported */
    }
  }
  if (!prefs.sound) return;
  try {
    switch (kind) {
      case "tap":
        break;
      case "set":
        tone(880, 0, 0.12, 0.04, "triangle");
        break;
      case "quest":
        tone(660, 0, 0.15);
        tone(990, 0.1, 0.25);
        break;
      case "levelup":
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

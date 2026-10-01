"use client";

import { useSyncExternalStore } from "react";
import type { MusicTrack } from "@/lib/db/types";
import { CATALOG_BY_ID, CATEGORY_LABEL } from "./catalog";

/**
 * Training music player. A single <audio> element lives outside React, so the
 * music keeps going across pages and while the phone is locked (an HTML media
 * element is allowed to play in the background, unlike Web Audio). The Media
 * Session API puts title and controls on the lock screen / notification.
 */

export type Repeat = "all" | "one" | "off";

export interface PlayerState {
  /** Play order (shuffled when shuffle is on). */
  queue: MusicTrack[];
  index: number;
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: Repeat;
  /** iOS ignores `audio.volume`: the phone's buttons set the level there. */
  volumeControl: boolean;
  error?: string;
}

const PREFS_KEY = "arise:music";

function loadPrefs(): Pick<PlayerState, "volume" | "shuffle" | "repeat"> {
  const fallback = { volume: 0.8, shuffle: false, repeat: "all" as Repeat };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<PlayerState> | null;
    return {
      volume: typeof raw?.volume === "number" ? Math.min(1, Math.max(0, raw.volume)) : fallback.volume,
      shuffle: raw?.shuffle === true,
      repeat: raw?.repeat === "one" || raw?.repeat === "off" ? raw.repeat : "all",
    };
  } catch {
    return fallback;
  }
}

function savePrefs() {
  try {
    const { volume, shuffle, repeat } = current();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume, shuffle, repeat }));
  } catch {
    /* storage unavailable: preferences just won't persist */
  }
}

const SERVER_STATE: PlayerState = { queue: [], index: -1, playing: false, loading: false, position: 0, duration: 0, volume: 0.8, shuffle: false, repeat: "all", volumeControl: true };
let state: PlayerState | null = null;
const listeners = new Set<() => void>();

function current(): PlayerState {
  state ??= { ...SERVER_STATE, ...loadPrefs() };
  return state;
}

function set(patch: Partial<PlayerState>) {
  state = { ...current(), ...patch };
  listeners.forEach((l) => l());
}

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
/** Queue in its original order, to turn shuffle off again. */
let ordered: MusicTrack[] = [];
let errorsInARow = 0;
let lastPositionPush = 0;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/** Safari: "playback" keeps music going with the screen locked and the silent switch on. */
function audioSessionType(type: "playback" | "auto") {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session) return;
  try {
    session.type = type;
  } catch {
    /* unsupported value */
  }
}

function el(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = "auto";
  a.setAttribute("playsinline", "");
  a.volume = 0.5;
  const volumeControl = Math.abs(a.volume - 0.5) < 0.01;
  a.volume = current().volume;
  set({ volumeControl });

  a.addEventListener("play", () => {
    audioSessionType("playback");
    set({ playing: true, error: undefined });
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
  });
  a.addEventListener("pause", () => {
    set({ playing: false });
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  });
  a.addEventListener("waiting", () => set({ loading: true }));
  a.addEventListener("playing", () => {
    errorsInARow = 0;
    set({ loading: false });
  });
  a.addEventListener("canplay", () => set({ loading: false }));
  a.addEventListener("durationchange", () => {
    if (Number.isFinite(a.duration)) set({ duration: a.duration });
  });
  a.addEventListener("timeupdate", () => {
    set({ position: a.currentTime });
    const now = Date.now();
    if (now - lastPositionPush > 4000) {
      lastPositionPush = now;
      pushPositionState();
    }
  });
  a.addEventListener("ended", onEnded);
  a.addEventListener("error", () => {
    // Emptying the source on stop() is not a playback error.
    if (!a.getAttribute("src") || !current().queue.length) return;
    const t = current().queue[current().index];
    set({ playing: false, loading: false, error: t ? `Lecture impossible : ${t.title}` : "Lecture impossible" });
    errorsInARow++;
    // Skip a broken file, but don't loop forever over a queue of broken ones.
    if (errorsInARow < Math.min(3, current().queue.length)) next();
  });

  setupMediaSession();
  audio = a;
  return a;
}

function pushPositionState() {
  if (!("mediaSession" in navigator) || !audio) return;
  const d = audio.duration;
  if (!Number.isFinite(d) || d <= 0) return;
  try {
    navigator.mediaSession.setPositionState({ duration: d, playbackRate: audio.playbackRate || 1, position: Math.min(audio.currentTime, d) });
  } catch {
    /* inconsistent values while loading */
  }
}

function setupMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  const on = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      /* action not supported by this browser */
    }
  };
  on("play", () => play());
  on("pause", () => pause());
  on("previoustrack", () => prev());
  on("nexttrack", () => next());
  on("stop", () => stop());
  on("seekto", (d) => d.seekTime != null && seek(d.seekTime));
  on("seekbackward", (d) => seek(current().position - (d.seekOffset ?? 10)));
  on("seekforward", (d) => seek(current().position + (d.seekOffset ?? 10)));
}

function updateMetadata(t: MusicTrack) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  const cat = t.catalogId ? CATALOG_BY_ID.get(t.catalogId) : undefined;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.artist ?? "ARISE",
    album: cat ? `Solo Leveling · ${cat.tag}` : `ARISE · ${CATEGORY_LABEL[t.category]}`,
    artwork: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
}

function load(index: number, autoplay: boolean) {
  const s = current();
  const t = s.queue[index];
  if (!t) return;
  const a = el();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = t.blob ? URL.createObjectURL(t.blob) : null;
  a.src = objectUrl ?? t.url ?? "";
  set({ index, position: 0, duration: t.durationSec ?? 0, loading: autoplay, error: undefined });
  updateMetadata(t);
  if (autoplay) play();
}

function onEnded() {
  const s = current();
  if (s.repeat === "one") {
    seek(0);
    play();
    return;
  }
  if (s.index + 1 < s.queue.length) load(s.index + 1, true);
  else if (s.repeat === "all" && s.queue.length) load(0, true);
  else set({ playing: false, position: 0 });
}

function shuffled<T>(xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ─────────────── Actions ─────────────── */

/** Plays `tracks` starting with `startId` (call from a tap: iOS needs the gesture). */
export function playQueue(tracks: MusicTrack[], startId?: string) {
  const playable = tracks.filter((t) => t.blob || t.url);
  if (!playable.length) return;
  ordered = playable;
  const start = playable.find((t) => t.id === startId) ?? playable[0];
  const queue = current().shuffle ? [start, ...shuffled(playable.filter((t) => t !== start))] : playable;
  errorsInARow = 0;
  set({ queue });
  load(queue.indexOf(start), true);
}

export function play() {
  const s = current();
  if (s.index < 0) return;
  const a = el();
  a.play().catch((e: unknown) => {
    // Autoplay refused (no gesture) or format not supported.
    set({ playing: false, loading: false, error: e instanceof Error && e.name === "NotAllowedError" ? "Touche lecture pour lancer la musique" : "Lecture impossible sur cet appareil" });
  });
}

export function pause() {
  audio?.pause();
  audioSessionType("auto");
}

export function toggle() {
  if (current().playing) pause();
  else play();
}

export function next() {
  const s = current();
  if (!s.queue.length) return;
  load((s.index + 1) % s.queue.length, true);
}

export function prev() {
  const s = current();
  if (!s.queue.length) return;
  if (s.position > 3) {
    seek(0);
    return;
  }
  load((s.index - 1 + s.queue.length) % s.queue.length, true);
}

export function seek(seconds: number) {
  if (!audio) return;
  const d = Number.isFinite(audio.duration) ? audio.duration : current().duration;
  audio.currentTime = Math.max(0, Math.min(seconds, d || seconds));
  set({ position: audio.currentTime });
  pushPositionState();
}

export function stop() {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  audioSessionType("auto");
  ordered = [];
  set({ queue: [], index: -1, playing: false, loading: false, position: 0, duration: 0, error: undefined });
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  }
}

export function setVolume(v: number) {
  const volume = Math.min(1, Math.max(0, v));
  if (audio) audio.volume = volume;
  set({ volume });
  savePrefs();
}

export function toggleShuffle() {
  const s = current();
  const t = s.queue[s.index];
  const shuffle = !s.shuffle;
  if (t) {
    const queue = shuffle ? [t, ...shuffled(ordered.filter((x) => x !== t))] : ordered;
    set({ shuffle, queue, index: queue.indexOf(t) });
  } else set({ shuffle });
  savePrefs();
}

export function cycleRepeat() {
  const order: Repeat[] = ["all", "one", "off"];
  set({ repeat: order[(order.indexOf(current().repeat) + 1) % order.length] });
  savePrefs();
}

/** Keeps the queue in line with the library (renamed or deleted tracks). */
export function syncLibrary(tracks: MusicTrack[]) {
  const s = current();
  if (!s.queue.length) return;
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const playing = s.queue[s.index];
  if (playing && !byId.has(playing.id)) {
    stop();
    return;
  }
  const refresh = (list: MusicTrack[]) => list.filter((t) => byId.has(t.id)).map((t) => byId.get(t.id)!);
  ordered = refresh(ordered);
  const queue = refresh(s.queue);
  if (queue.some((t, i) => t !== s.queue[i]) || queue.length !== s.queue.length) {
    set({ queue, index: playing ? queue.findIndex((t) => t.id === playing.id) : -1 });
    if (playing) updateMetadata(byId.get(playing.id)!);
  }
}

/** Lowers the music for a moment so a System cue (end of rest, record…) is heard. */
export function duckMusic(ms = 1600) {
  const s = current();
  if (!audio || !s.playing || !s.volumeControl) return;
  audio.volume = s.volume * 0.3;
  window.setTimeout(() => {
    if (audio) audio.volume = current().volume;
  }, ms);
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    current,
    () => SERVER_STATE,
  );
}

export const player = { playQueue, play, pause, toggle, next, prev, seek, stop, setVolume, toggleShuffle, cycleRepeat };

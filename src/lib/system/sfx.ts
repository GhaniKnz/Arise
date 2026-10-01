"use client";

/**
 * "Hunter System" sound design: original cues synthesized with the Web Audio
 * API (no audio files), in the spirit of the System's blue windows — glassy
 * pings, deep "Arise" drops, power-up risers and alert pulses.
 */

export type SystemCue = "tap" | "set" | "quest" | "levelup" | "pr" | "timer" | "start" | "clear" | "finish";

interface Graph {
  ctx: AudioContext;
  dry: AudioNode;
  wet: AudioNode;
}

let graph: Graph | null = null;

/** Exponentially decaying stereo noise: a small hall reverb without any asset. */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function getGraph(ctx: AudioContext): Graph {
  if (graph?.ctx === ctx) return graph;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp).connect(ctx.destination);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.4, 3);
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.45;
  reverb.connect(wetGain).connect(master);
  graph = { ctx, dry: master, wet: reverb };
  return graph;
}

interface Tone {
  freq: number;
  /** Glide target (exponential). */
  to?: number;
  at?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  detune?: number;
  /** Reverb send, 0–1. */
  wet?: number;
  filter?: { type: BiquadFilterType; freq: number; to?: number; q?: number };
}

function tone(g: Graph, t: Tone) {
  const { ctx } = g;
  const start = ctx.currentTime + (t.at ?? 0);
  const end = start + t.dur;
  const osc = ctx.createOscillator();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, start);
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end);
  if (t.detune) osc.detune.value = t.detune;
  const amp = ctx.createGain();
  const peak = t.gain ?? 0.1;
  const attack = Math.min(t.attack ?? 0.008, t.dur / 2);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(peak, start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  let node: AudioNode = osc;
  if (t.filter) {
    const f = ctx.createBiquadFilter();
    f.type = t.filter.type;
    f.Q.value = t.filter.q ?? 0.8;
    f.frequency.setValueAtTime(t.filter.freq, start);
    if (t.filter.to) f.frequency.exponentialRampToValueAtTime(t.filter.to, end);
    node = node.connect(f);
  }
  node.connect(amp);
  amp.connect(g.dry);
  if (t.wet) {
    const send = ctx.createGain();
    send.gain.value = t.wet;
    amp.connect(send).connect(g.wet);
  }
  osc.start(start);
  osc.stop(end + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(g: Graph, n: { at?: number; dur: number; gain?: number; attack?: number; wet?: number; filter: { type: BiquadFilterType; freq: number; to?: number; q?: number } }) {
  const { ctx } = g;
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const start = ctx.currentTime + (n.at ?? 0);
  const end = start + n.dur;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = n.filter.type;
  f.Q.value = n.filter.q ?? 1;
  f.frequency.setValueAtTime(n.filter.freq, start);
  if (n.filter.to) f.frequency.exponentialRampToValueAtTime(n.filter.to, end);
  const amp = ctx.createGain();
  const attack = Math.min(n.attack ?? 0.01, n.dur / 2);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(n.gain ?? 0.05, start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(f).connect(amp).connect(g.dry);
  if (n.wet) {
    const send = ctx.createGain();
    send.gain.value = n.wet;
    amp.connect(send).connect(g.wet);
  }
  src.start(start);
  src.stop(end + 0.05);
}

/** A soft chord of detuned saws through a low-pass: the System's "fanfare" timbre. */
function chord(g: Graph, freqs: number[], at: number, dur: number, gain = 0.035, cutoff = 2600) {
  for (const f of freqs) {
    for (const d of [-7, 7]) tone(g, { freq: f, at, dur, type: "sawtooth", detune: d, gain, attack: 0.04, wet: 0.5, filter: { type: "lowpass", freq: cutoff, q: 0.5 } });
  }
}

/** Crystal "window opened" ping. */
function ping(g: Graph, freq: number, at = 0, gain = 0.07) {
  tone(g, { freq, at, dur: 0.55, gain, wet: 0.55 });
  tone(g, { freq: freq * 2, at, dur: 0.3, gain: gain * 0.35, type: "triangle", wet: 0.6 });
  tone(g, { freq: freq * 3.01, at, dur: 0.18, gain: gain * 0.12, wet: 0.7 });
}

export function playSystemCue(ctx: AudioContext, kind: SystemCue) {
  const g = getGraph(ctx);
  switch (kind) {
    case "tap":
      tone(g, { freq: 2200, dur: 0.035, gain: 0.025 });
      break;
    case "set":
      // Two glassy notes, like a System message popping up.
      ping(g, 1568, 0, 0.06);
      ping(g, 2349, 0.075, 0.05);
      break;
    case "quest":
      [1318.5, 1975.5, 2637].forEach((f, i) => ping(g, f, i * 0.085, 0.05));
      noise(g, { at: 0.05, dur: 0.6, gain: 0.012, wet: 0.8, filter: { type: "highpass", freq: 6000 } });
      break;
    case "clear":
      // Exercise cleared: short two-chord cadence.
      chord(g, [784, 1175], 0, 0.32, 0.028, 3200);
      chord(g, [1046.5, 1568], 0.16, 0.7, 0.03, 3600);
      ping(g, 2093, 0.16, 0.04);
      break;
    case "timer":
      // System alert: three pulses then a rising call. Louder, to cut through music.
      [880, 880, 1318.5].forEach((f, i) => tone(g, { freq: f, at: i * 0.2, dur: 0.13, type: "square", gain: 0.06, filter: { type: "bandpass", freq: 1400, q: 1.2 }, wet: 0.25 }));
      tone(g, { freq: 880, to: 1760, at: 0.62, dur: 0.32, type: "triangle", gain: 0.08, wet: 0.4 });
      break;
    case "start":
      // "Arise": deep drop, dark pad, rising shadow whoosh, then the System answers.
      tone(g, { freq: 98, to: 34, dur: 1.8, gain: 0.32, attack: 0.02 });
      for (const f of [55, 82.4, 110]) tone(g, { freq: f, dur: 2.2, type: "sawtooth", gain: 0.05, attack: 0.25, detune: f === 82.4 ? 8 : -6, wet: 0.5, filter: { type: "lowpass", freq: 180, to: 1400, q: 2 } });
      noise(g, { dur: 1.3, gain: 0.05, attack: 0.9, wet: 0.6, filter: { type: "bandpass", freq: 250, to: 4200, q: 1.5 } });
      ping(g, 1318.5, 1.25, 0.05);
      ping(g, 1975.5, 1.33, 0.045);
      break;
    case "pr":
      // Power-up: noise riser, impact, bright chord.
      noise(g, { dur: 0.5, gain: 0.06, attack: 0.45, filter: { type: "bandpass", freq: 400, to: 7000, q: 2 } });
      tone(g, { freq: 60, to: 38, at: 0.48, dur: 0.9, gain: 0.3 });
      noise(g, { at: 0.48, dur: 0.3, gain: 0.08, filter: { type: "lowpass", freq: 1600, to: 300 } });
      chord(g, [587.3, 880, 1174.7, 1480], 0.5, 1.3, 0.026, 4200);
      ping(g, 2349, 0.56, 0.04);
      break;
    case "levelup":
      tone(g, { freq: 80, to: 40, dur: 0.9, gain: 0.25 });
      tone(g, { freq: 130, to: 1040, dur: 0.5, type: "sawtooth", gain: 0.03, filter: { type: "lowpass", freq: 400, to: 5000 } });
      chord(g, [523.3, 659.3, 784, 1046.5], 0.45, 1.4, 0.026, 3800);
      [2093, 2637, 3136].forEach((f, i) => ping(g, f, 0.55 + i * 0.07, 0.03));
      break;
    case "finish":
      // Dungeon cleared: ascending call, low impact, full chord.
      [523.3, 659.3, 784].forEach((f, i) => tone(g, { freq: f, at: i * 0.11, dur: 0.3, type: "triangle", gain: 0.06, wet: 0.4 }));
      tone(g, { freq: 65, to: 40, at: 0.33, dur: 1.1, gain: 0.28 });
      chord(g, [523.3, 784, 1046.5, 1318.5], 0.33, 1.8, 0.028, 4000);
      [2093, 2637, 3136, 4186].forEach((f, i) => ping(g, f, 0.4 + i * 0.08, 0.03));
      break;
  }
}

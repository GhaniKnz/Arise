import type { DayKey } from "@/lib/utils/date";

/**
 * Weight-goal "dungeon": the distance from start to target weight is split
 * into floors, each guarded by a boss. A boss is defeated the first day the
 * 7-day average weight crosses its floor — the average, so a lucky weigh-in
 * doesn't count and a bad one doesn't undo it.
 */
export interface Boss {
  index: number;
  name: string;
  /** Glyph key (see GlyphIcon). */
  icon: string;
  atKg: number;
  /** Position on the path, 0 = start, 1 = target. */
  pos: number;
  final: boolean;
  xp: number;
}

export interface BossState extends Boss {
  defeated: boolean;
  defeatedOn?: DayKey;
}

const LOSS: [string, string][] = [
  ["Gobelin du Grignotage", "cookie"],
  ["Golem de l'Inertie", "mountain"],
  ["Spectre du Sucre", "candy"],
  ["Chevalier de la Flemme", "shield"],
  ["Hydre des Excuses", "waves"],
];
const GAIN: [string, string][] = [
  ["Gobelin de l'Appétit coupé", "drumstick"],
  ["Golem de la Stagnation", "mountain"],
  ["Spectre du Repas sauté", "ghost"],
  ["Chevalier de la Récup", "shield"],
  ["Hydre de l'Irrégularité", "waves"],
];
const FINAL_LOSS: [string, string] = ["Seigneur du Plateau", "crown"];
const FINAL_GAIN: [string, string] = ["Titan de la Masse", "crown"];

export const BOSS_XP = 150;
export const FINAL_BOSS_XP = 300;

const NICE_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20];
const MAX_NODES = 6;

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Floors between start and target (the last one is the target itself). */
export function bossPath(startKg: number, targetKg: number): Boss[] {
  const total = Math.abs(targetKg - startKg);
  if (!Number.isFinite(total) || total < 1) return [];
  const dir = Math.sign(targetKg - startKg);
  const step = NICE_STEPS.find((s) => Math.ceil(total / s - 1e-9) <= MAX_NODES) ?? total / MAX_NODES;
  const marks: number[] = [];
  for (let d = step; d < total - 1e-9; d += step) marks.push(d);
  // Avoid a last floor that is only a sliver: merge it into the final boss.
  if (marks.length && total - marks[marks.length - 1] < step * 0.4) marks.pop();
  marks.push(total);

  const names = dir < 0 ? LOSS : GAIN;
  return marks.map((d, i) => {
    const final = i === marks.length - 1;
    const [name, icon] = final ? (dir < 0 ? FINAL_LOSS : FINAL_GAIN) : names[i % names.length];
    return { index: i, name, icon, atKg: final ? targetKg : round1(startKg + dir * d), pos: d / total, final, xp: final ? FINAL_BOSS_XP : BOSS_XP };
  });
}

/** Marks bosses defeated from the 7-day average series (ascending dates). */
export function bossStates(bosses: Boss[], startKg: number, avgSeries: { date: DayKey; avg: number }[]): BossState[] {
  if (!bosses.length) return [];
  const dir = Math.sign(bosses[bosses.length - 1].atKg - startKg);
  return bosses.map((b) => {
    const hit = avgSeries.find((p) => (dir < 0 ? p.avg <= b.atKg + 1e-9 : p.avg >= b.atKg - 1e-9));
    return { ...b, defeated: !!hit, defeatedOn: hit?.date };
  });
}

/** The next boss to fight and how much of its "HP" (remaining kg on its floor) is left. */
export function nextBoss(states: BossState[], startKg: number, currentKg: number) {
  const i = states.findIndex((b) => !b.defeated);
  if (i < 0) return null;
  const boss = states[i];
  const from = i === 0 ? startKg : states[i - 1].atKg;
  const floor = Math.abs(boss.atKg - from);
  const dir = Math.sign(boss.atKg - from);
  const progressed = Math.min(floor, Math.max(0, (currentKg - from) * dir));
  return { boss, hp: floor > 0 ? 1 - progressed / floor : 0, remainingKg: Math.max(0, (boss.atKg - currentKg) * dir) };
}

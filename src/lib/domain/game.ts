import type { GoalType, QuestId, Targets } from "@/lib/db/types";
import { addDays, type DayKey } from "@/lib/utils/date";
import { clamp } from "@/lib/utils/format";

export type StatKey = "STR" | "END" | "ACT" | "DISC" | "REC" | "NUT";

export const STAT_META: Record<StatKey, { name: string; desc: string }> = {
  STR: { name: "Force", desc: "Séances terminées et records personnels" },
  END: { name: "Endurance", desc: "Cardio réalisé" },
  ACT: { name: "Activité", desc: "Objectif de pas atteint" },
  DISC: { name: "Discipline", desc: "Quêtes complètes, pesées, séries de jours" },
  REC: { name: "Récupération", desc: "Sommeil et hydratation" },
  NUT: { name: "Nutrition", desc: "Calories et protéines respectées" },
};

export const STAT_ORDER: StatKey[] = ["STR", "END", "ACT", "DISC", "REC", "NUT"];

/** Aggregated facts about one calendar day. */
export interface DayData {
  date: DayKey;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entries: number;
  steps?: number;
  waterMl?: number;
  sleepMin?: number;
  energy?: number;
  weightKg?: number;
  sessionsDone: number;
  workoutPlanned: boolean;
  cardioMin: number;
  volume: number;
  sets: number;
}

export interface QuestDef {
  id: QuestId;
  label: string;
  stat: StatKey;
  xp: number;
}

export const QUEST_DEFS: Record<QuestId, QuestDef> = {
  steps: { id: "steps", label: "Pas", stat: "ACT", xp: 80 },
  protein: { id: "protein", label: "Protéines", stat: "NUT", xp: 80 },
  calories: { id: "calories", label: "Calories", stat: "NUT", xp: 80 },
  water: { id: "water", label: "Hydratation", stat: "REC", xp: 50 },
  workout: { id: "workout", label: "Séance", stat: "STR", xp: 120 },
  sleep: { id: "sleep", label: "Sommeil", stat: "REC", xp: 60 },
};

export const ALL_QUESTS: QuestId[] = ["steps", "protein", "calories", "water", "workout", "sleep"];
export const ALL_QUESTS_BONUS = 200;

/** Acceptable calorie window as a fraction of the target, per goal. */
export function calorieWindow(goal: GoalType): [number, number] {
  switch (goal) {
    case "cut":
      return [0.85, 1.05];
    case "recomp":
      return [0.9, 1.05];
    case "maintain":
      return [0.92, 1.08];
    case "bulk":
      return [0.95, 1.12];
  }
}

export interface QuestState {
  id: QuestId;
  title: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
  progress: number;
  xp: number;
  stat: StatKey;
}

export function questsForDay(day: DayData, t: Targets, goal: GoalType, enabled: QuestId[]): QuestState[] {
  const out: QuestState[] = [];
  const q = (id: QuestId, title: string, current: number, target: number, unit: string, done: boolean, progress?: number) => {
    const def = QUEST_DEFS[id];
    out.push({ id, title, current, target, unit, done, progress: clamp(progress ?? (target ? current / target : 0), 0, 1), xp: def.xp, stat: def.stat });
  };
  for (const id of enabled) {
    switch (id) {
      case "steps":
        q(id, `${fmt(t.steps)} pas`, day.steps ?? 0, t.steps, "pas", (day.steps ?? 0) >= t.steps);
        break;
      case "protein":
        q(id, `${t.protein} g de protéines`, day.protein, t.protein, "g", day.protein >= t.protein * 0.97);
        break;
      case "calories": {
        const [lo, hi] = calorieWindow(goal);
        const ok = day.entries >= 2 && day.kcal >= t.kcal * lo && day.kcal <= t.kcal * hi;
        const title = goal === "bulk" ? `Atteindre ${fmt(t.kcal)} kcal` : `Rester sous ${fmt(Math.round(t.kcal * hi))} kcal`;
        q(id, title, day.kcal, t.kcal, "kcal", ok, day.kcal / (t.kcal * lo));
        break;
      }
      case "water":
        q(id, `Boire ${(t.waterMl / 1000).toLocaleString("fr-FR")} L`, day.waterMl ?? 0, t.waterMl, "ml", (day.waterMl ?? 0) >= t.waterMl);
        break;
      case "workout":
        if (day.workoutPlanned) q(id, "Séance prévue", day.sessionsDone, 1, "séance", day.sessionsDone > 0);
        break;
      case "sleep":
        q(id, `Dormir ${fmtH(t.sleepMin)} minimum`, day.sleepMin ?? 0, t.sleepMin, "min", (day.sleepMin ?? 0) >= t.sleepMin - 5);
        break;
    }
  }
  return out;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const fmtH = (min: number) => `${Math.floor(min / 60)} h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;

/* ─────────────── Daily score ─────────────── */

export interface ScorePart {
  key: QuestId;
  label: string;
  value: number;
  weight: number;
}

export interface DayScore {
  total: number;
  parts: ScorePart[];
  tracked: boolean;
}

const SCORE_WEIGHTS: Record<QuestId, number> = { calories: 25, protein: 20, workout: 20, steps: 15, sleep: 10, water: 10 };

/** Adherence to the user's own targets (0–100). Not a judgement of the person. */
export function dailyScore(day: DayData, t: Targets, goal: GoalType, enabled: QuestId[]): DayScore {
  const parts: ScorePart[] = [];
  const add = (key: QuestId, label: string, value: number) => parts.push({ key, label, value: Math.round(clamp(value, 0, 100)), weight: SCORE_WEIGHTS[key] });

  for (const id of enabled) {
    switch (id) {
      case "calories": {
        if (day.entries === 0) {
          add(id, "Nutrition", 0);
          break;
        }
        const r = day.kcal / t.kcal;
        const [lo, hi] = calorieWindow(goal);
        const v = r < lo ? 100 - ((lo - r) / 0.35) * 100 : r > hi ? 100 - ((r - hi) / 0.25) * 100 : 100;
        add(id, "Nutrition", v);
        break;
      }
      case "protein":
        add(id, "Protéines", (day.protein / (t.protein * 0.97)) * 100);
        break;
      case "workout":
        add(id, "Entraînement", day.workoutPlanned ? (day.sessionsDone > 0 ? 100 : 0) : 100);
        break;
      case "steps":
        add(id, "Pas", ((day.steps ?? 0) / t.steps) * 100);
        break;
      case "sleep":
        add(id, "Sommeil", ((day.sleepMin ?? 0) / t.sleepMin) * 100);
        break;
      case "water":
        add(id, "Hydratation", ((day.waterMl ?? 0) / t.waterMl) * 100);
        break;
    }
  }
  const wsum = parts.reduce((a, p) => a + p.weight, 0) || 1;
  const total = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / wsum);
  const tracked =
    day.entries > 0 || day.steps != null || day.waterMl != null || day.sleepMin != null || day.sessionsDone > 0 || day.weightKg != null || day.cardioMin > 0;
  return { total: tracked ? total : 0, parts, tracked };
}

export const VALIDATED_DAY_SCORE = 70;

/* ─────────────── XP & levels ─────────────── */

export interface XpEvent {
  date: DayKey;
  amount: number;
  stat: StatKey;
  label: string;
}

export const xpToNext = (level: number) => 300 + 100 * level;

export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpForNext: number;
  progress: number;
  totalXp: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let rem = Math.max(0, totalXp);
  while (rem >= xpToNext(level)) {
    rem -= xpToNext(level);
    level++;
  }
  return { level, xpInLevel: rem, xpForNext: xpToNext(level), progress: rem / xpToNext(level), totalXp };
}

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export function rankFor(level: number): Rank {
  if (level >= 60) return "S";
  if (level >= 45) return "A";
  if (level >= 30) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

export const RANK_META: Record<Rank, { label: string; color: string; next?: number }> = {
  E: { label: "Rang E", color: "#8A94B0", next: 10 },
  D: { label: "Rang D", color: "#34D399", next: 20 },
  C: { label: "Rang C", color: "#4DA3FF", next: 30 },
  B: { label: "Rang B", color: "#A78BFA", next: 45 },
  A: { label: "Rang A", color: "#F5B94A", next: 60 },
  S: { label: "Rang S", color: "#F472B6" },
};

const TITLES: [number, string][] = [
  [80, "Légende vivante"],
  [60, "Monarque"],
  [45, "Maître d'armes"],
  [30, "Chasseur d'élite"],
  [20, "Vétéran"],
  [15, "Traqueur"],
  [10, "Chasseur confirmé"],
  [5, "Chasseur novice"],
  [1, "Éveillé"],
];

export function titleFor(level: number): string {
  return TITLES.find(([min]) => level >= min)?.[1] ?? "Éveillé";
}

export function statValue(xp: number): number {
  return 10 + Math.floor(xp / 250);
}

/* ─────────────── Ledger ─────────────── */

export interface DayLedger {
  day: DayData;
  quests: QuestState[];
  score: DayScore;
  xp: number;
  allQuestsDone: boolean;
  validated: boolean;
}

export interface Ledger {
  days: Map<DayKey, DayLedger>;
  events: XpEvent[];
  level: LevelInfo;
  statXp: Record<StatKey, number>;
  stats: Record<StatKey, number>;
  streak: { current: number; best: number };
  prCount: number;
}

export interface LedgerInput {
  days: DayData[];
  targets: Targets;
  goal: GoalType;
  quests: QuestId[];
  prsByDate: Map<DayKey, number>;
  today: DayKey;
}

export function buildLedger({ days, targets, goal, quests, prsByDate, today }: LedgerInput): Ledger {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<DayKey, DayLedger>();
  const events: XpEvent[] = [];
  const statXp: Record<StatKey, number> = { STR: 0, END: 0, ACT: 0, DISC: 0, REC: 0, NUT: 0 };
  let run = 0;
  let best = 0;
  let prCount = 0;

  const push = (e: XpEvent) => {
    events.push(e);
    statXp[e.stat] += e.amount;
  };

  for (const day of sorted) {
    const qs = questsForDay(day, targets, goal, quests);
    const score = dailyScore(day, targets, goal, quests);
    const before = events.length;

    for (const q of qs) if (q.done) push({ date: day.date, amount: q.xp, stat: q.stat, label: `Quête : ${QUEST_DEFS[q.id].label}` });
    const allDone = qs.length >= 3 && qs.every((q) => q.done);
    if (allDone) push({ date: day.date, amount: ALL_QUESTS_BONUS, stat: "DISC", label: "Daily Quest complète" });

    for (let i = 0; i < Math.min(day.sessionsDone, 2); i++) push({ date: day.date, amount: 100, stat: "STR", label: "Séance terminée" });
    const prs = Math.min(prsByDate.get(day.date) ?? 0, 5);
    prCount += prsByDate.get(day.date) ?? 0;
    for (let i = 0; i < prs; i++) push({ date: day.date, amount: 50, stat: "STR", label: "Record personnel" });
    if (day.cardioMin >= 15) push({ date: day.date, amount: 60, stat: "END", label: "Cardio" });
    if (day.weightKg != null) push({ date: day.date, amount: 20, stat: "DISC", label: "Pesée" });

    const validated = score.tracked && score.total >= VALIDATED_DAY_SCORE;
    if (validated) {
      run++;
      best = Math.max(best, run);
      if (run % 7 === 0) push({ date: day.date, amount: 150, stat: "DISC", label: `Série de ${run} jours` });
    } else if (day.date !== today) {
      run = 0;
    }

    const xp = events.slice(before).reduce((a, e) => a + e.amount, 0);
    map.set(day.date, { day, quests: qs, score, xp, allQuestsDone: allDone, validated });
  }

  // Current streak: today counts if validated, otherwise it doesn't break it yet.
  let current = 0;
  let cursor = map.get(today)?.validated ? today : addDays(today, -1);
  while (map.get(cursor)?.validated) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const totalXp = events.reduce((a, e) => a + e.amount, 0);
  const stats = Object.fromEntries(Object.entries(statXp).map(([k, v]) => [k, statValue(v)])) as Record<StatKey, number>;
  return { days: map, events, level: levelInfo(totalXp), statXp, stats, streak: { current, best: Math.max(best, current) }, prCount };
}

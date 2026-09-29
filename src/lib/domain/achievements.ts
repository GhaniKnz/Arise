import type { RawData } from "./aggregate";
import type { Ledger } from "./game";
import type { PREvent } from "./strength";

export interface AchievementState {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  current: number;
  target: number;
  done: boolean;
}

interface Ctx {
  raw: RawData;
  ledger: Ledger;
  prs: PREvent[];
  startWeight: number;
  currentWeight: number | null;
  photos: number;
  goal: "cut" | "bulk" | "recomp" | "maintain";
}

type Def = { id: string; title: string; desc: string; emoji: string; target: number; value: (c: Ctx) => number };

const maxRun = (flags: boolean[]) => {
  let best = 0;
  let run = 0;
  for (const f of flags) {
    run = f ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

const DEFS: Def[] = [
  { id: "first-session", title: "Premier donjon", desc: "Termine ta première séance", emoji: "⚔️", target: 1, value: (c) => c.raw.sessions.filter((s) => s.status === "done").length },
  { id: "sessions-25", title: "Habitué de la salle", desc: "25 séances terminées", emoji: "🏋️", target: 25, value: (c) => c.raw.sessions.filter((s) => s.status === "done").length },
  { id: "sessions-100", title: "Centurion", desc: "100 séances terminées", emoji: "🛡️", target: 100, value: (c) => c.raw.sessions.filter((s) => s.status === "done").length },
  { id: "first-pr", title: "Dépasser ses limites", desc: "Bats ton premier record", emoji: "🏆", target: 1, value: (c) => c.prs.length },
  { id: "prs-25", title: "Briseur de records", desc: "25 records personnels", emoji: "💥", target: 25, value: (c) => c.prs.length },
  { id: "streak-7", title: "Semaine parfaite", desc: "7 jours validés d'affilée", emoji: "🔥", target: 7, value: (c) => c.ledger.streak.best },
  { id: "streak-30", title: "Volonté de fer", desc: "30 jours validés d'affilée", emoji: "☄️", target: 30, value: (c) => c.ledger.streak.best },
  {
    id: "all-quests",
    title: "Quête du Système",
    desc: "Accomplis toutes les quêtes d'une journée",
    emoji: "✨",
    target: 1,
    value: (c) => [...c.ledger.days.values()].filter((d) => d.allQuestsDone).length,
  },
  {
    id: "protein-7",
    title: "Bâtisseur",
    desc: "Objectif protéines 7 jours d'affilée",
    emoji: "🥩",
    target: 7,
    value: (c) => maxRun([...c.ledger.days.values()].map((d) => !!d.quests.find((q) => q.id === "protein")?.done)),
  },
  {
    id: "steps-7",
    title: "Marcheur de l'ombre",
    desc: "Objectif de pas 7 jours d'affilée",
    emoji: "👣",
    target: 7,
    value: (c) => maxRun([...c.ledger.days.values()].map((d) => !!d.quests.find((q) => q.id === "steps")?.done)),
  },
  { id: "weigh-30", title: "Œil du Système", desc: "30 pesées enregistrées", emoji: "⚖️", target: 30, value: (c) => c.raw.metrics.filter((m) => m.weightKg != null).length },
  { id: "photo-1", title: "Miroir", desc: "Prends une photo de progression", emoji: "📸", target: 1, value: (c) => c.photos },
  { id: "food-500", title: "Scribe", desc: "500 aliments enregistrés", emoji: "📜", target: 500, value: (c) => c.raw.entries.length },
  {
    id: "lost-5",
    title: "Transformation",
    desc: "5 kg de variation vers ton objectif",
    emoji: "🌀",
    target: 5,
    value: (c) => (c.currentWeight == null ? 0 : c.goal === "bulk" ? Math.max(0, c.currentWeight - c.startWeight) : Math.max(0, c.startWeight - c.currentWeight)),
  },
  { id: "level-10", title: "Rang D", desc: "Atteins le niveau 10", emoji: "🟢", target: 10, value: (c) => c.ledger.level.level },
  { id: "level-20", title: "Rang C", desc: "Atteins le niveau 20", emoji: "🔷", target: 20, value: (c) => c.ledger.level.level },
  { id: "level-30", title: "Rang B", desc: "Atteins le niveau 30", emoji: "🔮", target: 30, value: (c) => c.ledger.level.level },
];

export function achievements(ctx: Ctx): AchievementState[] {
  return DEFS.map((d) => {
    const current = Math.round(d.value(ctx) * 10) / 10;
    return { id: d.id, title: d.title, desc: d.desc, emoji: d.emoji, current: Math.min(current, d.target), target: d.target, done: current >= d.target };
  });
}

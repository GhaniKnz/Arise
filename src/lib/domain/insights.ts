import type { GoalType, Targets } from "@/lib/db/types";
import { addDays, type DayKey } from "@/lib/utils/date";
import { mean } from "@/lib/utils/format";
import type { DayData } from "./game";

export type Evidence = "solide" | "limitée" | "hypothèse";

export interface Tip {
  id: string;
  title: string;
  body: string;
  article?: string;
  evidence: Evidence;
}

/**
 * Picks the most relevant tip of the day from the last 7 days of data.
 * Rules are ordered by expected impact on the user's goal.
 */
export function tipOfTheDay(days: DayData[], t: Targets, goal: GoalType, today: DayKey): Tip {
  const last7 = days.filter((d) => d.date > addDays(today, -7) && d.date < today);
  const logged = last7.filter((d) => d.entries > 0);
  const proteinLow = logged.filter((d) => d.protein < t.protein * 0.85).length;
  const sleepVals = last7.map((d) => d.sleepMin).filter((x): x is number => x != null);
  const stepVals = last7.map((d) => d.steps).filter((x): x is number => x != null);
  const weighIns = last7.filter((d) => d.weightKg != null).length;

  if (logged.length >= 3 && proteinLow >= Math.ceil(logged.length / 2)) {
    return {
      id: "protein",
      title: "Priorité : les protéines",
      body: `Tes protéines étaient sous l'objectif ${proteinLow} jour(s) sur ${logged.length}. En déficit, un apport élevé aide à préserver la masse musculaire. Répartis-les sur 3–5 repas.`,
      article: "proteines",
      evidence: "solide",
    };
  }
  if (sleepVals.length >= 3 && mean(sleepVals) < t.sleepMin - 30) {
    return {
      id: "sleep",
      title: "Le sommeil, ton multiplicateur",
      body: "Moins de 7 h de sommeil est associé à une récupération moins bonne et, en déficit, à une perte relative de masse maigre plus importante. Fixe une heure de coucher régulière.",
      article: "sommeil",
      evidence: "solide",
    };
  }
  if (goal === "cut" && stepVals.length >= 3 && mean(stepVals) < t.steps * 0.75) {
    return {
      id: "steps",
      title: "Les pas comptent plus qu'on ne le croit",
      body: "L'activité hors sport (NEAT) peut représenter plusieurs centaines de kcal par jour et chute souvent en sèche. Une marche de 15 min après les repas est un levier simple.",
      article: "pas-neat",
      evidence: "solide",
    };
  }
  if (weighIns < 3 && (goal === "cut" || goal === "bulk")) {
    return {
      id: "weigh",
      title: "Pèse-toi plus souvent, stresse moins",
      body: "Avec 3–7 pesées par semaine, la moyenne sur 7 jours lisse les variations d'eau et de glycogène. Une seule pesée peut varier de 1 kg sans changement de graisse.",
      article: "fluctuations-poids",
      evidence: "solide",
    };
  }
  const trainingDays = last7.filter((d) => d.sessionsDone > 0).length;
  if (trainingDays >= 3) {
    return {
      id: "overload",
      title: "Surcharge progressive",
      body: "Ajoute 1 rep ou un petit incrément de charge quand tu atteins le haut de ta fourchette sur toutes les séries. C'est le moteur principal de la progression.",
      article: "surcharge-progressive",
      evidence: "solide",
    };
  }
  const pool: Tip[] = [
    {
      id: "failure",
      title: "Près de l'échec, pas forcément à l'échec",
      body: "S'arrêter à 1–3 répétitions de l'échec produit une hypertrophie comparable avec moins de fatigue. Garde l'échec pour les dernières séries d'isolation.",
      article: "proximite-echec",
      evidence: "solide",
    },
    {
      id: "creatine",
      title: "Créatine monohydrate",
      body: "3–5 g par jour, tous les jours. C'est l'un des compléments les plus étudiés pour la force et la masse maigre. Le moment de prise importe peu.",
      article: "creatine",
      evidence: "solide",
    },
    {
      id: "fiber",
      title: "Les fibres rassasient",
      body: "Légumes, légumineuses, fruits et céréales complètes augmentent le volume des repas pour peu de calories : un allié direct en sèche.",
      article: "densite-calorique",
      evidence: "solide",
    },
    {
      id: "rest",
      title: "Repose-toi assez entre les séries",
      body: "Sur les exercices lourds polyarticulaires, 2–3 min de repos permettent de garder plus de répétitions et plus de volume utile.",
      article: "repos-entre-series",
      evidence: "limitée",
    },
  ];
  const idx = Number(today.replaceAll("-", "")) % pool.length;
  return pool[idx];
}

export interface Correlation {
  id: string;
  text: string;
  n: [number, number];
  diffPct: number;
}

function compare(
  id: string,
  days: DayData[],
  split: (d: DayData) => boolean | null,
  metric: (d: DayData) => number | null,
  describe: (diffPct: number) => string,
): Correlation | null {
  const a: number[] = [];
  const b: number[] = [];
  for (const d of days) {
    const s = split(d);
    const m = metric(d);
    if (s == null || m == null) continue;
    (s ? a : b).push(m);
  }
  if (a.length < 4 || b.length < 4) return null;
  const ma = mean(a);
  const mb = mean(b);
  if (mb === 0) return null;
  const diffPct = ((ma - mb) / Math.abs(mb)) * 100;
  if (Math.abs(diffPct) < 5) return null;
  return { id, text: describe(diffPct), n: [a.length, b.length], diffPct };
}

/**
 * Simple split-group comparisons over the user's own history.
 * These are associations, never causal claims.
 */
export function findCorrelations(days: DayData[], t: Targets): Correlation[] {
  const withPrevSleep = days.map((d, i) => ({ d, prevSleep: i > 0 ? days[i - 1].sleepMin : undefined }));
  const out: (Correlation | null)[] = [
    compare(
      "sleep-volume",
      withPrevSleep.map(({ d, prevSleep }) => ({ ...d, sleepMin: prevSleep })),
      (d) => (d.sessionsDone > 0 && d.sleepMin != null ? d.sleepMin >= 420 : null),
      (d) => (d.sessionsDone > 0 && d.volume > 0 ? d.volume : null),
      (p) => `Après une nuit de 7 h ou plus, ton volume d'entraînement est en moyenne ${p > 0 ? "supérieur" : "inférieur"} de ${Math.abs(Math.round(p))} %.`,
    ),
    compare(
      "sleep-energy",
      days,
      (d) => (d.sleepMin != null && d.energy != null ? d.sleepMin >= 420 : null),
      (d) => d.energy ?? null,
      (p) => `Les jours où tu dors 7 h ou plus, ton énergie déclarée est ${p > 0 ? "plus haute" : "plus basse"} de ${Math.abs(Math.round(p))} %.`,
    ),
    compare(
      "protein-kcal",
      days,
      (d) => (d.entries > 0 ? d.protein >= t.protein * 0.95 : null),
      (d) => (d.entries > 0 && d.kcal >= 800 ? d.kcal : null),
      (p) => `Les jours où tu atteins tes protéines, tes calories totales sont ${p > 0 ? "plus élevées" : "plus basses"} de ${Math.abs(Math.round(p))} % en moyenne.`,
    ),
    compare(
      "training-steps",
      days,
      (d) => d.sessionsDone > 0,
      (d) => d.steps ?? null,
      (p) => `Les jours d'entraînement, tu fais ${Math.abs(Math.round(p))} % de pas ${p > 0 ? "en plus" : "en moins"}.`,
    ),
  ];
  return out.filter((c): c is Correlation => c != null);
}

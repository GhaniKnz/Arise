import type { GoalType, Targets } from "@/lib/db/types";
import { addDays, type DayKey } from "@/lib/utils/date";
import { mean } from "@/lib/utils/format";
import type { DayData } from "./game";
import { movingAverage, type Point } from "./trend";

export interface WeekStats {
  weekStart: DayKey;
  weekEnd: DayKey;
  weightStart: number | null;
  weightEnd: number | null;
  weightDelta: number | null;
  avgKcal: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  avgSleepMin: number | null;
  avgWaterMl: number | null;
  sessions: number;
  plannedSessions: number;
  volume: number;
  cardioMin: number;
  daysLogged: number;
  avgScore: number | null;
}

const avgOf = (vals: (number | undefined)[]) => {
  const v = vals.filter((x): x is number => x != null && x > 0);
  return v.length ? mean(v) : null;
};

export function weekStats(days: DayData[], weights: Point[], weekStart: DayKey, scores?: Map<DayKey, number>): WeekStats {
  const weekEnd = addDays(weekStart, 6);
  const wd = days.filter((d) => d.date >= weekStart && d.date <= weekEnd);
  const logged = wd.filter((d) => d.entries > 0 && d.kcal >= 800);
  const avg = movingAverage(weights, 7);
  const atOrBefore = (k: DayKey) => avg.filter((p) => p.date <= k).at(-1)?.value ?? null;
  const weightStart = atOrBefore(addDays(weekStart, -1)) ?? avg.find((p) => p.date >= weekStart && p.date <= weekEnd)?.value ?? null;
  const weightEnd = atOrBefore(weekEnd);
  const scoreVals = scores ? wd.map((d) => scores.get(d.date)).filter((x): x is number => x != null) : [];
  return {
    weekStart,
    weekEnd,
    weightStart,
    weightEnd,
    weightDelta: weightStart != null && weightEnd != null ? weightEnd - weightStart : null,
    avgKcal: logged.length ? mean(logged.map((d) => d.kcal)) : null,
    avgProtein: logged.length ? mean(logged.map((d) => d.protein)) : null,
    avgSteps: avgOf(wd.map((d) => d.steps)),
    avgSleepMin: avgOf(wd.map((d) => d.sleepMin)),
    avgWaterMl: avgOf(wd.map((d) => d.waterMl)),
    sessions: wd.reduce((a, d) => a + d.sessionsDone, 0),
    plannedSessions: wd.filter((d) => d.workoutPlanned).length,
    volume: wd.reduce((a, d) => a + d.volume, 0),
    cardioMin: wd.reduce((a, d) => a + d.cardioMin, 0),
    daysLogged: logged.length,
    avgScore: scoreVals.length ? Math.round(mean(scoreVals)) : null,
  };
}

export interface ReportInsight {
  tone: "good" | "neutral" | "focus";
  text: string;
}

export interface WeeklyAnalysis {
  insights: ReportInsight[];
  recommendations: string[];
  focus: string | null;
}

/**
 * Rule-based weekly analysis. Every recommendation is conservative and
 * framed as an adjustment, based on the user's own targets.
 */
export function analyzeWeek(cur: WeekStats, prev: WeekStats | null, t: Targets, goal: GoalType, bodyWeight: number): WeeklyAnalysis {
  const insights: ReportInsight[] = [];
  const recs: string[] = [];
  let focus: string | null = null;
  const ratePct = cur.weightDelta != null && bodyWeight ? (cur.weightDelta / bodyWeight) * 100 : null;

  if (cur.weightDelta != null && ratePct != null) {
    if (goal === "cut") {
      if (ratePct <= -1.1) {
        insights.push({ tone: "focus", text: "Ta perte est rapide (> 1 % du poids/semaine). Au-delà, le risque de perdre du muscle et de la performance augmente." });
        recs.push("Ajouter environ 100–200 kcal/jour pour ralentir légèrement le rythme");
      } else if (ratePct <= -0.35) {
        insights.push({ tone: "good", text: "Ta perte de poids correspond à ton objectif actuel." });
        recs.push("Maintenir les calories actuelles");
      } else if (ratePct < 0.1) {
        insights.push({ tone: "neutral", text: "Ta tendance est quasi stable cette semaine. Une semaine isolée peut être masquée par l'eau." });
        if (prev?.weightDelta != null && prev.weightDelta > -0.15 && cur.daysLogged >= 5) {
          recs.push("Deux semaines de stagnation : réduire de ~100–150 kcal/jour OU ajouter ~1 500 pas/jour");
        } else {
          recs.push("Attendre une semaine de plus avant d'ajuster (les variations d'eau masquent souvent la perte)");
        }
      } else {
        insights.push({ tone: "focus", text: "Ta moyenne a légèrement augmenté. Vérifie la régularité de la saisie des repas avant de changer quoi que ce soit." });
      }
    } else if (goal === "bulk") {
      if (ratePct > 0.5) {
        insights.push({ tone: "focus", text: "Ta prise est rapide : une partie risque d'être du gras." });
        recs.push("Réduire le surplus d'environ 100–150 kcal/jour");
      } else if (ratePct >= 0.08) {
        insights.push({ tone: "good", text: "Ta prise de poids est progressive, idéale pour limiter le gras." });
      } else {
        insights.push({ tone: "neutral", text: "Ton poids stagne : le surplus est peut-être insuffisant." });
        recs.push("Ajouter ~100–150 kcal/jour (glucides autour de l'entraînement)");
      }
    } else {
      insights.push({
        tone: Math.abs(ratePct) < 0.4 ? "good" : "neutral",
        text: Math.abs(ratePct) < 0.4 ? "Ton poids est stable, cohérent avec ton objectif." : "Ton poids bouge plus que prévu pour un objectif de stabilité.",
      });
    }
  }

  if (cur.avgProtein != null) {
    if (cur.avgProtein >= t.protein * 0.95) insights.push({ tone: "good", text: "Tes protéines sont bien maintenues." });
    else {
      insights.push({ tone: "focus", text: `Protéines moyennes à ${Math.round(cur.avgProtein)} g pour un objectif de ${t.protein} g.` });
      recs.push("Ajouter une source de protéines à un repas (skyr, œufs, poulet, whey…)");
      focus ??= "protéines";
    }
  }

  if (cur.avgSteps != null && prev?.avgSteps) {
    const delta = (cur.avgSteps - prev.avgSteps) / prev.avgSteps;
    if (Math.abs(delta) >= 0.05) {
      insights.push({ tone: delta > 0 ? "good" : "neutral", text: `Ton activité a ${delta > 0 ? "augmenté" : "baissé"} de ${Math.round(Math.abs(delta) * 100)} %.` });
    }
  }
  if (cur.avgSteps != null && cur.avgSteps < t.steps * 0.8) {
    recs.push(`Viser au moins ${Math.round((t.steps * 0.9) / 500) * 500} pas/jour`);
  }

  if (cur.plannedSessions > 0) {
    if (cur.sessions >= cur.plannedSessions) {
      insights.push({ tone: "good", text: `Toutes les séances prévues ont été réalisées (${cur.sessions}/${cur.plannedSessions}).` });
      recs.push(`Conserver ${cur.plannedSessions} séances`);
    } else {
      insights.push({ tone: "neutral", text: `${cur.sessions} séance(s) sur ${cur.plannedSessions} prévues.` });
      focus ??= "régularité des séances";
    }
  }

  if (cur.avgSleepMin != null) {
    if (cur.avgSleepMin < t.sleepMin - 20) {
      insights.push({ tone: "focus", text: "Ton sommeil reste le facteur principal à améliorer." });
      recs.push(`Viser ${Math.floor(t.sleepMin / 60)} h ${String(t.sleepMin % 60).padStart(2, "0")} de sommeil (heure de coucher fixe)`);
      focus = "sommeil";
    } else {
      insights.push({ tone: "good", text: "Ton sommeil est dans ta cible." });
    }
  }

  if (cur.daysLogged < 5) {
    insights.push({ tone: "neutral", text: `Repas saisis ${cur.daysLogged} jour(s) sur 7 : plus la saisie est complète, plus l'analyse est fiable.` });
  }

  return { insights, recommendations: [...new Set(recs)].slice(0, 5), focus };
}

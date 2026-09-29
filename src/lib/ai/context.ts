import type { GameState } from "@/components/providers/GameProvider";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import { GOAL_LABELS, ACTIVITY_LABELS } from "@/lib/domain/energy";
import type { WeekStats } from "@/lib/domain/report";
import { e1rm } from "@/lib/domain/strength";
import { addDays, weekdayIndex, WEEKDAYS_LONG } from "@/lib/utils/date";

const n1 = (v: number | null | undefined) => (v == null ? "n/d" : (Math.round(v * 10) / 10).toString());
const n0 = (v: number | null | undefined) => (v == null ? "n/d" : Math.round(v).toString());

/** Compact, factual text summary of the user's data for the AI coach. */
export function buildCoachContext(g: GameState): string {
  const p = g.profile;
  if (!p) return "Aucun profil.";
  const lines: string[] = [];
  const age = new Date().getFullYear() - p.birthYear;
  lines.push(`Date du jour : ${g.today} (${WEEKDAYS_LONG[weekdayIndex(g.today)]}).`);
  lines.push(`Profil : ${p.name}, ${p.sex === "male" ? "homme" : "femme"}, ${age} ans, ${p.heightCm} cm. Objectif : ${GOAL_LABELS[p.goal].label} (${p.startWeightKg} → ${p.targetWeightKg} kg). Activité : ${ACTIVITY_LABELS[p.activity].label}. Expérience muscu : ${p.experience}.`);
  const t = p.targets;
  lines.push(`Cibles : ${t.kcal} kcal, protéines ${t.protein} g, glucides ${t.carbs} g, lipides ${t.fat} g, fibres ${t.fiber} g, eau ${t.waterMl} ml, ${t.steps} pas, sommeil ${t.sleepMin} min.`);
  lines.push(
    `Poids : dernière pesée ${n1(g.trend.latest?.value)} kg (${g.trend.latest?.date ?? "n/d"}), moyenne 7 j ${n1(g.trend.average7)} kg, tendance ${n1(g.trend.weeklyRate)} kg/semaine, variation 7 j ${n1(g.trend.weekChange)} kg.`,
  );
  if (g.adaptive) lines.push(`Maintenance adaptative estimée : ${g.adaptive.tdee} kcal (apport moyen ${g.adaptive.avgIntake} kcal sur ${g.adaptive.daysLogged} jours, fiabilité ${g.adaptive.confidence}).`);
  lines.push(`Progression RPG : niveau ${g.ledger.level.level}, série actuelle ${g.ledger.streak.current} jours (record ${g.ledger.streak.best}).`);

  lines.push("14 derniers jours (date | kcal | prot | gluc | lip | pas | sommeil min | eau ml | énergie | séance | poids | score) :");
  for (let i = 13; i >= 0; i--) {
    const d = addDays(g.today, -i);
    const day = g.dayMap.get(d);
    const l = g.ledger.days.get(d);
    if (!day) continue;
    lines.push(
      `${d} | ${day.entries ? n0(day.kcal) : "-"} | ${day.entries ? n0(day.protein) : "-"} | ${day.entries ? n0(day.carbs) : "-"} | ${day.entries ? n0(day.fat) : "-"} | ${day.steps ?? "-"} | ${day.sleepMin ?? "-"} | ${day.waterMl ?? "-"} | ${day.energy ?? "-"} | ${day.sessionsDone ? "oui" : day.workoutPlanned ? "prévue non faite" : "repos"} | ${day.weightKg ?? "-"} | ${l?.score.tracked ? l.score.total : "-"}`,
    );
  }

  const sessions = g.raw.sessions.filter((s) => s.status === "done").sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 6);
  if (sessions.length) {
    lines.push("Dernières séances (meilleure série par exercice) :");
    for (const s of sessions) {
      const sets = g.raw.sets.filter((x) => x.sessionId === s.id && x.done && !x.warmup);
      const byEx = new Map<string, typeof sets>();
      for (const x of sets) byEx.set(x.exerciseId, [...(byEx.get(x.exerciseId) ?? []), x]);
      const parts = [...byEx.entries()].map(([id, xs]) => {
        const top = xs.reduce((a, b) => (e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
        return `${EXERCISE_BY_ID.get(id)?.name ?? id} ${top.weightKg}kg×${top.reps} (${xs.length} séries)`;
      });
      lines.push(`- ${s.date} ${s.name}${s.rpe ? ` RPE ${s.rpe}` : ""} : ${parts.join(" ; ")}`);
    }
  }
  const recentPRs = g.prs.filter((p) => p.date >= addDays(g.today, -30));
  if (recentPRs.length) lines.push(`Records des 30 derniers jours : ${recentPRs.map((p) => `${EXERCISE_BY_ID.get(p.exerciseId)?.name ?? p.exerciseId} ${p.weightKg}kg×${p.reps}`).join(" ; ")}.`);
  return lines.join("\n");
}

export function buildReportContext(cur: WeekStats, prev: WeekStats | null, g: GameState): string {
  const fmt = (w: WeekStats) =>
    [
      `Semaine du ${w.weekStart} au ${w.weekEnd}`,
      `poids moyen début ${n1(w.weightStart)} kg → fin ${n1(w.weightEnd)} kg (Δ ${n1(w.weightDelta)} kg)`,
      `calories moyennes ${n0(w.avgKcal)} kcal (${w.daysLogged} jours saisis)`,
      `protéines ${n0(w.avgProtein)} g/j`,
      `pas ${n0(w.avgSteps)}/j`,
      `séances ${w.sessions}/${w.plannedSessions} prévues, volume ${n0(w.volume)} kg, cardio ${w.cardioMin} min`,
      `sommeil ${n0(w.avgSleepMin)} min/nuit, eau ${n0(w.avgWaterMl)} ml/j`,
      `score moyen ${n0(w.avgScore)}/100`,
    ].join(" ; ");
  const p = g.profile!;
  return [
    `Objectif : ${GOAL_LABELS[p.goal].label}, ${p.startWeightKg} → ${p.targetWeightKg} kg. Cibles : ${p.targets.kcal} kcal, ${p.targets.protein} g protéines, ${p.targets.steps} pas, ${p.targets.sleepMin} min de sommeil.`,
    g.adaptive ? `Maintenance adaptative : ${g.adaptive.tdee} kcal.` : "Maintenance adaptative : pas encore disponible.",
    `Cette semaine : ${fmt(cur)}.`,
    prev ? `Semaine précédente : ${fmt(prev)}.` : "Pas de semaine précédente.",
  ].join("\n");
}

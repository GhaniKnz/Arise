import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { db } from "../index";
import { seedDemo } from "../seed";
import { aggregateDays } from "@/lib/domain/aggregate";
import { buildLedger } from "@/lib/domain/game";
import { derivePRs } from "@/lib/domain/strength";
import { adaptiveTdee, weightTrend } from "@/lib/domain/trend";
import { addDays, todayKey } from "@/lib/utils/date";
import { logFood, updateEntryGrams, deleteEntries } from "../repos/nutrition";
import { startSession, setDone, finishSession, addSet } from "../repos/workout";
import { upsertDailyLog, addWater } from "../repos/body";
import { FOOD_BY_ID } from "@/lib/data/foods";

describe("demo seed", () => {
  it("produces a coherent, levelled-up history", async () => {
    await seedDemo(45);
    const profile = (await db.profile.get("me"))!;
    expect(profile.name).toBe("Ghani");
    const raw = {
      entries: await db.foodEntries.toArray(),
      logs: await db.dailyLogs.toArray(),
      sessions: await db.sessions.toArray(),
      sets: await db.sets.toArray(),
      cardio: await db.cardio.toArray(),
      metrics: await db.bodyMetrics.toArray(),
    };
    const today = todayKey();
    const days = aggregateDays(raw, profile.startDate, today, profile.schedule);
    expect(days).toHaveLength(45);
    const prs = derivePRs(raw.sets);
    const prsByDate = new Map<string, number>();
    prs.forEach((p) => prsByDate.set(p.date, (prsByDate.get(p.date) ?? 0) + 1));
    const ledger = buildLedger({ days, targets: profile.targets, goal: profile.goal, quests: profile.quests, prsByDate, today });
    console.log("level", ledger.level, "streak", ledger.streak, "prs", prs.length, "stats", ledger.stats);
    const weights = raw.metrics.filter((m) => m.weightKg).map((m) => ({ date: m.date, value: m.weightKg! }));
    const trend = weightTrend(weights, today);
    const intake = days.filter((d) => d.entries > 0 && d.date < today).map((d) => ({ date: d.date, value: d.kcal }));
    const adaptive = adaptiveTdee(weights, intake, addDays(today, -1));
    console.log("trend", trend.latest, trend.average7, trend.weeklyRate, "adaptive", adaptive, "targets", profile.targets);
    const avgKcal = intake.reduce((a, b) => a + b.value, 0) / intake.length;
    const avgP = days.filter((d) => d.entries > 0).reduce((a, d) => a + d.protein, 0) / days.filter((d) => d.entries > 0).length;
    console.log("avg kcal", Math.round(avgKcal), "avg protein", Math.round(avgP), "scores", days.slice(-10).map((d) => ledger.days.get(d.date)!.score.total));
    expect(ledger.level.level).toBeGreaterThan(5);
    expect(prs.length).toBeGreaterThan(3);
    expect(trend.weeklyRate!).toBeLessThan(0);
  });

  it("supports the core write flows", async () => {
    const today = todayKey();
    const chicken = FOOD_BY_ID.get("b:chicken_breast_cooked")!;
    const e = await logFood({ date: today, meal: "dinner", food: chicken, grams: 200 });
    expect(e.kcal).toBe(330);
    await updateEntryGrams(e, 100);
    expect((await db.foodEntries.get(e.id))!.kcal).toBe(165);
    await deleteEntries([e.id]);
    expect(await db.foodEntries.get(e.id)).toBeUndefined();
    expect(await db.tombstones.get(e.id)).toBeDefined();

    await upsertDailyLog(today, { steps: 12000 });
    const water = await addWater(today, 250);
    expect(water).toBeGreaterThan(250);
    expect((await db.dailyLogs.where("date").equals(today).first())!.steps).toBe(12000);

    const routine = (await db.routines.toArray()).find((r) => r.exercises.some((x) => x.exerciseId === "bench_press"))!;
    const s = await startSession({ routine });
    const sets = await db.sets.where("sessionId").equals(s.id).toArray();
    expect(sets.length).toBe(routine.exercises.reduce((a, x) => a + x.sets, 0));
    expect(sets[0].weightKg).toBeGreaterThan(0);
    await setDone(sets[0].id, true);
    await addSet(s, sets[0].exerciseId);
    await finishSession(s);
    const after = await db.sets.where("sessionId").equals(s.id).toArray();
    expect(after).toHaveLength(1);
    expect((await db.sessions.get(s.id))!.status).toBe("done");
  });
});

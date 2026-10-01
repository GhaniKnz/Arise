import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../index";
import { stamp } from "../repo";
import { deletePhoto, saveComparison } from "../repos/body";
import { addPastCycle, switchCycle, updateCycle } from "../repos/cycles";
import { titleFromFileName } from "../repos/music";
import { createProfile } from "../seed";
import type { ProgressPhoto } from "../types";
import { addDays, todayKey } from "@/lib/utils/date";

const answers = { name: "Test", goal: "cut" as const, sex: "male" as const, age: 30, heightCm: 180, weightKg: 85, targetWeightKg: 78, activity: "moderate" as const, sessionsPerWeek: 4, experience: "intermediate" as const };

describe("cycles", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it("records the initial cycle, closes it and follows the new goal on a switch", async () => {
    const today = todayKey();
    const start = addDays(today, -60);
    await createProfile(answers, { startDate: start });
    const before = (await db.profile.get("me"))!;

    const switchDay = addDays(today, -5);
    await switchCycle({ goal: "bulk", startDate: switchDay, currentWeightKg: 79.4, targetWeightKg: 83, weeklyRatePct: 0.2 });

    const cycles = await db.cycles.orderBy("startDate").toArray();
    expect(cycles.map((c) => [c.goal, c.startDate, c.endDate])).toEqual([
      ["cut", start, addDays(switchDay, -1)],
      ["bulk", switchDay, undefined],
    ]);
    expect(cycles[0]).toMatchObject({ startWeightKg: 85, targetWeightKg: 78, kcalTarget: before.targets.kcal });
    const p = (await db.profile.get("me"))!;
    expect(p).toMatchObject({ goal: "bulk", targetWeightKg: 83, weeklyRatePct: 0.2, startWeightKg: 79.4 });
    expect(p.targets.kcal).toBeGreaterThan(before.targets.kcal);
    expect(cycles[1].kcalTarget).toBe(p.targets.kcal);
  });

  it("replaces a cycle started the same day instead of leaving an empty one", async () => {
    const today = todayKey();
    await createProfile(answers, { startDate: addDays(today, -30) });
    await switchCycle({ goal: "bulk", startDate: today, currentWeightKg: 80, targetWeightKg: 83, weeklyRatePct: 0.2 });
    await switchCycle({ goal: "maintain", startDate: today, currentWeightKg: 80, targetWeightKg: 80, weeklyRatePct: 0 });
    const cycles = await db.cycles.orderBy("startDate").toArray();
    expect(cycles.map((c) => c.goal)).toEqual(["cut", "maintain"]);
    expect(cycles[0].endDate).toBe(addDays(today, -1));
  });

  it("keeps past cycles as memory without touching the profile, and edits keep untouched fields", async () => {
    const today = todayKey();
    await createProfile(answers, { startDate: addDays(today, -10) });
    const c = await addPastCycle({ goal: "bulk", startDate: addDays(today, -200), endDate: addDays(today, -100), name: " Hiver " });
    expect(c.name).toBe("Hiver");
    expect((await db.profile.get("me"))!.goal).toBe("cut");
    expect(await db.cycles.count()).toBe(2);
    await updateCycle(c.id, { note: "Bien passé" });
    expect(await db.cycles.get(c.id)).toMatchObject({ name: "Hiver", note: "Bien passé", goal: "bulk" });
  });
});

describe("before / after comparisons", () => {
  beforeEach(async () => {
    await Promise.all([db.photos.clear(), db.comparisons.clear(), db.tombstones.clear()]);
  });

  it("does not duplicate a pair and is removed with its photo", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    const [a, b] = [stamp<ProgressPhoto>({ date: "2026-01-01", pose: "front", blob, thumb: blob }), stamp<ProgressPhoto>({ date: "2026-03-01", pose: "front", blob, thumb: blob })];
    await db.photos.bulkAdd([a, b]);
    expect((await saveComparison(a.id, b.id)).created).toBe(true);
    expect((await saveComparison(a.id, b.id)).created).toBe(false);
    expect(await db.comparisons.count()).toBe(1);
    await deletePhoto(a.id);
    expect(await db.comparisons.count()).toBe(0);
    expect((await db.tombstones.toArray()).map((t) => t.table).sort()).toEqual(["comparisons", "photos"]);
  });
});

describe("music", () => {
  it("turns a file name into a readable title", () => {
    expect(titleFromFileName("03 - Dark_Aria (Official).mp3")).toBe("Dark Aria (Official)");
    expect(titleFromFileName("LEveL.m4a")).toBe("LEveL");
    expect(titleFromFileName(".mp3")).toBe("Piste sans titre");
  });
});

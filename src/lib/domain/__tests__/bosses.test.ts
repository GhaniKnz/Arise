import { describe, expect, it } from "vitest";
import { bossPath, bossStates, FINAL_BOSS_XP, nextBoss } from "../bosses";

describe("boss path", () => {
  it("splits a cut into round floors ending on the target", () => {
    const path = bossPath(80, 72);
    expect(path.map((b) => b.atKg)).toEqual([78, 76, 74, 72]);
    expect(path.at(-1)).toMatchObject({ final: true, xp: FINAL_BOSS_XP, pos: 1 });
    expect(path[0].pos).toBeCloseTo(0.25);
  });

  it("keeps at most 6 floors and merges a sliver last floor", () => {
    expect(bossPath(80, 73).map((b) => b.atKg)).toEqual([78, 76, 74, 73]);
    expect(bossPath(80, 73.8).map((b) => b.atKg)).toEqual([78, 76, 73.8]);
    expect(bossPath(80, 74).map((b) => b.atKg)).toEqual([79, 78, 77, 76, 75, 74]);
    expect(bossPath(100, 80).length).toBeLessThanOrEqual(6);
    expect(bossPath(80, 79.8)).toEqual([]);
  });

  it("works for a gain", () => {
    const path = bossPath(70, 78);
    expect(path.map((b) => b.atKg)).toEqual([72, 74, 76, 78]);
    expect(path.at(-1)?.name).toBe("Titan de la Masse");
  });

  it("defeats bosses when the 7-day average crosses their floor", () => {
    const path = bossPath(80, 72);
    const series = [
      { date: "2026-09-01", avg: 80 },
      { date: "2026-09-10", avg: 78.4 },
      { date: "2026-09-15", avg: 77.9 },
      { date: "2026-09-20", avg: 78.2 },
    ];
    const states = bossStates(path, 80, series);
    expect(states.map((s) => s.defeated)).toEqual([true, false, false, false]);
    expect(states[0].defeatedOn).toBe("2026-09-15");
    const next = nextBoss(states, 80, 77);
    expect(next?.boss.atKg).toBe(76);
    expect(next?.remainingKg).toBeCloseTo(1);
    expect(next?.hp).toBeCloseTo(0.5);
  });
});

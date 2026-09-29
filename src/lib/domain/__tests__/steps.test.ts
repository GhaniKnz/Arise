import { describe, expect, it } from "vitest";
import { parseStepsText } from "../steps";

const today = "2026-09-29";

describe("parseStepsText", () => {
  it("reads a bare number for today, whatever the separators", () => {
    expect(parseStepsText("8432", today)).toEqual([{ date: today, steps: 8432 }]);
    expect(parseStepsText("8 432", today)).toEqual([{ date: today, steps: 8432 }]);
    expect(parseStepsText("8 432 pas", today)).toEqual([{ date: today, steps: 8432 }]);
    expect(parseStepsText("8,432", today)).toEqual([{ date: today, steps: 8432 }]);
    expect(parseStepsText("8432,0", today)).toEqual([{ date: today, steps: 8432 }]);
    expect(parseStepsText("ARISE pas : 12 050", today)).toEqual([{ date: today, steps: 12050 }]);
  });

  it("reads dated lines (ISO or French) and ignores times", () => {
    expect(parseStepsText("2026-09-28 10 120\n29/09/2026 21:04 6 800", today)).toEqual([
      { date: "2026-09-28", steps: 10120 },
      { date: "2026-09-29", steps: 6800 },
    ]);
  });

  it("rejects text without a plausible count", () => {
    expect(parseStepsText("bonjour", today)).toEqual([]);
    expect(parseStepsText("0", today)).toEqual([]);
    expect(parseStepsText("999999", today)).toEqual([]);
  });
});

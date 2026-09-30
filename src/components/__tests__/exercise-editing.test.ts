import { describe, expect, it } from "vitest";
import { POSES, suggestPoses } from "@/components/icons/PoseIcon";
import { splitSteps } from "@/components/workout/StepsEditor";

describe("movement silhouettes", () => {
  it("suggests the movement from an exercise name", () => {
    expect(suggestPoses("Développé couché")[0]).toBe("bench");
    expect(suggestPoses("Tractions pronation")[0]).toBe("pullup");
    expect(suggestPoses("Squat bulgare")).toEqual(expect.arrayContaining(["lunge", "squat"]));
    expect(suggestPoses("Fentes marchées")[0]).toBe("lunge");
    expect(suggestPoses("Élévations latérales")[0]).toBe("lateral");
    expect(suggestPoses("Presse à cuisses")).toEqual(["legpress"]);
  });

  it("matches keywords at word starts only", () => {
    // "velo" is inside "développé" but is not a word of its own.
    expect(suggestPoses("Développé haltères")).not.toContain("bike");
    expect(suggestPoses("Vélo")).toEqual(["bike"]);
    expect(suggestPoses("ab")).toEqual([]);
  });

  it("has a label and a body for every silhouette", () => {
    for (const [key, p] of Object.entries(POSES)) {
      expect(p.label, key).toBeTruthy();
      expect(p.body.length, key).toBeGreaterThan(0);
    }
  });
});

describe("pasted instructions", () => {
  it("splits lines and drops list markers", () => {
    expect(splitSteps("1. Allonge-toi sur le banc\n2) Descends la barre\n\n- Pousse\n• Expire")).toEqual(["Allonge-toi sur le banc", "Descends la barre", "Pousse", "Expire"]);
    expect(splitSteps("Une seule étape")).toEqual(["Une seule étape"]);
  });
});

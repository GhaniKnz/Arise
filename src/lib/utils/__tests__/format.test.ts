import { describe, expect, it } from "vitest";
import { plainDashes } from "../format";

describe("plainDashes", () => {
  it("turns em dash separators into commas", () => {
    expect(plainDashes("Bonne semaine — continue comme ça.")).toBe("Bonne semaine, continue comme ça.");
    expect(plainDashes("Protéines—au top")).toBe("Protéines, au top");
  });

  it("does not leave a comma before punctuation or at the start of a line", () => {
    expect(plainDashes("Pense aux pas —.")).toBe("Pense aux pas.");
    expect(plainDashes("— Bois plus d'eau")).toBe("Bois plus d'eau");
  });

  it("leaves text without em dashes untouched", () => {
    expect(plainDashes("0,5–0,7 % par semaine, −1,2 kg")).toBe("0,5–0,7 % par semaine, −1,2 kg");
  });
});

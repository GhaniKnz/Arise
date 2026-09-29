import { describe, expect, it } from "vitest";
import { isValidBarcode, offToFood } from "../off";

describe("offToFood", () => {
  it("maps a complete product", () => {
    const f = offToFood({
      code: "3017620422003",
      product_name: "Nutella",
      brands: "Nutella, Ferrero",
      nova_group: 4,
      categories_tags: ["en:spreads", "en:sweet-spreads"],
      nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, "saturated-fat_100g": 10.6, sugars_100g: 56.3, salt_100g: 0.107 },
      serving_quantity: 15,
    });
    expect(f).toMatchObject({ id: "off:3017620422003", brand: "Nutella", category: "sweets", kcal: 539, nova: 4, defaultGrams: 15, source: "off" });
  });
  it("derives kcal from kJ and flags drinks", () => {
    const f = offToFood({ code: "123456789", product_name: "Bière", brands: ["X"], categories_tags: ["en:beverages", "en:alcoholic-beverages"], nutriments: { "energy-kj_100g": 180, proteins_100g: 0.4, carbohydrates_100g: 3, fat_100g: 0 } });
    expect(f?.kcal).toBe(43);
    expect(f?.unit).toBe("ml");
    expect(f?.alcohol).toBe(true);
  });
  it("rejects incomplete data", () => {
    expect(offToFood({ code: "1", product_name: "x", nutriments: { proteins_100g: 1 } })).toBeNull();
  });
  it("validates barcodes", () => {
    expect(isValidBarcode("3017620422003")).toBe(true);
    expect(isValidBarcode("abc")).toBe(false);
  });
});

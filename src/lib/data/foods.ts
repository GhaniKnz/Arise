import type { FoodCategory, FoodItem, Nova, Portion } from "@/lib/db/types";

/**
 * Built-in reference foods, values per 100 g (or 100 ml for drinks).
 * Typical values compiled from the ANSES CIQUAL and USDA FoodData Central tables;
 * brands vary, so packaged products are best added by barcode.
 */

export const CATEGORY_META: Record<FoodCategory, { label: string; emoji: string }> = {
  meat: { label: "Viandes", emoji: "🥩" },
  fish: { label: "Poissons & fruits de mer", emoji: "🐟" },
  eggs: { label: "Œufs", emoji: "🥚" },
  dairy: { label: "Produits laitiers", emoji: "🥛" },
  plant_protein: { label: "Protéines végétales", emoji: "🌱" },
  grains: { label: "Féculents & céréales", emoji: "🍚" },
  bread: { label: "Pains", emoji: "🥖" },
  legumes: { label: "Légumineuses", emoji: "🫘" },
  vegetables: { label: "Légumes", emoji: "🥦" },
  fruits: { label: "Fruits", emoji: "🍎" },
  nuts: { label: "Oléagineux", emoji: "🥜" },
  fats: { label: "Matières grasses", emoji: "🫒" },
  sweets: { label: "Sucré", emoji: "🍫" },
  snacks: { label: "Snacks", emoji: "🍿" },
  drinks: { label: "Boissons", emoji: "🥤" },
  prepared: { label: "Plats préparés", emoji: "🍕" },
  sauces: { label: "Sauces & condiments", emoji: "🥫" },
  supplements: { label: "Compléments", emoji: "💊" },
  other: { label: "Autres", emoji: "🍽️" },
};

// [kcal, protein, carbs, fat, fiber, sugar, satFat, salt]
type N = [number, number, number, number, number, number, number, number];

interface Extra {
  alcohol?: boolean;
  portions?: Portion[];
  keywords?: string[];
  unit?: "ml";
  micros?: string[];
}

const P = (label: string, grams: number): Portion => ({ label, grams });

function f(id: string, name: string, category: FoodCategory, n: N, nova: Nova, defaultGrams: number, extra: Extra = {}): FoodItem {
  const [kcal, protein, carbs, fat, fiber, sugar, satFat, salt] = n;
  return { id: `b:${id}`, name, category, kcal, protein, carbs, fat, fiber, sugar, satFat, salt, nova, defaultGrams, source: "builtin", ...extra };
}

export const FOODS: FoodItem[] = [
  /* ── Viandes ── */
  f("chicken_breast_raw", "Blanc de poulet (cru)", "meat", [120, 22.5, 0, 2.6, 0, 0, 0.7, 0.15], 1, 150, { portions: [P("1 filet", 150)], keywords: ["poulet", "chicken", "filet", "escalope"], micros: ["Vitamine B3", "Vitamine B6", "Sélénium"] }),
  f("chicken_breast_cooked", "Blanc de poulet grillé (cuit)", "meat", [165, 31, 0, 3.6, 0, 0, 1, 0.2], 1, 120, { portions: [P("1 filet cuit", 120)], keywords: ["poulet", "chicken", "grillé"], micros: ["Vitamine B3", "Vitamine B6", "Sélénium"] }),
  f("chicken_thigh", "Cuisse de poulet rôtie (avec peau)", "meat", [229, 23.3, 0, 14.7, 0, 0, 4.1, 0.2], 1, 150, { portions: [P("1 cuisse (sans os)", 150)], keywords: ["poulet", "pilon"] }),
  f("turkey_cutlet", "Escalope de dinde (crue)", "meat", [105, 23.6, 0, 1.2, 0, 0, 0.4, 0.15], 1, 130, { portions: [P("1 escalope", 130)], keywords: ["dinde", "turkey"] }),
  f("ground_beef_5", "Steak haché 5 % MG (cru)", "meat", [129, 21, 0, 5, 0, 0, 2.2, 0.2], 1, 100, { portions: [P("1 steak", 100), P("1 steak XL", 125)], keywords: ["boeuf", "bœuf", "viande hachée", "burger"], micros: ["Fer", "Zinc", "Vitamine B12"] }),
  f("ground_beef_15", "Steak haché 15 % MG (cru)", "meat", [209, 18.5, 0, 15, 0, 0, 6.5, 0.2], 1, 100, { portions: [P("1 steak", 100)], keywords: ["boeuf", "bœuf", "viande hachée"], micros: ["Fer", "Zinc", "Vitamine B12"] }),
  f("beef_rump", "Rumsteck de bœuf (cru)", "meat", [124, 22, 0, 4, 0, 0, 1.6, 0.15], 1, 150, { portions: [P("1 pièce", 180)], keywords: ["boeuf", "steak", "pavé"], micros: ["Fer", "Zinc", "Vitamine B12"] }),
  f("beef_ribeye", "Entrecôte (crue)", "meat", [190, 20, 0, 12, 0, 0, 5, 0.15], 1, 200, { portions: [P("1 entrecôte", 250)], keywords: ["boeuf", "steak"] }),
  f("pork_tenderloin", "Filet mignon de porc (cru)", "meat", [120, 21.5, 0, 3.5, 0, 0, 1.2, 0.15], 1, 150, { keywords: ["porc"] }),
  f("pork_chop", "Côte de porc (crue)", "meat", [190, 19.5, 0, 12.5, 0, 0, 4.4, 0.15], 1, 150, { portions: [P("1 côte", 160)], keywords: ["porc"] }),
  f("ham", "Jambon blanc découenné dégraissé", "meat", [113, 20.4, 1, 3, 0, 0.8, 1.1, 1.9], 3, 45, { portions: [P("1 tranche", 45)], keywords: ["jambon", "charcuterie"] }),
  f("turkey_slice", "Blanc de dinde (tranches)", "meat", [100, 20, 1, 1.8, 0, 0.8, 0.6, 2.0], 4, 40, { portions: [P("1 tranche", 30)], keywords: ["dinde", "charcuterie"] }),
  f("lardons", "Lardons fumés", "meat", [240, 16, 0.5, 19.5, 0, 0.5, 7.4, 2.4], 3, 50, { keywords: ["bacon", "porc"] }),
  f("saucisson", "Saucisson sec", "meat", [410, 25, 3, 33, 0, 1, 12, 4.5], 4, 30, { portions: [P("5 rondelles", 30)], keywords: ["charcuterie", "apéro"] }),
  f("chorizo", "Chorizo", "meat", [455, 24, 2, 39, 0, 1, 14, 4], 4, 30, { keywords: ["charcuterie"] }),
  f("merguez", "Merguez", "meat", [290, 16, 1, 25, 0, 0.5, 10, 2.3], 3, 100, { portions: [P("1 merguez", 50)], keywords: ["saucisse", "barbecue"] }),
  f("sausage", "Saucisse de Toulouse", "meat", [280, 15, 1, 24, 0, 0.5, 9, 1.8], 3, 100, { portions: [P("1 saucisse", 100)], keywords: ["saucisse"] }),
  f("duck_breast", "Magret de canard (sans peau, cru)", "meat", [130, 20, 0, 5.5, 0, 0, 1.8, 0.2], 1, 150, { keywords: ["canard"] }),
  f("lamb", "Gigot d'agneau (cuit)", "meat", [230, 26, 0, 14, 0, 0, 6, 0.2], 1, 150, { keywords: ["agneau"] }),
  f("veal", "Escalope de veau (crue)", "meat", [110, 22, 0, 2.3, 0, 0, 0.8, 0.2], 1, 130, { keywords: ["veau"] }),

  /* ── Poissons ── */
  f("salmon", "Saumon (cru)", "fish", [200, 20, 0, 13, 0, 0, 2.5, 0.15], 1, 130, { portions: [P("1 pavé", 130)], keywords: ["salmon", "poisson"], micros: ["Oméga-3 (EPA/DHA)", "Vitamine D", "Vitamine B12"] }),
  f("smoked_salmon", "Saumon fumé", "fish", [180, 22, 0.5, 10, 0, 0.5, 1.8, 3], 3, 40, { portions: [P("1 tranche", 20)], keywords: ["poisson", "fumé"], micros: ["Oméga-3 (EPA/DHA)"] }),
  f("tuna_water", "Thon au naturel (égoutté)", "fish", [110, 25, 0, 1, 0, 0, 0.3, 0.8], 3, 100, { portions: [P("1 boîte (égouttée)", 104)], keywords: ["thon", "tuna", "conserve"], micros: ["Sélénium", "Vitamine B12"] }),
  f("tuna_oil", "Thon à l'huile (égoutté)", "fish", [190, 26, 0, 9.5, 0, 0, 1.6, 0.8], 3, 100, { keywords: ["thon", "conserve"] }),
  f("cod", "Cabillaud (cru)", "fish", [82, 18, 0, 0.7, 0, 0, 0.1, 0.2], 1, 150, { portions: [P("1 filet", 150)], keywords: ["poisson blanc", "morue"] }),
  f("pollock", "Colin / lieu (cru)", "fish", [80, 17.5, 0, 1, 0, 0, 0.2, 0.2], 1, 150, { keywords: ["poisson blanc", "lieu"] }),
  f("shrimp", "Crevettes cuites décortiquées", "fish", [95, 21, 0, 1, 0, 0, 0.2, 1.2], 1, 100, { keywords: ["crevette", "gambas", "fruits de mer"] }),
  f("sardines", "Sardines à l'huile (égouttées)", "fish", [210, 24, 0, 12.5, 0, 0, 2.8, 0.8], 3, 90, { portions: [P("1 boîte (égouttée)", 90)], keywords: ["sardine", "conserve"], micros: ["Oméga-3 (EPA/DHA)", "Calcium", "Vitamine D"] }),
  f("mackerel", "Maquereau (cru)", "fish", [205, 19, 0, 14, 0, 0, 3.3, 0.2], 1, 120, { keywords: ["poisson gras"], micros: ["Oméga-3 (EPA/DHA)", "Vitamine D"] }),
  f("surimi", "Surimi", "fish", [110, 8, 15, 1.5, 0, 5, 0.3, 1.8], 4, 60, { portions: [P("4 bâtonnets", 60)], keywords: ["crabe"] }),
  f("tilapia", "Tilapia (cru)", "fish", [96, 20, 0, 1.7, 0, 0, 0.6, 0.1], 1, 150, { keywords: ["poisson blanc"] }),

  /* ── Œufs ── */
  f("egg", "Œuf entier", "eggs", [140, 12.5, 0.7, 9.8, 0, 0.4, 2.8, 0.3], 1, 50, { portions: [P("1 œuf moyen", 50), P("2 œufs", 100), P("3 œufs", 150)], keywords: ["oeuf", "eggs", "omelette"], micros: ["Choline", "Vitamine B12", "Vitamine D"] }),
  f("egg_white", "Blanc d'œuf", "eggs", [48, 10.5, 0.7, 0.2, 0, 0.7, 0, 0.4], 1, 100, { portions: [P("1 blanc", 33)], keywords: ["oeuf", "blanc"] }),

  /* ── Produits laitiers ── */
  f("skyr", "Skyr nature", "dairy", [60, 10.5, 4, 0.2, 0, 4, 0.1, 0.1], 1, 150, { portions: [P("1 pot", 150)], keywords: ["yaourt", "protéiné"], micros: ["Calcium"] }),
  f("fromage_blanc_0", "Fromage blanc 0 %", "dairy", [47, 7.5, 3.8, 0.1, 0, 3.8, 0.1, 0.1], 1, 150, { portions: [P("1 bol", 150)], keywords: ["faisselle"], micros: ["Calcium"] }),
  f("fromage_blanc_3", "Fromage blanc 3 %", "dairy", [76, 7, 3.7, 3.3, 0, 3.7, 2.1, 0.1], 1, 150, { keywords: ["faisselle"] }),
  f("greek_yogurt_0", "Yaourt grec 0 % (type Fage)", "dairy", [54, 10.3, 3, 0, 0, 3, 0, 0.1], 1, 170, { portions: [P("1 pot", 170)], keywords: ["yaourt", "grec"] }),
  f("greek_style_yogurt", "Yaourt à la grecque", "dairy", [125, 3.5, 4.5, 10, 0, 4.5, 6.5, 0.1], 2, 125, { portions: [P("1 pot", 125)], keywords: ["yaourt"] }),
  f("yogurt_plain", "Yaourt nature", "dairy", [57, 4.3, 5.4, 1.5, 0, 5.4, 1, 0.1], 1, 125, { portions: [P("1 pot", 125)], keywords: ["yaourt", "yogourt"], micros: ["Calcium"] }),
  f("yogurt_fruit", "Yaourt aux fruits sucré", "dairy", [100, 3.5, 15, 2.8, 0.3, 14, 1.8, 0.1], 4, 125, { portions: [P("1 pot", 125)], keywords: ["yaourt"] }),
  f("cottage", "Cottage cheese", "dairy", [98, 11, 3.4, 4.3, 0, 2.7, 2.7, 0.9], 3, 100, { keywords: ["fromage frais"] }),
  f("milk_semi", "Lait demi-écrémé", "dairy", [46, 3.3, 4.8, 1.6, 0, 4.8, 1, 0.1], 1, 250, { unit: "ml", portions: [P("1 verre", 200), P("1 bol", 250)], keywords: ["lait"], micros: ["Calcium", "Vitamine B2"] }),
  f("milk_skim", "Lait écrémé", "dairy", [34, 3.4, 4.9, 0.1, 0, 4.9, 0.1, 0.1], 1, 250, { unit: "ml", portions: [P("1 verre", 200)], keywords: ["lait"] }),
  f("milk_whole", "Lait entier", "dairy", [64, 3.2, 4.7, 3.6, 0, 4.7, 2.3, 0.1], 1, 250, { unit: "ml", keywords: ["lait"] }),
  f("emmental", "Emmental", "dairy", [380, 28.5, 0, 29.5, 0, 0, 18, 0.7], 3, 30, { portions: [P("1 portion", 30)], keywords: ["fromage", "râpé"], micros: ["Calcium"] }),
  f("comte", "Comté", "dairy", [415, 27, 0, 34, 0, 0, 21, 0.8], 3, 30, { portions: [P("1 portion", 30)], keywords: ["fromage"], micros: ["Calcium"] }),
  f("mozzarella", "Mozzarella", "dairy", [240, 18, 1, 18.5, 0, 1, 12, 0.5], 3, 125, { portions: [P("1 boule", 125)], keywords: ["fromage"] }),
  f("mozzarella_light", "Mozzarella allégée", "dairy", [165, 19, 1, 9.5, 0, 1, 6.3, 0.5], 3, 125, { keywords: ["fromage", "light"] }),
  f("feta", "Feta", "dairy", [265, 14, 1, 22.5, 0, 1, 15, 2.7], 3, 40, { keywords: ["fromage"] }),
  f("parmesan", "Parmesan", "dairy", [390, 33, 0, 28, 0, 0, 18, 1.6], 3, 10, { portions: [P("1 c. à soupe râpé", 10)], keywords: ["fromage"] }),
  f("camembert", "Camembert", "dairy", [290, 20, 0.5, 23, 0, 0.5, 15, 1.5], 3, 30, { portions: [P("1 part", 30)], keywords: ["fromage"] }),
  f("goat_cheese", "Fromage de chèvre (bûche)", "dairy", [300, 18, 1, 25, 0, 1, 17, 1.2], 3, 30, { keywords: ["fromage", "chevre"] }),
  f("butter", "Beurre", "fats", [745, 0.7, 0.6, 82, 0, 0.6, 53, 0.1], 2, 10, { portions: [P("1 noisette", 10)], keywords: ["beurre doux"] }),
  f("cream_30", "Crème fraîche épaisse 30 %", "dairy", [290, 2.3, 3, 30, 0, 3, 20, 0.1], 2, 30, { portions: [P("1 c. à soupe", 15)], keywords: ["creme"] }),
  f("cream_15", "Crème fraîche légère 15 %", "dairy", [160, 3, 4, 15, 0, 4, 10, 0.1], 3, 30, { portions: [P("1 c. à soupe", 15)], keywords: ["creme", "light"] }),

  /* ── Protéines végétales ── */
  f("tofu", "Tofu ferme nature", "plant_protein", [130, 13, 1.5, 7.8, 1, 0.5, 1.2, 0.02], 3, 125, { keywords: ["soja", "vegan"], micros: ["Calcium", "Fer"] }),
  f("tempeh", "Tempeh", "plant_protein", [190, 19, 9, 11, 6, 0.5, 2.2, 0.02], 3, 100, { keywords: ["soja", "vegan"] }),
  f("seitan", "Seitan", "plant_protein", [140, 25, 4, 2, 0.6, 0.5, 0.3, 1], 3, 100, { keywords: ["gluten", "vegan"] }),
  f("tvp", "Protéines de soja texturées (sèches)", "plant_protein", [340, 50, 18, 1.5, 17, 7, 0.2, 0.05], 3, 50, { keywords: ["soja", "pst", "vegan"] }),

  /* ── Féculents ── */
  f("rice_white_cooked", "Riz blanc (cuit)", "grains", [130, 2.7, 28, 0.3, 0.4, 0.1, 0.1, 0], 1, 200, { portions: [P("1 assiette", 200), P("1 bol", 150)], keywords: ["riz", "rice", "basmati", "thaï"] }),
  f("rice_white_raw", "Riz blanc (cru)", "grains", [355, 7, 79, 0.6, 1.3, 0.1, 0.2, 0], 1, 70, { portions: [P("1 portion crue", 70)], keywords: ["riz", "rice"] }),
  f("rice_brown_cooked", "Riz complet (cuit)", "grains", [123, 2.7, 25.6, 1, 1.6, 0.2, 0.2, 0], 1, 200, { keywords: ["riz", "complet"], micros: ["Magnésium"] }),
  f("pasta_cooked", "Pâtes (cuites)", "grains", [158, 5.8, 31, 0.9, 1.8, 0.6, 0.2, 0], 1, 200, { portions: [P("1 assiette", 220)], keywords: ["pates", "spaghetti", "penne", "pasta"] }),
  f("pasta_raw", "Pâtes (crues)", "grains", [355, 12.5, 72, 1.5, 3, 3, 0.3, 0], 1, 80, { portions: [P("1 portion crue", 80)], keywords: ["pates", "spaghetti", "pasta"] }),
  f("pasta_whole_cooked", "Pâtes complètes (cuites)", "grains", [150, 6, 28, 1.5, 4, 0.8, 0.3, 0], 1, 200, { keywords: ["pates", "complètes"] }),
  f("couscous_cooked", "Semoule / couscous (cuit)", "grains", [112, 3.8, 23, 0.2, 1.4, 0.1, 0, 0], 1, 180, { keywords: ["semoule", "couscous"] }),
  f("quinoa_cooked", "Quinoa (cuit)", "grains", [120, 4.4, 21.3, 1.9, 2.8, 0.9, 0.2, 0], 1, 180, { keywords: ["quinoa"], micros: ["Magnésium", "Fer"] }),
  f("bulgur_cooked", "Boulgour (cuit)", "grains", [83, 3, 18.6, 0.2, 4.5, 0.1, 0, 0], 1, 180, { keywords: ["boulgour", "blé"] }),
  f("oats", "Flocons d'avoine", "grains", [375, 13.5, 58.7, 7, 10, 1, 1.3, 0], 1, 50, { portions: [P("1 portion", 50), P("1 c. à soupe", 10)], keywords: ["avoine", "porridge", "oats"], micros: ["Magnésium", "Fer", "Bêta-glucanes"] }),
  f("potato_boiled", "Pomme de terre (cuite à l'eau)", "grains", [80, 2, 17, 0.1, 1.8, 0.8, 0, 0], 1, 200, { portions: [P("1 moyenne", 150)], keywords: ["patate", "pomme de terre"], micros: ["Potassium", "Vitamine C"] }),
  f("sweet_potato", "Patate douce (cuite)", "grains", [90, 2, 20.7, 0.2, 3.3, 6.5, 0, 0.1], 1, 200, { keywords: ["patate douce"], micros: ["Vitamine A", "Potassium"] }),
  f("fries", "Frites", "grains", [290, 3.4, 36, 14.5, 3.5, 0.3, 2.3, 0.5], 3, 150, { portions: [P("1 portion moyenne", 120), P("1 grande portion", 180)], keywords: ["frites", "fast food"] }),
  f("mashed_potato", "Purée de pommes de terre", "grains", [90, 2, 13, 3.4, 1.3, 1.5, 2, 0.4], 3, 200, { keywords: ["purée"] }),
  f("corn_flakes", "Corn flakes", "grains", [380, 7, 84, 0.9, 3, 8, 0.2, 1.1], 4, 40, { portions: [P("1 bol", 40)], keywords: ["céréales"] }),
  f("muesli", "Muesli", "grains", [370, 9, 64, 6.5, 8, 18, 1.2, 0.1], 3, 50, { keywords: ["céréales"] }),
  f("granola", "Granola", "grains", [450, 9, 60, 18, 7, 22, 3.5, 0.3], 4, 50, { keywords: ["céréales", "crunchy"] }),
  f("rice_cake", "Galettes de riz", "grains", [385, 8, 80, 3, 3.5, 0.5, 0.6, 0.2], 3, 10, { portions: [P("1 galette", 9)], keywords: ["galette"] }),

  /* ── Pains ── */
  f("baguette", "Baguette / pain blanc", "bread", [270, 9, 55, 1.2, 2.9, 2, 0.3, 1.3], 3, 60, { portions: [P("1/4 baguette", 60), P("1 tranche", 30)], keywords: ["pain", "baguette"] }),
  f("bread_whole", "Pain complet", "bread", [240, 9, 43, 2.5, 7, 3, 0.5, 1.2], 3, 40, { portions: [P("1 tranche", 40)], keywords: ["pain", "complet"], micros: ["Magnésium"] }),
  f("sandwich_bread_whole", "Pain de mie complet", "bread", [250, 9, 42, 4, 6, 5, 0.5, 1.1], 4, 50, { portions: [P("2 tranches", 50)], keywords: ["pain de mie"] }),
  f("sandwich_bread", "Pain de mie", "bread", [270, 8, 48, 4.5, 3, 6, 0.6, 1.2], 4, 50, { portions: [P("2 tranches", 50)], keywords: ["pain de mie"] }),
  f("rye_bread", "Pain de seigle", "bread", [230, 7, 44, 1.2, 7, 3, 0.2, 1.1], 3, 40, { keywords: ["pain", "seigle"] }),
  f("wrap", "Tortilla de blé (wrap)", "bread", [300, 8.5, 50, 7, 3, 3, 3, 1.2], 4, 60, { portions: [P("1 wrap", 60)], keywords: ["wrap", "tortilla", "galette"] }),
  f("burger_bun", "Pain à burger", "bread", [280, 9, 50, 5, 2.5, 6, 1.2, 1.1], 4, 60, { portions: [P("1 pain", 60)], keywords: ["bun"] }),
  f("rusk", "Biscottes", "bread", [400, 11, 72, 6, 4, 6, 1, 1.2], 4, 20, { portions: [P("2 biscottes", 20)], keywords: ["biscotte"] }),

  /* ── Légumineuses ── */
  f("lentils_cooked", "Lentilles (cuites)", "legumes", [116, 9, 20, 0.4, 7.9, 1.8, 0.1, 0], 1, 180, { keywords: ["lentilles"], micros: ["Fer", "Folates", "Potassium"] }),
  f("chickpeas_cooked", "Pois chiches (cuits)", "legumes", [164, 8.9, 27.4, 2.6, 7.6, 4.8, 0.3, 0], 1, 150, { keywords: ["pois chiche"], micros: ["Fer", "Folates"] }),
  f("kidney_beans", "Haricots rouges (cuits)", "legumes", [127, 8.7, 22.8, 0.5, 6.4, 0.3, 0.1, 0], 1, 150, { keywords: ["haricots", "chili"] }),
  f("white_beans", "Haricots blancs (cuits)", "legumes", [139, 9.7, 25, 0.4, 6.3, 0.3, 0.1, 0], 1, 150, { keywords: ["haricots", "flageolets"] }),
  f("edamame", "Edamame", "legumes", [121, 12, 9, 5, 5, 2, 0.6, 0], 1, 100, { keywords: ["soja", "fèves"] }),
  f("hummus", "Houmous", "legumes", [280, 7, 12, 22, 6, 0.5, 2.5, 1.1], 3, 30, { portions: [P("1 c. à soupe", 20)], keywords: ["houmous", "hummus"] }),

  /* ── Légumes ── */
  f("broccoli", "Brocoli", "vegetables", [34, 2.8, 4, 0.4, 2.6, 1.7, 0.1, 0.03], 1, 150, { keywords: ["brocolis"], micros: ["Vitamine C", "Vitamine K", "Folates"] }),
  f("green_beans", "Haricots verts", "vegetables", [30, 2, 4.5, 0.2, 3, 1.5, 0, 0], 1, 150, { keywords: ["haricots"], micros: ["Vitamine K"] }),
  f("zucchini", "Courgette", "vegetables", [17, 1.2, 2.3, 0.3, 1, 2.3, 0.1, 0], 1, 150, { keywords: ["courgettes"] }),
  f("spinach", "Épinards", "vegetables", [23, 2.9, 1.4, 0.4, 2.2, 0.4, 0.1, 0.2], 1, 100, { keywords: ["epinards"], micros: ["Fer", "Vitamine K", "Folates", "Magnésium"] }),
  f("tomato", "Tomate", "vegetables", [18, 0.9, 2.9, 0.2, 1.2, 2.6, 0, 0], 1, 120, { portions: [P("1 tomate", 120)], keywords: ["tomates"], micros: ["Vitamine C", "Lycopène"] }),
  f("cucumber", "Concombre", "vegetables", [12, 0.6, 2.2, 0.1, 0.5, 1.7, 0, 0], 1, 100, { keywords: ["concombre"] }),
  f("carrot", "Carotte", "vegetables", [36, 0.8, 7.5, 0.2, 2.8, 5, 0, 0.1], 1, 100, { portions: [P("1 carotte", 80)], keywords: ["carottes"], micros: ["Vitamine A"] }),
  f("lettuce", "Salade verte", "vegetables", [14, 1.2, 1.5, 0.2, 1.3, 0.8, 0, 0], 1, 50, { portions: [P("1 bol", 50)], keywords: ["laitue", "salade", "mâche", "roquette"], micros: ["Vitamine K", "Folates"] }),
  f("bell_pepper", "Poivron", "vegetables", [26, 1, 4.6, 0.3, 2, 4.2, 0, 0], 1, 120, { portions: [P("1 poivron", 150)], keywords: ["poivrons"], micros: ["Vitamine C"] }),
  f("mushrooms", "Champignons de Paris", "vegetables", [22, 3.1, 0.8, 0.3, 1, 0.5, 0, 0], 1, 100, { keywords: ["champignons"] }),
  f("cauliflower", "Chou-fleur", "vegetables", [25, 1.9, 3, 0.3, 2, 1.9, 0.1, 0], 1, 150, { keywords: ["chou"], micros: ["Vitamine C"] }),
  f("onion", "Oignon", "vegetables", [40, 1.1, 7.6, 0.1, 1.7, 4.2, 0, 0], 1, 50, { keywords: ["oignons", "échalote"] }),
  f("avocado", "Avocat", "vegetables", [160, 2, 1.9, 14.7, 6.7, 0.7, 2.1, 0], 1, 70, { portions: [P("1/2 avocat", 70)], keywords: ["avocat"], micros: ["Potassium", "Vitamine E", "Folates"] }),
  f("peas", "Petits pois", "vegetables", [81, 5.4, 10, 0.4, 5, 5.7, 0.1, 0], 1, 100, { keywords: ["pois"] }),
  f("corn", "Maïs doux", "vegetables", [86, 3.3, 16, 1.4, 2.4, 4.5, 0.2, 0.3], 3, 80, { keywords: ["maïs", "mais"] }),
  f("asparagus", "Asperges", "vegetables", [20, 2.2, 2, 0.1, 2, 1.9, 0, 0], 1, 150, { keywords: ["asperge"] }),
  f("beetroot", "Betterave cuite", "vegetables", [44, 1.7, 8, 0.2, 2, 8, 0, 0.2], 1, 100, { keywords: ["betterave"] }),
  f("eggplant", "Aubergine", "vegetables", [25, 1, 3, 0.2, 3, 3.5, 0, 0], 1, 150, { keywords: ["aubergines"] }),
  f("cabbage", "Chou vert / blanc", "vegetables", [25, 1.3, 3.5, 0.1, 2.5, 3.2, 0, 0], 1, 150, { keywords: ["chou"] }),
  f("veg_mix", "Poêlée de légumes (surgelés)", "vegetables", [45, 1.8, 5.5, 1.2, 2.8, 3.5, 0.2, 0.3], 3, 200, { keywords: ["légumes", "wok", "surgelés"] }),
  f("ratatouille", "Ratatouille", "vegetables", [60, 1.2, 5.5, 3.5, 1.8, 4.5, 0.5, 0.6], 3, 200, { keywords: ["légumes"] }),

  /* ── Fruits ── */
  f("banana", "Banane", "fruits", [89, 1.1, 20.2, 0.3, 2.6, 12.2, 0.1, 0], 1, 120, { portions: [P("1 banane", 120)], keywords: ["bananes"], micros: ["Potassium", "Vitamine B6"] }),
  f("apple", "Pomme", "fruits", [52, 0.3, 11.4, 0.2, 2.4, 10.4, 0, 0], 1, 150, { portions: [P("1 pomme", 150)], keywords: ["pommes"] }),
  f("orange", "Orange", "fruits", [47, 0.9, 9.4, 0.1, 2.4, 9.4, 0, 0], 1, 150, { portions: [P("1 orange", 150)], keywords: ["oranges", "agrumes"], micros: ["Vitamine C"] }),
  f("strawberries", "Fraises", "fruits", [32, 0.7, 5.7, 0.3, 2, 4.9, 0, 0], 1, 150, { keywords: ["fraise"], micros: ["Vitamine C"] }),
  f("blueberries", "Myrtilles", "fruits", [57, 0.7, 12, 0.3, 2.4, 10, 0, 0], 1, 100, { keywords: ["myrtille", "baies"] }),
  f("raspberries", "Framboises", "fruits", [52, 1.2, 5.4, 0.7, 6.5, 4.4, 0, 0], 1, 100, { keywords: ["framboise", "baies"], micros: ["Vitamine C"] }),
  f("kiwi", "Kiwi", "fruits", [61, 1.1, 12.3, 0.5, 3, 9, 0, 0], 1, 75, { portions: [P("1 kiwi", 75)], keywords: ["kiwis"], micros: ["Vitamine C"] }),
  f("grapes", "Raisin", "fruits", [69, 0.7, 17, 0.2, 0.9, 15.5, 0, 0], 1, 100, { keywords: ["raisins"] }),
  f("mango", "Mangue", "fruits", [60, 0.8, 13.5, 0.4, 1.6, 13.7, 0.1, 0], 1, 150, { keywords: ["mangues"] }),
  f("pineapple", "Ananas", "fruits", [50, 0.5, 11.7, 0.1, 1.4, 9.9, 0, 0], 1, 150, { keywords: ["ananas"] }),
  f("pear", "Poire", "fruits", [57, 0.4, 12.2, 0.1, 3.1, 9.8, 0, 0], 1, 170, { portions: [P("1 poire", 170)], keywords: ["poires"] }),
  f("watermelon", "Pastèque", "fruits", [30, 0.6, 7.2, 0.2, 0.4, 6.2, 0, 0], 1, 250, { keywords: ["melon"] }),
  f("clementine", "Clémentine", "fruits", [47, 0.9, 10.3, 0.2, 1.7, 9.2, 0, 0], 1, 75, { portions: [P("1 clémentine", 75)], keywords: ["mandarine", "agrumes"] }),
  f("dates", "Dattes", "fruits", [280, 2.5, 67, 0.4, 7, 63, 0, 0], 1, 30, { portions: [P("3 dattes", 30)], keywords: ["datte"] }),
  f("applesauce", "Compote sans sucres ajoutés", "fruits", [70, 0.3, 16, 0.2, 1.5, 14, 0, 0], 3, 100, { portions: [P("1 gourde", 90)], keywords: ["compote"] }),
  f("raisins", "Raisins secs", "fruits", [300, 3, 79, 0.5, 3.7, 59, 0.1, 0], 1, 30, { keywords: ["fruits secs"] }),

  /* ── Oléagineux ── */
  f("almonds", "Amandes", "nuts", [580, 21, 9, 50, 12.5, 4.4, 3.8, 0], 1, 30, { portions: [P("1 poignée", 30)], keywords: ["amande", "oléagineux"], micros: ["Vitamine E", "Magnésium"] }),
  f("walnuts", "Noix", "nuts", [650, 15, 7, 65, 6.7, 2.6, 6, 0], 1, 30, { portions: [P("1 poignée", 30)], keywords: ["noix", "cerneaux"], micros: ["Oméga-3 (ALA)", "Magnésium"] }),
  f("cashews", "Noix de cajou", "nuts", [580, 18, 27, 46, 3.3, 6, 8, 0], 1, 30, { keywords: ["cajou"] }),
  f("peanuts", "Cacahuètes grillées salées", "nuts", [590, 25, 13, 49, 8, 4, 7, 0.8], 3, 30, { keywords: ["arachides", "apéro"] }),
  f("peanut_butter", "Beurre de cacahuète 100 %", "nuts", [600, 25, 13, 50, 6, 6, 10, 0.02], 3, 20, { portions: [P("1 c. à soupe", 16)], keywords: ["beurre de cacahuète", "pb"] }),
  f("chia", "Graines de chia", "nuts", [486, 16.5, 7.7, 30.7, 34, 0, 3.3, 0], 1, 15, { portions: [P("1 c. à soupe", 12)], keywords: ["chia", "graines"], micros: ["Oméga-3 (ALA)", "Calcium"] }),
  f("pistachios", "Pistaches", "nuts", [570, 20, 18, 45, 10, 7.7, 5.6, 0.5], 1, 30, { keywords: ["pistache"] }),

  /* ── Matières grasses & sauces ── */
  f("olive_oil", "Huile d'olive", "fats", [900, 0, 0, 100, 0, 0, 14, 0], 2, 10, { portions: [P("1 c. à soupe", 10), P("1 c. à café", 4)], keywords: ["huile"], micros: ["Vitamine E"] }),
  f("rapeseed_oil", "Huile de colza", "fats", [900, 0, 0, 100, 0, 0, 7, 0], 2, 10, { portions: [P("1 c. à soupe", 10)], keywords: ["huile"], micros: ["Oméga-3 (ALA)"] }),
  f("mayo", "Mayonnaise", "sauces", [700, 1.3, 1.5, 77, 0, 1.3, 6, 1.3], 4, 15, { portions: [P("1 c. à soupe", 15)], keywords: ["sauce"] }),
  f("vinaigrette", "Vinaigrette", "sauces", [450, 0.5, 5, 47, 0, 4, 4, 2], 4, 15, { portions: [P("1 c. à soupe", 15)], keywords: ["sauce", "salade"] }),
  f("ketchup", "Ketchup", "sauces", [110, 1.2, 25, 0.2, 0.5, 22, 0, 2.4], 4, 15, { portions: [P("1 c. à soupe", 15)], keywords: ["sauce"] }),
  f("soy_sauce", "Sauce soja", "sauces", [60, 8, 5.6, 0.5, 0.8, 1.7, 0.1, 14], 3, 15, { portions: [P("1 c. à soupe", 15)], keywords: ["soja"] }),
  f("mustard", "Moutarde de Dijon", "sauces", [160, 7, 5, 11, 3, 2, 0.8, 5.8], 3, 10, { portions: [P("1 c. à café", 5)], keywords: ["moutarde"] }),
  f("tomato_sauce", "Coulis / sauce tomate", "sauces", [35, 1.5, 6, 0.2, 1.5, 5, 0, 0.5], 3, 100, { keywords: ["sauce tomate"] }),
  f("pesto", "Pesto", "sauces", [450, 5, 5, 45, 2, 2, 6, 2.5], 3, 20, { keywords: ["sauce"] }),
  f("honey", "Miel", "sweets", [320, 0.3, 80, 0, 0, 80, 0, 0], 2, 15, { portions: [P("1 c. à café", 7), P("1 c. à soupe", 15)], keywords: ["miel"] }),
  f("jam", "Confiture", "sweets", [250, 0.4, 60, 0.1, 1, 58, 0, 0], 3, 20, { portions: [P("1 c. à soupe", 20)], keywords: ["confiture"] }),
  f("sugar", "Sucre", "sweets", [400, 0, 100, 0, 0, 100, 0, 0], 2, 5, { portions: [P("1 morceau", 5), P("1 c. à café", 5)], keywords: ["sucre"] }),
  f("hazelnut_spread", "Pâte à tartiner cacao-noisette", "sweets", [540, 6.3, 57.5, 31, 3.4, 56, 10.6, 0.1], 4, 15, { portions: [P("1 c. à soupe", 15)], keywords: ["nutella", "pâte à tartiner"] }),

  /* ── Sucré & snacks ── */
  f("dark_choc", "Chocolat noir 70 %", "sweets", [570, 9, 33, 42, 11, 28, 25, 0.02], 3, 20, { portions: [P("2 carrés", 20)], keywords: ["chocolat"], micros: ["Magnésium", "Fer"] }),
  f("milk_choc", "Chocolat au lait", "sweets", [540, 7, 57, 31, 2, 55, 19, 0.2], 4, 20, { portions: [P("2 carrés", 20)], keywords: ["chocolat"] }),
  f("cookie", "Cookie industriel", "sweets", [490, 5.5, 65, 23, 2, 35, 12, 0.7], 4, 25, { portions: [P("1 cookie", 25)], keywords: ["biscuit", "gâteau"] }),
  f("croissant", "Croissant", "sweets", [410, 8, 45, 21, 2, 8, 13, 1], 3, 60, { portions: [P("1 croissant", 60)], keywords: ["viennoiserie"] }),
  f("pain_choc", "Pain au chocolat", "sweets", [420, 7.5, 47, 22, 2.5, 13, 14, 0.9], 3, 70, { portions: [P("1 pain au chocolat", 70)], keywords: ["chocolatine", "viennoiserie"] }),
  f("cake", "Gâteau type quatre-quarts", "sweets", [420, 6, 50, 21, 1, 30, 13, 0.6], 4, 50, { portions: [P("1 part", 50)], keywords: ["gâteau"] }),
  f("ice_cream", "Glace vanille", "sweets", [210, 3.5, 24, 11, 0.5, 21, 7, 0.2], 4, 70, { portions: [P("1 boule", 50)], keywords: ["glace"] }),
  f("candy", "Bonbons", "sweets", [340, 5, 80, 0, 0, 60, 0, 0.1], 4, 30, { keywords: ["bonbon", "haribo"] }),
  f("chips", "Chips", "snacks", [540, 6, 52, 33, 4.5, 0.5, 3, 1.3], 4, 30, { portions: [P("1 petit paquet", 30)], keywords: ["chips", "apéro"] }),
  f("popcorn", "Pop-corn nature", "snacks", [390, 12, 63, 4.5, 14, 0.9, 0.6, 0], 3, 30, { keywords: ["popcorn"] }),
  f("protein_bar", "Barre protéinée", "supplements", [350, 30, 35, 10, 8, 4, 5, 0.5], 4, 60, { portions: [P("1 barre", 60)], keywords: ["barre", "protein"] }),

  /* ── Boissons ── */
  f("water", "Eau", "drinks", [0, 0, 0, 0, 0, 0, 0, 0], 1, 250, { unit: "ml", keywords: ["eau"] }),
  f("coffee", "Café noir", "drinks", [1, 0.1, 0, 0, 0, 0, 0, 0], 1, 100, { unit: "ml", portions: [P("1 expresso", 40), P("1 tasse", 150)], keywords: ["café", "expresso"] }),
  f("cola", "Soda au cola", "drinks", [42, 0, 10.6, 0, 0, 10.6, 0, 0], 4, 330, { unit: "ml", portions: [P("1 canette", 330)], keywords: ["coca", "soda"] }),
  f("cola_zero", "Soda au cola zéro", "drinks", [0.3, 0, 0, 0, 0, 0, 0, 0.02], 4, 330, { unit: "ml", portions: [P("1 canette", 330)], keywords: ["coca", "zero", "light"] }),
  f("orange_juice", "Jus d'orange 100 %", "drinks", [45, 0.7, 10, 0.2, 0.2, 9, 0, 0], 1, 200, { unit: "ml", portions: [P("1 verre", 200)], keywords: ["jus"], micros: ["Vitamine C"] }),
  f("beer", "Bière blonde 5 %", "drinks", [43, 0.5, 3.6, 0, 0, 0.1, 0, 0], 3, 250, { unit: "ml", portions: [P("1 demi", 250), P("1 pinte", 500)], keywords: ["alcool", "bière"], alcohol: true }),
  f("wine", "Vin rouge", "drinks", [83, 0.1, 2.6, 0, 0, 0.6, 0, 0], 3, 125, { unit: "ml", portions: [P("1 verre", 125)], keywords: ["alcool", "vin"], alcohol: true }),
  f("almond_milk", "Boisson amande sans sucre", "drinks", [15, 0.5, 0.3, 1.1, 0.2, 0.1, 0.1, 0.1], 4, 250, { unit: "ml", keywords: ["lait végétal"] }),
  f("energy_drink", "Boisson énergisante", "drinks", [46, 0, 11, 0, 0, 11, 0, 0.2], 4, 250, { unit: "ml", portions: [P("1 canette", 250)], keywords: ["red bull", "monster"] }),

  /* ── Plats ── */
  f("pizza", "Pizza margherita", "prepared", [250, 10.5, 30, 9.5, 2, 3.5, 4.5, 1.3], 4, 300, { portions: [P("1/2 pizza", 200), P("1 pizza", 400)], keywords: ["pizza"] }),
  f("burger", "Cheeseburger (fast-food)", "prepared", [263, 13, 28, 12, 1.5, 6, 5, 1.5], 4, 120, { portions: [P("1 burger", 120)], keywords: ["burger", "mcdo", "fast food"] }),
  f("kebab", "Sandwich kebab", "prepared", [215, 11, 21, 10, 1.5, 2.5, 3.5, 1.2], 3, 350, { portions: [P("1 kebab", 350)], keywords: ["kebab", "tacos"] }),
  f("maki", "Makis saumon", "prepared", [150, 6, 25, 3, 0.8, 4, 0.6, 1], 3, 150, { portions: [P("6 makis", 150)], keywords: ["sushi", "japonais"] }),
  f("lasagna", "Lasagnes bolognaise", "prepared", [150, 7.5, 13, 7.5, 1.2, 2.5, 3.5, 0.9], 4, 300, { portions: [P("1 barquette", 300)], keywords: ["lasagne"] }),
  f("quiche", "Quiche lorraine", "prepared", [280, 9, 19, 19, 1, 2, 9, 1], 3, 150, { portions: [P("1 part", 150)], keywords: ["quiche", "tarte"] }),
  f("croque", "Croque-monsieur", "prepared", [250, 13, 22, 12, 1.5, 3, 6, 1.6], 4, 150, { portions: [P("1 croque", 150)], keywords: ["croque"] }),
  f("couscous_royal", "Couscous royal", "prepared", [160, 9, 16, 6.5, 2, 2, 2, 0.9], 3, 400, { keywords: ["couscous"] }),
  f("poke", "Poke bowl saumon", "prepared", [140, 8, 18, 4.5, 1.5, 3, 0.8, 0.8], 3, 400, { portions: [P("1 bowl", 400)], keywords: ["poke", "bowl"] }),
  f("chili", "Chili con carne", "prepared", [110, 8, 9, 4.5, 3, 2.5, 1.8, 0.8], 3, 300, { keywords: ["chili"] }),
  f("bolognese", "Pâtes bolognaise", "prepared", [155, 7, 20, 5, 1.8, 2.5, 1.8, 0.5], 3, 350, { keywords: ["spaghetti", "bolo"] }),
  f("caesar_salad", "Salade César au poulet", "prepared", [150, 10, 6, 10, 1.2, 1.5, 2, 0.8], 3, 300, { keywords: ["salade"] }),
  f("omelette", "Omelette nature", "prepared", [155, 11, 0.8, 12, 0, 0.5, 3.5, 0.6], 1, 150, { portions: [P("omelette 2 œufs", 110), P("omelette 3 œufs", 160)], keywords: ["oeufs", "omelette"] }),

  /* ── Compléments ── */
  f("whey", "Whey protéine", "supplements", [380, 78, 7, 5.5, 0.5, 5, 3.5, 0.5], 4, 30, { portions: [P("1 dose", 30)], keywords: ["whey", "protéine", "shake", "isolat"] }),
  f("casein", "Caséine", "supplements", [360, 80, 5, 2, 1, 3, 1.2, 0.5], 4, 30, { portions: [P("1 dose", 30)], keywords: ["caséine", "protéine"] }),
  f("creatine", "Créatine monohydrate", "supplements", [0, 0, 0, 0, 0, 0, 0, 0], 3, 5, { portions: [P("1 dose", 5)], keywords: ["créatine", "creatine"] }),
];

export const FOOD_BY_ID = new Map(FOODS.map((x) => [x.id, x]));

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ranked local search over name + keywords + brand. */
export function searchFoods<T extends FoodItem>(foods: T[], query: string, limit = 40): T[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(" ");
  const scored: { food: T; score: number }[] = [];
  for (const food of foods) {
    const name = normalize(food.name);
    const hay = `${name} ${normalize((food.keywords ?? []).join(" "))} ${normalize(food.brand ?? "")}`;
    if (!tokens.every((t) => hay.includes(t))) continue;
    let score = 0;
    if (name === q) score += 100;
    if (name.startsWith(q)) score += 50;
    if (name.split(" ").some((w) => w.startsWith(tokens[0]))) score += 20;
    score -= name.length / 10;
    if (food.source !== "builtin") score += 5;
    scored.push({ food, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.food);
}

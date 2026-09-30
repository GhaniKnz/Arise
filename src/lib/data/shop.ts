/**
 * Shopping catalogue used by the recipes: where to find each ingredient, a
 * typical pack and INDICATIVE prices (France, 2026). Prices vary by store,
 * region and promotions: they are estimates to compare costs, not quotes.
 * Users can override any price (stored locally), and fruits/vegetables can
 * show real recent prices from Open Prices (Open Food Facts).
 */

export type Aisle = "meat" | "fish" | "dairy" | "eggs" | "produce" | "frozen" | "grocery" | "bakery" | "world" | "pantry" | "sport";

export const AISLE_META: Record<Aisle, { label: string; icon: string }> = {
  meat: { label: "Boucherie · volaille", icon: "beef" },
  fish: { label: "Poissonnerie", icon: "fish" },
  dairy: { label: "Crèmerie", icon: "milk" },
  eggs: { label: "Œufs", icon: "egg" },
  produce: { label: "Fruits & légumes", icon: "carrot" },
  frozen: { label: "Surgelés", icon: "snowflake" },
  grocery: { label: "Épicerie", icon: "wheat" },
  bakery: { label: "Boulangerie · pains", icon: "croissant" },
  world: { label: "Produits du monde", icon: "globe" },
  pantry: { label: "Placard (huile, épices…)", icon: "package" },
  sport: { label: "Nutrition sportive", icon: "dumbbell" },
};

/** Store groups used for indicative prices. */
export const STORE_TIERS = {
  discount: { label: "Discount", stores: "Lidl, Aldi, Netto" },
  super: { label: "Supermarché", stores: "Carrefour, Leclerc, Auchan, Intermarché, Super U" },
} as const;
export type StoreTier = keyof typeof STORE_TIERS;

export interface ShopItem {
  id: string;
  name: string;
  aisle: Aisle;
  /** Nutrition reference in the food database. */
  foodId: string;
  /** Typical pack as sold. */
  pack: string;
  /** Usable grams (or ml) in the pack. */
  packGrams: number;
  /** Indicative pack price in € : [discount, supermarché]. */
  price: [number, number];
  /** Basic kept at home: prorated in the cost, not in the shopping list by default. */
  pantry?: boolean;
  /** Where to find it when not in every supermarket. */
  where?: string;
  tip?: string;
  /** Open Prices category tag (real, crowdsourced prices; mostly fresh produce). */
  openPrices?: string;
}

const i = (id: string, name: string, aisle: Aisle, foodId: string, pack: string, packGrams: number, price: [number, number], extra: Partial<ShopItem> = {}): ShopItem => ({
  id,
  name,
  aisle,
  foodId: `b:${foodId}`,
  pack,
  packGrams,
  price,
  ...extra,
});

export const SHOP_ITEMS: ShopItem[] = [
  /* Boucherie · volaille */
  i("chicken", "Filets de poulet", "meat", "chicken_breast_raw", "barquette 1 kg", 1000, [9.9, 12.9], { tip: "En surgelé (filets IQF) : ~7–8 €/kg, pratique pour le meal prep." }),
  i("turkey", "Escalopes de dinde", "meat", "turkey_cutlet", "barquette 500 g", 500, [5.2, 6.5]),
  i("beef5", "Steaks hachés 5 % MG", "meat", "ground_beef_5", "4 × 100 g", 400, [4.3, 5.3], { tip: "Le 5 % MG apporte ~25 % de calories en moins que le 15 %." }),
  i("beef_strips", "Bœuf à fondue / émincé", "meat", "beef_rump", "barquette 400 g", 400, [7.5, 9.5]),
  i("ham", "Jambon blanc découenné", "meat", "ham", "4 tranches (160 g)", 160, [1.7, 2.3]),

  /* Poissonnerie */
  i("salmon", "Pavés de saumon", "fish", "salmon", "2 × 125 g", 250, [5.5, 6.9], { tip: "Surgelé : même qualité nutritionnelle, souvent moins cher." }),
  i("cod", "Dos de cabillaud (surgelé)", "frozen", "cod", "4 × 120 g", 480, [6.5, 8.5]),
  i("shrimp", "Crevettes décortiquées (surgelées)", "frozen", "shrimp", "sachet 400 g", 400, [6.5, 8.5]),
  i("tuna", "Thon au naturel", "grocery", "tuna_water", "3 boîtes (3 × 112 g égoutté)", 336, [4.2, 5.5]),

  /* Œufs & crèmerie */
  i("eggs", "Œufs plein air", "eggs", "egg", "boîte de 12 (~600 g)", 600, [3.2, 3.9], { tip: "1 œuf moyen ≈ 50 g sans coquille." }),
  i("skyr", "Skyr nature", "dairy", "skyr", "pot 450 g", 450, [1.55, 1.95]),
  i("fromage_blanc", "Fromage blanc 0 %", "dairy", "fromage_blanc_0", "pot 1 kg", 1000, [1.9, 2.4]),
  i("greek_yogurt", "Yaourt grec 0 %", "dairy", "greek_yogurt_0", "pot 500 g", 500, [1.7, 2.3]),
  i("yogurt", "Yaourts nature", "dairy", "yogurt_plain", "4 × 125 g", 500, [0.85, 1.2]),
  i("milk", "Lait demi-écrémé", "dairy", "milk_semi", "bouteille 1 L", 1000, [0.95, 1.15]),
  i("almond_milk", "Boisson amande sans sucre", "dairy", "almond_milk", "brique 1 L", 1000, [1.4, 1.9]),
  i("feta", "Feta AOP", "dairy", "feta", "200 g", 200, [1.7, 2.4]),
  i("mozzarella", "Mozzarella allégée", "dairy", "mozzarella_light", "boule 125 g", 125, [0.85, 1.2]),
  i("emmental", "Emmental râpé", "dairy", "emmental", "sachet 200 g", 200, [1.6, 2.1]),
  i("parmesan", "Parmesan / Grana Padano", "dairy", "parmesan", "morceau 100 g", 100, [1.8, 2.5]),
  i("cream15", "Crème légère 15 %", "dairy", "cream_15", "20 cl", 200, [0.95, 1.3]),

  /* Épicerie */
  i("rice", "Riz basmati", "grocery", "rice_white_raw", "paquet 1 kg", 1000, [1.99, 2.6], { tip: "100 g de riz cru ≈ 300 g cuit." }),
  i("pasta", "Pâtes (spaghetti, fusilli…)", "grocery", "pasta_raw", "paquet 500 g", 500, [0.79, 1.1], { tip: "100 g de pâtes crues ≈ 250 g cuites." }),
  i("couscous", "Semoule de couscous", "grocery", "couscous_cooked", "paquet 1 kg (≈ 2,5 kg cuite)", 2500, [1.3, 1.7]),
  i("oats", "Flocons d'avoine", "grocery", "oats", "paquet 500 g", 500, [0.89, 1.2]),
  i("granola", "Granola", "grocery", "granola", "paquet 375 g", 375, [2.2, 2.9]),
  i("red_lentils", "Lentilles corail", "grocery", "red_lentils_dry", "paquet 500 g", 500, [1.5, 2.1]),
  i("chickpeas", "Pois chiches (conserve)", "grocery", "chickpeas_cooked", "boîte 400 g (265 g égouttés)", 265, [0.79, 1.1]),
  i("kidney_beans", "Haricots rouges (conserve)", "grocery", "kidney_beans", "boîte 400 g (250 g égouttés)", 250, [0.75, 1.05]),
  i("corn", "Maïs doux (conserve)", "grocery", "corn", "boîte 285 g", 285, [0.79, 1.09]),
  i("crushed_tomatoes", "Tomates concassées", "grocery", "crushed_tomatoes", "boîte 400 g", 400, [0.59, 0.89]),
  i("coconut_milk", "Lait de coco allégé", "world", "coconut_milk_light", "boîte 400 ml", 400, [1.19, 1.69]),
  i("noodles", "Nouilles aux œufs", "world", "noodles_cooked", "paquet 250 g (≈ 625 g cuites)", 625, [1.1, 1.6]),
  i("soy_sauce", "Sauce soja", "world", "soy_sauce", "flacon 250 ml", 250, [1.49, 1.99], { pantry: true }),
  i("tahini", "Purée de sésame (tahini)", "world", "tahini", "pot 250 g", 250, [2.99, 3.99], { where: "Rayon produits du monde (Carrefour, Leclerc, Auchan) ou épicerie orientale" }),
  i("olives", "Olives noires dénoyautées", "grocery", "olives", "bocal 150 g égouttées", 150, [1.29, 1.79]),
  i("peanut_butter", "Beurre de cacahuète 100 %", "grocery", "peanut_butter", "pot 350 g", 350, [1.99, 2.99]),
  i("almonds", "Amandes", "grocery", "almonds", "sachet 200 g", 200, [2.49, 3.29]),
  i("chia", "Graines de chia", "grocery", "chia", "sachet 200 g", 200, [1.99, 2.99]),
  i("dates", "Dattes dénoyautées", "grocery", "dates", "barquette 250 g", 250, [1.49, 2.19]),
  i("cocoa", "Cacao en poudre non sucré", "grocery", "cocoa_powder", "boîte 250 g", 250, [2.29, 2.99], { pantry: true }),
  i("honey", "Miel", "grocery", "honey", "pot 500 g", 500, [3.49, 4.99], { pantry: true }),
  i("tomato_sauce", "Coulis de tomate", "grocery", "tomato_sauce", "bouteille 500 g", 500, [0.79, 1.1]),
  i("sesame", "Graines de sésame", "grocery", "sesame", "sachet 100 g", 100, [0.99, 1.49], { pantry: true }),

  /* Boulangerie · pains */
  i("wraps", "Tortillas de blé", "bakery", "wrap", "8 tortillas (320 g)", 320, [1.29, 1.89]),
  i("bread", "Pain complet", "bakery", "bread_whole", "pain 500 g", 500, [1.49, 2.1]),
  i("burger_buns", "Pains à burger", "bakery", "burger_bun", "4 pains (300 g)", 300, [1.29, 1.79]),

  /* Fruits & légumes */
  i("broccoli", "Brocoli", "frozen", "broccoli", "fleurettes surgelées 1 kg", 1000, [1.99, 2.49], { openPrices: "en:broccoli", tip: "Frais : ~3–5 €/kg. Le surgelé garde ses vitamines." }),
  i("green_beans", "Haricots verts extra-fins", "frozen", "green_beans", "sachet surgelé 1 kg", 1000, [1.79, 2.39]),
  i("veg_mix", "Poêlée / wok de légumes", "frozen", "veg_mix", "sachet surgelé 1 kg", 1000, [1.99, 2.69]),
  i("spinach", "Épinards en branches", "frozen", "spinach", "sachet surgelé 1 kg", 1000, [1.49, 1.99]),
  i("berries", "Fruits rouges", "frozen", "frozen_berries", "sachet surgelé 500 g", 500, [2.49, 3.29]),
  i("sweet_potato", "Patates douces", "produce", "sweet_potato", "1 kg", 1000, [2.49, 2.99], { openPrices: "en:sweet-potatoes" }),
  i("potatoes", "Pommes de terre", "produce", "potato_boiled", "filet 2,5 kg", 2500, [2.49, 3.49], { openPrices: "en:potatoes" }),
  i("zucchini", "Courgettes", "produce", "zucchini", "1 kg", 1000, [1.99, 2.49], { openPrices: "en:zucchini" }),
  i("tomatoes", "Tomates", "produce", "tomato", "1 kg", 1000, [2.49, 2.99], { openPrices: "en:tomatoes" }),
  i("cherry_tomatoes", "Tomates cerises", "produce", "tomato", "barquette 250 g", 250, [1.29, 1.79], { openPrices: "en:cherry-tomatoes" }),
  i("cucumber", "Concombre", "produce", "cucumber", "1 pièce (~400 g)", 400, [0.79, 0.99], { openPrices: "en:cucumbers" }),
  i("carrots", "Carottes", "produce", "carrot", "sachet 1 kg", 1000, [1.09, 1.39], { openPrices: "en:carrots" }),
  i("peppers", "Poivrons", "produce", "bell_pepper", "lot de 3 (~500 g)", 500, [1.99, 2.69], { openPrices: "en:bell-peppers" }),
  i("onions", "Oignons", "produce", "onion", "filet 1 kg", 1000, [1.29, 1.69], { openPrices: "en:onions" }),
  i("garlic", "Ail", "produce", "garlic", "filet de 3 têtes (~150 g)", 150, [0.99, 1.39], { pantry: true, openPrices: "en:garlic" }),
  i("ginger", "Gingembre frais", "produce", "ginger", "morceau ~100 g", 100, [0.5, 0.7]),
  i("mushrooms", "Champignons de Paris", "produce", "mushrooms", "barquette 500 g", 500, [1.79, 2.29], { openPrices: "en:mushrooms" }),
  i("lettuce", "Salade (laitue, romaine)", "produce", "lettuce", "1 pièce (~300 g)", 300, [0.89, 1.19], { openPrices: "en:lettuces" }),
  i("avocado", "Avocat", "produce", "avocado", "1 pièce (~130 g de chair)", 130, [0.79, 1.19], { openPrices: "en:avocados" }),
  i("banana", "Bananes", "produce", "banana", "1 kg (~8 bananes)", 1000, [1.49, 1.89], { openPrices: "en:bananas", tip: "1 banane moyenne ≈ 120 g épluchée." }),
  i("apple", "Pommes", "produce", "apple", "1 kg", 1000, [1.79, 2.29], { openPrices: "en:apples" }),
  i("mango", "Mangue", "produce", "mango", "1 pièce (~250 g de chair)", 250, [1.29, 1.79], { openPrices: "en:mangoes" }),
  i("lemon", "Citrons", "produce", "lemon", "filet 500 g (~4 citrons, 160 ml de jus)", 160, [1.49, 1.99], { openPrices: "en:lemons" }),
  i("herbs", "Herbes fraîches (persil, coriandre)", "produce", "herbs", "1 botte (~50 g)", 50, [0.89, 1.19]),

  /* Placard */
  i("olive_oil", "Huile d'olive", "pantry", "olive_oil", "bouteille 1 L (~920 g)", 920, [7.5, 9.5], { pantry: true, tip: "1 c. à soupe ≈ 10 g ≈ 90 kcal : dose-la." }),
  i("rapeseed_oil", "Huile de colza", "pantry", "rapeseed_oil", "bouteille 1 L (~920 g)", 920, [1.99, 2.49], { pantry: true }),
  i("spices", "Épices (curry, paprika, cumin, cannelle)", "pantry", "spices", "pot ~40 g", 40, [0.99, 1.49], { pantry: true }),
  i("stock", "Bouillon cube", "pantry", "stock_cube", "boîte de 10 cubes", 100, [0.99, 1.39], { pantry: true }),
  i("mustard", "Moutarde de Dijon", "pantry", "mustard", "pot 370 g", 370, [0.89, 1.29], { pantry: true }),

  /* Nutrition sportive */
  i("whey", "Whey protéine", "sport", "whey", "pot 1 kg", 1000, [22, 30], { where: "Decathlon, sites de nutrition sportive (optionnel)", tip: "Optionnelle : remplaçable par du skyr ou du fromage blanc." }),
];

export const SHOP_BY_ID = new Map(SHOP_ITEMS.map((s) => [s.id, s]));

/** €/g for a shop item, honoring a user override (€ per pack). */
export function pricePerGram(item: ShopItem, tier: StoreTier, override?: number): number {
  const pack = override ?? item.price[tier === "discount" ? 0 : 1];
  return pack / item.packGrams;
}

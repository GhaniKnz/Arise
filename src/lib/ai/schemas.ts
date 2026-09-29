import { z } from "zod";

export const FOOD_CATEGORIES = [
  "meat",
  "fish",
  "eggs",
  "dairy",
  "plant_protein",
  "grains",
  "bread",
  "legumes",
  "vegetables",
  "fruits",
  "nuts",
  "fats",
  "sweets",
  "snacks",
  "drinks",
  "prepared",
  "sauces",
  "supplements",
  "other",
] as const;

export const MealItemSchema = z.object({
  name: z.string().describe("Nom de l'aliment en français, précis (ex. « Riz basmati cuit »)"),
  grams: z.number().describe("Quantité estimée en grammes (ml pour les boissons)"),
  kcal: z.number().describe("Calories pour la quantité estimée"),
  protein: z.number().describe("Protéines (g) pour la quantité estimée"),
  carbs: z.number().describe("Glucides (g) pour la quantité estimée"),
  fat: z.number().describe("Lipides (g) pour la quantité estimée"),
  fiber: z.number().describe("Fibres (g) pour la quantité estimée"),
  category: z.enum(FOOD_CATEGORIES),
  processing: z.enum(["raw", "processed", "ultra_processed"]).describe("Niveau de transformation"),
  confidence: z.enum(["high", "medium", "low"]),
});

export const MealAnalysisSchema = z.object({
  is_food: z.boolean().describe("false si la photo ne montre pas de nourriture"),
  meal_name: z.string().describe("Nom court du repas en français"),
  items: z.array(MealItemSchema),
  notes: z.string().describe("Hypothèses importantes (sauce cachée, huile de cuisson…), en français, 1–2 phrases"),
});

export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;
export type MealItem = z.infer<typeof MealItemSchema>;

export const MealRequestSchema = z.object({
  image: z.string().min(100).max(7_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  note: z.string().max(300).optional(),
});

export const CoachRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
  context: z.string().max(20_000),
});

export const ReportRequestSchema = z.object({
  context: z.string().max(20_000),
});

export const ReportAnalysisSchema = z.object({
  headline: z.string().describe("Une phrase de synthèse, bienveillante et factuelle"),
  analysis: z.array(z.string()).describe("3 à 5 constats basés sur les chiffres"),
  recommendations: z.array(z.string()).describe("2 à 4 actions concrètes pour la semaine suivante"),
  focus: z.string().describe("Le levier prioritaire en quelques mots"),
});

export type ReportAnalysis = z.infer<typeof ReportAnalysisSchema>;

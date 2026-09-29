import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GeminiError, geminiKey, geminiParse } from "@/lib/ai/gemini";
import { AI_MODEL, aiError, FALLBACK, pickEngine, REFUSAL_MESSAGE } from "@/lib/ai/server";
import { MEAL_SYSTEM } from "@/lib/ai/prompts";
import { MealAnalysisSchema, MealRequestSchema } from "@/lib/ai/schemas";
import { guard, json } from "@/lib/server/guard";

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req, "ai-meal", 12);
  if (blocked) return blocked;
  const engine = pickEngine(req, "meal", geminiKey(req));
  if (engine instanceof Response) return engine;

  const parsed = MealRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: "Image manquante ou trop volumineuse." }, 400);
  const { image, mediaType, note, known } = parsed.data;

  const memory = known
    ? [
        known.products.length ? `Produits déjà enregistrés (identifiant | nom) :\n${known.products.map((p) => `${p.id} | ${p.name}`).join("\n")}` : "",
        known.meals.length ? `Repas déjà enregistrés (identifiant | nom) :\n${known.meals.map((m) => `${m.id} | ${m.name}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";
  const prompt = [memory, note ? `Précision de l'utilisateur : ${note}` : "", "Analyse ce repas."].filter(Boolean).join("\n\n");

  if (engine.provider === "gemini") {
    try {
      const { data, model } = await geminiParse({
        key: engine.key,
        system: MEAL_SYSTEM,
        schema: MealAnalysisSchema,
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: mediaType, data: image } }, { text: prompt }] }],
      });
      return json({ analysis: data, model, provider: "gemini" });
    } catch (e) {
      if (e instanceof GeminiError) return json({ error: `gemini_${e.code}`, message: e.message }, e.status);
      return json({ error: "ai_unknown", message: "Erreur inattendue de l'IA." }, 500);
    }
  }

  try {
    const response = await engine.client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      system: MEAL_SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(MealAnalysisSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return json({ error: "refusal", message: REFUSAL_MESSAGE }, 422);
    if (!response.parsed_output) return json({ error: "unparsed", message: "L'analyse n'a pas pu être lue, réessaie." }, 502);
    return json({ analysis: response.parsed_output, model: response.model, provider: "claude" });
  } catch (e) {
    return aiError(e);
  }
}

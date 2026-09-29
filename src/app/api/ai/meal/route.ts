import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AI_MODEL, aiClient, aiError, FALLBACK, REFUSAL_MESSAGE } from "@/lib/ai/server";
import { MEAL_SYSTEM } from "@/lib/ai/prompts";
import { MealAnalysisSchema, MealRequestSchema } from "@/lib/ai/schemas";
import { guard, json } from "@/lib/server/guard";

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req, "ai-meal", 12);
  if (blocked) return blocked;
  const client = aiClient(req);
  if (client instanceof Response) return client;

  const parsed = MealRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: "Image manquante ou trop volumineuse." }, 400);
  const { image, mediaType, note } = parsed.data;

  try {
    const response = await client.beta.messages.parse({
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
            { type: "text", text: note ? `Précision de l'utilisateur : ${note}\nAnalyse ce repas.` : "Analyse ce repas." },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return json({ error: "refusal", message: REFUSAL_MESSAGE }, 422);
    if (!response.parsed_output) return json({ error: "unparsed", message: "L'analyse n'a pas pu être lue, réessaie." }, 502);
    return json({ analysis: response.parsed_output, model: response.model });
  } catch (e) {
    return aiError(e);
  }
}

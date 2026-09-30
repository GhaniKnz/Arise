import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GeminiError, geminiKey, geminiParse } from "@/lib/ai/gemini";
import { AI_MODEL, aiError, FALLBACK, pickEngine, REFUSAL_MESSAGE } from "@/lib/ai/server";
import { REPORT_SYSTEM } from "@/lib/ai/prompts";
import { ReportAnalysisSchema, ReportRequestSchema } from "@/lib/ai/schemas";
import { guard, json } from "@/lib/server/guard";

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req, "ai-report", 6);
  if (blocked) return blocked;
  const engine = pickEngine(req, "report", geminiKey(req));
  if (engine instanceof Response) return engine;

  const parsed = ReportRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: "Données du rapport invalides." }, 400);
  const prompt = `Statistiques de la semaine :\n${parsed.data.context}\n\nRédige le bilan.`;

  if (engine.provider === "gemini") {
    try {
      const { data } = await geminiParse({ key: engine.key, system: REPORT_SYSTEM, schema: ReportAnalysisSchema, contents: [{ role: "user", parts: [{ text: prompt }] }] });
      return json({ report: data });
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
      system: REPORT_SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(ReportAnalysisSchema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return json({ error: "refusal", message: REFUSAL_MESSAGE }, 422);
    if (!response.parsed_output) return json({ error: "unparsed", message: "Le rapport n'a pas pu être généré, réessaie." }, 502);
    return json({ report: response.parsed_output });
  } catch (e) {
    return aiError(e);
  }
}

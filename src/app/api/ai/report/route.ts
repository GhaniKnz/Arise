import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AI_MODEL, aiClient, aiError, FALLBACK, REFUSAL_MESSAGE } from "@/lib/ai/server";
import { REPORT_SYSTEM } from "@/lib/ai/prompts";
import { ReportAnalysisSchema, ReportRequestSchema } from "@/lib/ai/schemas";
import { guard, json } from "@/lib/server/guard";

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req, "ai-report", 6);
  if (blocked) return blocked;
  const client = aiClient(req);
  if (client instanceof Response) return client;

  const parsed = ReportRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: "Données du rapport invalides." }, 400);

  try {
    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      system: REPORT_SYSTEM,
      output_config: { effort: "medium", format: betaZodOutputFormat(ReportAnalysisSchema) },
      messages: [{ role: "user", content: `Statistiques de la semaine :\n${parsed.data.context}\n\nRédige le bilan.` }],
    });
    if (response.stop_reason === "refusal") return json({ error: "refusal", message: REFUSAL_MESSAGE }, 422);
    if (!response.parsed_output) return json({ error: "unparsed", message: "Le rapport n'a pas pu être généré, réessaie." }, 502);
    return json({ report: response.parsed_output });
  } catch (e) {
    return aiError(e);
  }
}

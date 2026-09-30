import { GEMINI_MODELS } from "@/lib/ai/gemini";
import { AI_MODEL } from "@/lib/ai/server";
import { json } from "@/lib/server/guard";

/** Lets the client know which AI engines are configured on the server (never exposes secrets). */
export async function GET() {
  return json({
    serverKey: Boolean(process.env.ANTHROPIC_API_KEY),
    geminiServerKey: Boolean(process.env.GEMINI_API_KEY),
    accessCodeRequired: Boolean(process.env.ARISE_ACCESS_CODE),
    model: AI_MODEL,
    geminiModels: GEMINI_MODELS,
    provider: process.env.ARISE_AI_PROVIDER || "auto",
  });
}

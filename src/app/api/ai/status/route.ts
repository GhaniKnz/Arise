import { AI_MODEL } from "@/lib/ai/server";
import { json } from "@/lib/server/guard";

/** Lets the client know whether AI features are configured (never exposes secrets). */
export async function GET() {
  return json({
    serverKey: Boolean(process.env.ANTHROPIC_API_KEY),
    accessCodeRequired: Boolean(process.env.ARISE_ACCESS_CODE),
    model: AI_MODEL,
  });
}

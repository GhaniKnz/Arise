import { AI_MODEL, aiClient, aiError, FALLBACK, REFUSAL_MESSAGE } from "@/lib/ai/server";
import { COACH_SYSTEM } from "@/lib/ai/prompts";
import { CoachRequestSchema } from "@/lib/ai/schemas";
import { guard, json } from "@/lib/server/guard";

export const maxDuration = 120;

/** Streams the coach's answer as plain UTF-8 text. */
export async function POST(req: Request) {
  const blocked = guard(req, "ai-coach", 20);
  if (blocked) return blocked;
  const client = aiClient(req);
  if (client instanceof Response) return client;

  const parsed = CoachRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: "Message invalide." }, 400);
  const { messages, context } = parsed.data;
  if (messages[0].role !== "user") return json({ error: "invalid", message: "La conversation doit commencer par un message." }, 400);

  const stream = client.beta.messages.stream({
    model: AI_MODEL,
    max_tokens: 64000,
    ...FALLBACK,
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Données de l'utilisateur (générées par ARISE, à jour) :\n${context}` },
    ],
    messages,
  });

  // Wait for the first event so auth/rate-limit errors map to a proper HTTP status.
  const events = stream[Symbol.asyncIterator]();
  let first: IteratorResult<unknown>;
  try {
    first = await events.next();
  } catch (e) {
    return aiError(e);
  }

  const encoder = new TextEncoder();
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, event: unknown) => {
    const ev = event as { type?: string; delta?: { type?: string; text?: string } };
    if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) controller.enqueue(encoder.encode(ev.delta.text));
  };

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) emit(controller, first.value);
        for (let r = await events.next(); !r.done; r = await events.next()) emit(controller, r.value);
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode(`\n\n${REFUSAL_MESSAGE}`));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n…"));
      } catch {
        controller.enqueue(encoder.encode("\n\n[Connexion interrompue avec l'IA — réessaie.]"));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

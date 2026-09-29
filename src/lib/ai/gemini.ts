import "server-only";
import { z } from "zod";

/**
 * Google Gemini (Generative Language API, REST). Used for meal photo
 * estimation — and for the coach and weekly report when no Claude key is set.
 *
 * Models are tried in order: when the first hits its daily free quota (429)
 * or is overloaded (503), the next one answers. Override with
 * ARISE_GEMINI_MODELS="model-a,model-b".
 */
export const GEMINI_MODELS = (process.env.ARISE_GEMINI_MODELS || "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-2.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "auth" | "quota" | "blocked" | "bad_request" | "upstream" | "unparsed",
  ) {
    super(message);
  }
}

/** Server key first; otherwise a key the user pasted in Settings (sent per request, never stored). */
export function geminiKey(req: Request): string | undefined {
  const server = process.env.GEMINI_API_KEY?.trim();
  if (server) return server;
  const user = req.headers.get("x-gemini-key")?.trim();
  return user && /^AIza[0-9A-Za-z_-]{20,}$/.test(user) ? user : undefined;
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export interface GeminiMessage {
  role: "user" | "model";
  parts: Part[];
}

interface GenerateOptions {
  key: string;
  system: string;
  contents: GeminiMessage[];
  /** Zod schema for a JSON answer (structured output). */
  schema?: z.ZodType;
  maxOutputTokens?: number;
}

/** JSON Schema accepted by `responseJsonSchema` (drop keywords it does not need). */
function toGeminiSchema(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) if (k !== "$schema" && k !== "additionalProperties") out[k] = strip(v);
      return out;
    }
    return node;
  };
  return strip(z.toJSONSchema(schema));
}

function body({ system, contents, schema, maxOutputTokens }: Omit<GenerateOptions, "key">) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      maxOutputTokens: maxOutputTokens ?? 8192,
      ...(schema ? { responseMimeType: "application/json", responseJsonSchema: toGeminiSchema(schema) } : {}),
    },
  });
}

async function failure(res: Response): Promise<GeminiError> {
  let message = "";
  try {
    message = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
  } catch {}
  if (res.status === 401 || res.status === 403) return new GeminiError("Clé API Gemini invalide ou non autorisée.", 401, "auth");
  if (res.status === 429) return new GeminiError("Quota gratuit Gemini atteint pour aujourd'hui (remise à zéro à minuit, heure du Pacifique).", 429, "quota");
  if (res.status === 400) return new GeminiError(`Requête refusée par Gemini${message ? ` : ${message.slice(0, 160)}` : ""}.`, 400, "bad_request");
  return new GeminiError(`Erreur du service Gemini (${res.status}).`, 502, "upstream");
}

/** Status codes worth retrying on the next model. */
const NEXT_MODEL = new Set([429, 500, 503, 404]);

/** One-shot generation with model fallback. Returns the text (JSON when a schema is given). */
export async function geminiGenerate(opts: GenerateOptions): Promise<{ text: string; model: string }> {
  let last: GeminiError | null = null;
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.key },
      body: body(opts),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      last = await failure(res);
      if (NEXT_MODEL.has(res.status)) continue;
      throw last;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) throw new GeminiError("Gemini a refusé d'analyser ce contenu.", 422, "blocked");
    const cand = data.candidates?.[0];
    if (cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") throw new GeminiError("Gemini a refusé d'analyser ce contenu.", 422, "blocked");
    const text = (cand?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("");
    if (!text) throw new GeminiError("Réponse vide de Gemini, réessaie.", 502, "unparsed");
    return { text, model };
  }
  throw last ?? new GeminiError("Aucun modèle Gemini disponible.", 502, "upstream");
}

/** Structured generation validated against the Zod schema. */
export async function geminiParse<T>(opts: GenerateOptions & { schema: z.ZodType<T> }): Promise<{ data: T; model: string }> {
  const { text, model } = await geminiGenerate(opts);
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new GeminiError("La réponse de Gemini n'a pas pu être lue, réessaie.", 502, "unparsed");
  }
  const parsed = opts.schema.safeParse(raw);
  if (!parsed.success) throw new GeminiError("La réponse de Gemini est incomplète, réessaie.", 502, "unparsed");
  return { data: parsed.data, model };
}

/**
 * Streaming text generation (Server-Sent Events). Resolves once the first
 * chunk arrives so errors map to an HTTP status; then yields text deltas.
 */
export async function geminiStream(opts: GenerateOptions): Promise<{ model: string; chunks: AsyncGenerator<string> }> {
  let last: GeminiError | null = null;
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`${BASE}/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.key },
      body: body(opts),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok || !res.body) {
      last = await failure(res);
      if (NEXT_MODEL.has(res.status)) continue;
      throw last;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    async function* chunks(): AsyncGenerator<string> {
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(line.slice(5)) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
              const text = (ev.candidates?.[0]?.content?.parts ?? [])
                .filter((p) => !p.thought)
                .map((p) => p.text ?? "")
                .join("");
              if (text) yield text;
            } catch {
              // Ignore keep-alives and partial lines.
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
    return { model, chunks: chunks() };
  }
  throw last ?? new GeminiError("Aucun modèle Gemini disponible.", 502, "upstream");
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { json } from "@/lib/server/guard";

/** Default model; override with ARISE_AI_MODEL (e.g. claude-sonnet-5-5 to cut costs). */
export const AI_MODEL = process.env.ARISE_AI_MODEL || "claude-opus-5-5";

/**
 * Server-side refusal fallback: if a safety classifier declines a benign
 * request, the API re-runs it on the recommended fallback model.
 */
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

/**
 * Uses the server key when configured; otherwise accepts a key the user
 * pasted in Settings (sent per request, never stored server-side).
 */
export function anthropicKey(req: Request): string | undefined {
  const serverKey = process.env.ANTHROPIC_API_KEY?.trim();
  const userKey = req.headers.get("x-anthropic-key")?.trim();
  return serverKey || (userKey && userKey.startsWith("sk-ant-") ? userKey : undefined);
}

export function aiClient(req: Request): Anthropic | Response {
  const apiKey = anthropicKey(req);
  if (!apiKey) return notConfigured();
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

export const notConfigured = () =>
  json({ error: "ai_not_configured", message: "IA non configurée : ajoute une clé Gemini (gratuite) ou Claude dans Réglages → IA, ou sur le serveur." }, 503);

export type AiTask = "meal" | "coach" | "report";
export type AiEngine = { provider: "claude"; client: Anthropic } | { provider: "gemini"; key: string };

/**
 * Chooses the engine: the user's preference (Settings → IA, header
 * x-ai-provider) or ARISE_AI_PROVIDER; in "auto", photo estimation prefers
 * Gemini (free tier) and the coach/report prefer Claude, each falling back
 * to whichever key is available.
 */
export function pickEngine(req: Request, task: AiTask, geminiKeyValue: string | undefined): AiEngine | Response {
  const claudeKey = anthropicKey(req);
  const pref = (req.headers.get("x-ai-provider") || process.env.ARISE_AI_PROVIDER || "auto").toLowerCase();
  const claude = claudeKey ? ({ provider: "claude", client: new Anthropic({ apiKey: claudeKey, maxRetries: 2, timeout: 120_000 }) } as const) : null;
  const gemini = geminiKeyValue ? ({ provider: "gemini", key: geminiKeyValue } as const) : null;
  const order = pref === "gemini" ? [gemini, claude] : pref === "claude" ? [claude, gemini] : task === "meal" ? [gemini, claude] : [claude, gemini];
  return order.find((e) => e != null) ?? notConfigured();
}

export function aiError(e: unknown): Response {
  if (e instanceof Anthropic.AuthenticationError) return json({ error: "ai_auth", message: "Clé API Anthropic invalide." }, 401);
  if (e instanceof Anthropic.RateLimitError) return json({ error: "ai_rate", message: "Limite de l'API atteinte, réessaie dans un moment." }, 429);
  if (e instanceof Anthropic.BadRequestError) return json({ error: "ai_bad_request", message: "Requête refusée par l'API (image trop grande ou invalide ?)." }, 400);
  if (e instanceof Anthropic.APIError) return json({ error: "ai_upstream", message: `Erreur du service IA (${e.status ?? "?"}).` }, 502);
  return json({ error: "ai_unknown", message: "Erreur inattendue de l'IA." }, 500);
}

export const REFUSAL_MESSAGE = "Je ne peux pas traiter cette demande. Reformule-la ou pose une autre question sur ta nutrition ou ton entraînement.";

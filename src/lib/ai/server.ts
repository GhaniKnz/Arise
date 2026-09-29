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
export function aiClient(req: Request): Anthropic | Response {
  const serverKey = process.env.ANTHROPIC_API_KEY;
  const userKey = req.headers.get("x-anthropic-key")?.trim();
  const apiKey = serverKey || (userKey && userKey.startsWith("sk-ant-") ? userKey : undefined);
  if (!apiKey) {
    return json({ error: "ai_not_configured", message: "IA non configurée : ajoute ANTHROPIC_API_KEY sur le serveur ou ta clé dans Réglages → IA." }, 503);
  }
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

export function aiError(e: unknown): Response {
  if (e instanceof Anthropic.AuthenticationError) return json({ error: "ai_auth", message: "Clé API Anthropic invalide." }, 401);
  if (e instanceof Anthropic.RateLimitError) return json({ error: "ai_rate", message: "Limite de l'API atteinte, réessaie dans un moment." }, 429);
  if (e instanceof Anthropic.BadRequestError) return json({ error: "ai_bad_request", message: "Requête refusée par l'API (image trop grande ou invalide ?)." }, 400);
  if (e instanceof Anthropic.APIError) return json({ error: "ai_upstream", message: `Erreur du service IA (${e.status ?? "?"}).` }, 502);
  return json({ error: "ai_unknown", message: "Erreur inattendue de l'IA." }, 500);
}

export const REFUSAL_MESSAGE = "Je ne peux pas traiter cette demande. Reformule-la ou pose une autre question sur ta nutrition ou ton entraînement.";

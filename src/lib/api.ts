"use client";

const CODE_KEY = "arise:access-code";
const AI_KEY = "arise:anthropic-key";
const GEMINI_KEY = "arise:gemini-key";
const PROVIDER_KEY = "arise:ai-provider";

export type AiProviderPref = "auto" | "gemini" | "claude";

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export const getGeminiKey = () => read(GEMINI_KEY);
export const setGeminiKey = (key: string) => write(GEMINI_KEY, key);
export const getAiProvider = (): AiProviderPref => (read(PROVIDER_KEY) as AiProviderPref) || "auto";
export const setAiProvider = (p: AiProviderPref) => write(PROVIDER_KEY, p === "auto" ? "" : p);

export function getAccessCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAccessCode(code: string) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getUserAiKey(): string {
  try {
    return localStorage.getItem(AI_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setUserAiKey(key: string) {
  try {
    if (key) localStorage.setItem(AI_KEY, key);
    else localStorage.removeItem(AI_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Headers for our API routes: optional access code and user-provided AI key. */
export function apiHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const code = getAccessCode();
  if (code) headers.set("x-arise-code", code);
  const key = getUserAiKey();
  if (key) headers.set("x-anthropic-key", key);
  const gemini = getGeminiKey();
  if (gemini) headers.set("x-gemini-key", gemini);
  const provider = getAiProvider();
  if (provider !== "auto") headers.set("x-ai-provider", provider);
  return headers;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

/** fetch wrapper that adds the optional access code and normalises errors. */
export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = apiHeaders(init.headers);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError("Connexion impossible. Vérifie ta connexion internet.", 0, "offline");
  }
  if (!res.ok) {
    let body: { message?: string; error?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* not json */
    }
    throw new ApiError(body.message ?? `Erreur ${res.status}`, res.status, body.error);
  }
  return res.json() as Promise<T>;
}

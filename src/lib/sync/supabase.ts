"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SYNC_ENABLED = Boolean(url && anonKey);
export const PHOTO_BUCKET = "progress-photos";

let client: SupabaseClient | null = null;

/** Supabase is optional: returns null when the project isn't configured. */
export function supabase(): SupabaseClient | null {
  if (!SYNC_ENABLED) return null;
  client ??= createClient(url!, anonKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "arise-auth" },
  });
  return client;
}

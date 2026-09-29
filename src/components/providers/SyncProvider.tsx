"use client";

import { useEffect } from "react";
import { initSyncState, installSyncHooks, scheduleSync, syncNow } from "@/lib/sync/engine";
import { supabase } from "@/lib/sync/supabase";

/** Starts cloud sync when Supabase is configured and the user is signed in. */
export function SyncProvider() {
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    installSyncHooks();
    let cancelled = false;
    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      initSyncState(!!data.session, data.session?.user.email ?? undefined);
      if (data.session) void syncNow();
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      initSyncState(!!session, session?.user.email ?? undefined);
      if (event === "SIGNED_IN") void syncNow();
    });
    const onVisible = () => document.visibilityState === "visible" && scheduleSync(500);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    const interval = window.setInterval(() => scheduleSync(0), 3 * 60_000);
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}

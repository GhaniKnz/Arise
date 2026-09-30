"use client";

import { AnimatePresence, motion } from "motion/react";
import { Dumbbell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { QuickSheets } from "@/components/quick/QuickSheets";
import { useActiveSession } from "@/lib/db/hooks";
import { fmtClock } from "@/lib/utils/format";
import { Background } from "./Background";
import { BottomNav, Sidebar, TopBar } from "./Navigation";
import { Splash } from "./Splash";

function ActiveSessionPill() {
  const session = useActiveSession();
  const pathname = usePathname();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);
  const show = !!session && !pathname.startsWith("/session");
  return (
    <AnimatePresence>
      {show && session && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-4 bottom-[calc(4.75rem+var(--safe-bottom))] z-40 mx-auto max-w-md lg:bottom-6 lg:left-auto lg:right-6"
        >
          <Link href="/session" className="panel panel-glow flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-good/15 text-good">
              <Dumbbell className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-ink-3">Séance en cours</span>
              <span className="block truncate font-medium text-ink">{session.name}</span>
            </span>
            <span className="font-display text-lg font-semibold tabular text-good">{fmtClock((now - new Date(session.startedAt).getTime()) / 1000)}</span>
            <ChevronRight className="size-4 text-ink-3" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, profile } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (ready && !profile) router.replace("/onboarding");
  }, [ready, profile, router]);

  if (!ready || !profile) return <Splash />;

  return (
    <div className="relative isolate min-h-dvh" data-effects={profile.effects}>
      <Background particles={profile.effects !== "reduced"} />
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(7rem+var(--safe-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
      <ActiveSessionPill />
      <QuickSheets />
    </div>
  );
}

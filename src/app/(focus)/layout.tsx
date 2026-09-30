"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Background } from "@/components/layout/Background";
import { Splash } from "@/components/layout/Splash";
import { useGame } from "@/components/providers/GameProvider";

/** Distraction-free shell: no navigation, just the task at hand. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  const { ready, profile } = useGame();
  const router = useRouter();
  useEffect(() => {
    if (ready && !profile) router.replace("/onboarding");
  }, [ready, profile, router]);
  if (!ready || !profile) return <Splash />;
  return (
    <div className="relative isolate min-h-dvh" data-effects={profile.effects}>
      <Background particles={false} />
      <main id="main" className="mx-auto w-full max-w-2xl px-4 pt-[calc(0.5rem+var(--safe-top))] pb-40">
        {children}
      </main>
    </div>
  );
}

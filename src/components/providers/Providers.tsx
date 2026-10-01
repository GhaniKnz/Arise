"use client";

import { MotionConfig, MotionGlobalConfig } from "motion/react";
import type { ReactNode } from "react";
import { GameWatcher } from "@/components/game/GameWatcher";
import { SystemLayer } from "@/components/game/SystemLayer";
import { MusicSheetHost } from "@/components/music/Music";
import { GameProvider, useGame } from "./GameProvider";
import { NoZoom } from "./NoZoom";
import { ServiceWorker } from "./ServiceWorker";
import { SyncProvider } from "./SyncProvider";

/** Keeps Motion's global switch in line with the "Animations" setting (idempotent). */
function applyAnimationsPref(off: boolean) {
  MotionGlobalConfig.skipAnimations = off;
}

/** "Animations" setting: off = every Motion animation jumps to its end state. */
function MotionPrefs({ children }: { children: ReactNode }) {
  const { profile } = useGame();
  const off = profile?.animations === false;
  // Applied during render so the very first animations of a page already follow it.
  applyAnimationsPref(off);
  return <MotionConfig reducedMotion={off ? "always" : "user"}>{children}</MotionConfig>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <MotionPrefs>
        {children}
        <GameWatcher />
        <SystemLayer />
        <ServiceWorker />
        <NoZoom />
        <SyncProvider />
        <MusicSheetHost />
      </MotionPrefs>
    </GameProvider>
  );
}

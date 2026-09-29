"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { GameWatcher } from "@/components/game/GameWatcher";
import { SystemLayer } from "@/components/game/SystemLayer";
import { GameProvider } from "./GameProvider";
import { ServiceWorker } from "./ServiceWorker";
import { SyncProvider } from "./SyncProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <GameProvider>
        {children}
        <GameWatcher />
        <SystemLayer />
        <ServiceWorker />
        <SyncProvider />
      </GameProvider>
    </MotionConfig>
  );
}

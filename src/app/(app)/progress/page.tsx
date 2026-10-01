"use client";

import { Camera, Percent, Repeat2, Ruler, Scale } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CycleSheet } from "@/components/cycles/CycleSheet";
import { CycleBadge } from "@/components/cycles/CyclesPanel";
import { useGame } from "@/components/providers/GameProvider";
import { CompositionPanel, MeasuresPanel, WeighInsList } from "@/components/progress/BodyPanels";
import { PhotosPanel } from "@/components/progress/PhotosPanel";
import { WeightPanel } from "@/components/progress/WeightPanel";
import { useGoalProgress } from "@/components/dashboard/GoalCard";
import { Segmented } from "@/components/ui/Fields";
import { PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtDec } from "@/lib/utils/format";

type Tab = "weight" | "measures" | "composition" | "photos";

const SWITCH = { kind: "switch" } as const;

function Progress() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "weight";
  const goal = useGoalProgress();
  const { cycles } = useGame();
  const running = cycles.at(-1);
  const [switching, setSwitching] = useState(false);
  const setTab = (t: Tab) => router.replace(t === "weight" ? "/progress" : `/progress?tab=${t}`, { scroll: false });

  return (
    <>
      <PageHeader
        kicker="Corps"
        title="Progress"
        subtitle={goal ? `${fmtDec(goal.start)} kg → ${fmtDec(goal.target)} kg · ${Math.round(goal.pct * 100)} % du chemin` : undefined}
        action={
          running && (
            <button type="button" onClick={() => setSwitching(true)} className="flex flex-col items-end gap-1 text-[11px] text-ink-3 hover:text-ink-2" aria-label={`Cycle en cours : ${running.name}. Changer de cycle`}>
              <CycleBadge span={running} />
              <span className="flex items-center gap-1">
                <Repeat2 className="size-3" /> Changer de cycle
              </span>
            </button>
          )
        }
      />
      <CycleSheet mode={switching ? SWITCH : null} onClose={() => setSwitching(false)} />
      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        ariaLabel="Sections"
        size="sm"
        options={[
          { value: "weight", label: "Poids", icon: <Scale /> },
          { value: "measures", label: "Mesures", icon: <Ruler /> },
          { value: "composition", label: "Compo", icon: <Percent /> },
          { value: "photos", label: "Photos", icon: <Camera /> },
        ]}
      />
      {tab === "weight" && (
        <div className="space-y-4">
          <WeightPanel />
          <WeighInsList />
        </div>
      )}
      {tab === "measures" && <MeasuresPanel />}
      {tab === "composition" && <CompositionPanel />}
      {tab === "photos" && <PhotosPanel />}
    </>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Progress />
    </Suspense>
  );
}

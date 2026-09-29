"use client";

import { Camera, Percent, Ruler, Scale } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CompositionPanel, MeasuresPanel, WeighInsList } from "@/components/progress/BodyPanels";
import { PhotosPanel } from "@/components/progress/PhotosPanel";
import { WeightPanel } from "@/components/progress/WeightPanel";
import { useGoalProgress } from "@/components/dashboard/GoalCard";
import { Segmented } from "@/components/ui/Fields";
import { PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtDec } from "@/lib/utils/format";

type Tab = "weight" | "measures" | "composition" | "photos";

function Progress() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "weight";
  const goal = useGoalProgress();
  const setTab = (t: Tab) => router.replace(t === "weight" ? "/progress" : `/progress?tab=${t}`, { scroll: false });

  return (
    <>
      <PageHeader kicker="Corps" title="Progress" subtitle={goal ? `${fmtDec(goal.start)} kg → ${fmtDec(goal.target)} kg · ${Math.round(goal.pct * 100)} % du chemin` : undefined} />
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

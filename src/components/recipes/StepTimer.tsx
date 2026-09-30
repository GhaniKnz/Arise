"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { fmtClock } from "@/lib/utils/format";

/** Tap-to-start countdown for a recipe step (wall-clock based, survives a backgrounded tab). */
export function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const total = Math.round(minutes * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState(total);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (endAt == null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        window.clearInterval(id);
        setEndAt(null);
        setPausedLeft(0);
        cue("timer");
        toast({ tone: "quest", title: "Minuteur terminé", message: label });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endAt, label]);

  const running = endAt != null;
  const left = running ? Math.max(0, Math.ceil((endAt - now) / 1000)) : pausedLeft;
  const start = () => {
    const t = Date.now();
    setNow(t);
    setEndAt(t + pausedLeft * 1000);
  };

  if (!running && pausedLeft === total)
    return (
      <button type="button" onClick={start} className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-semibold text-warn transition active:scale-95" aria-label={`Lancer un minuteur de ${minutes} minutes`}>
        <Timer className="size-3" /> {minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}` : `${minutes} min`}
      </button>
    );
  const done = left === 0;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-[11px] font-semibold tabular", done ? "border-good/50 bg-good/15 text-good" : "border-warn/50 bg-warn/15 text-warn")} role="timer" aria-live="polite">
      <span className="px-1">{done ? "Terminé !" : fmtClock(left)}</span>
      {!done && (
        <button
          type="button"
          onClick={() => {
            if (running) {
              setPausedLeft(left);
              setEndAt(null);
            } else start();
          }}
          className="flex size-5 items-center justify-center rounded-full bg-white/10"
          aria-label={running ? "Pause" : "Reprendre"}
        >
          {running ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setEndAt(null);
          setPausedLeft(total);
        }}
        className="flex size-5 items-center justify-center rounded-full bg-white/10"
        aria-label="Réinitialiser le minuteur"
      >
        <RotateCcw className="size-3" />
      </button>
    </span>
  );
}

"use client";

import { MoveHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProgressPhoto } from "@/lib/db/types";
import { formatShort } from "@/lib/utils/date";
import { fmtDec } from "@/lib/utils/format";

export function useBlobUrl(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function caption(p: ProgressPhoto) {
  return [formatShort(p.date), p.weightKg ? `${fmtDec(p.weightKg)} kg` : null, p.waistCm ? `taille ${fmtDec(p.waistCm)}` : null].filter(Boolean).join(" · ");
}

/** Before/after comparison with a draggable (and keyboard-accessible) divider. */
export function PhotoCompare({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const a = useBlobUrl(before.blob);
  const b = useBlobUrl(after.blob);
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative aspect-[3/4] w-full touch-none overflow-hidden rounded-2xl border border-line bg-black select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          update(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && update(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {b && <img src={b} alt={`Après : ${caption(after)}`} className="absolute inset-0 size-full object-cover" draggable={false} />}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {a && <img src={a} alt={`Avant : ${caption(before)}`} className="absolute inset-0 size-full object-cover" draggable={false} />}
        </div>
        <div className="absolute inset-y-0 w-0.5 bg-arise shadow-[0_0_12px_#4da3ff]" style={{ left: `${pos}%` }} aria-hidden>
          <span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-arise bg-void/80 text-arise">
            <MoveHorizontal className="size-5" />
          </span>
        </div>
        <span className="absolute top-3 left-3 rounded-lg bg-void/75 px-2 py-1 text-xs font-semibold text-ink">AVANT</span>
        <span className="absolute top-3 right-3 rounded-lg bg-void/75 px-2 py-1 text-xs font-semibold text-ink">APRÈS</span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Position du comparateur avant / après" className="w-full accent-[#4da3ff]" />
      <div className="flex justify-between text-xs text-ink-3">
        <span>{caption(before)}</span>
        <span>{caption(after)}</span>
      </div>
    </div>
  );
}

export function PhotoThumb({ photo, selected, onClick, badge }: { photo: ProgressPhoto; selected?: boolean; onClick?: () => void; badge?: string }) {
  const url = useBlobUrl(photo.thumb);
  return (
    <button type="button" onClick={onClick} className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 bg-deep transition ${selected ? "border-arise shadow-glow" : "border-transparent"}`} aria-pressed={selected}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt={`Photo du ${formatShort(photo.date)}`} className="size-full object-cover" loading="lazy" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-left text-[10px] text-white">{formatShort(photo.date)}</span>
      {badge && <span className="absolute top-1 left-1 rounded bg-arise px-1 text-[9px] font-bold text-void">{badge}</span>}
    </button>
  );
}

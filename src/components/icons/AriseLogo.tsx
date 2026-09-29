import { cn } from "@/lib/utils/cn";

/** Original emblem: a rising "A" rune inside a hexagonal gate. */
export function AriseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="arise-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7cc0ff" />
          <stop offset="55%" stopColor="#4da3ff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="arise-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" fill="rgb(77 163 255 / 0.08)" stroke="url(#arise-mark)" strokeWidth="1.6" />
      <path d="M24 11 34.5 35h-5.2L24 22.6 18.7 35h-5.2Z" fill="url(#arise-mark)" filter="url(#arise-glow)" />
      <path d="M19.8 30.5h8.4" stroke="#05070d" strokeWidth="2" />
      <path d="M24 6.5v3" stroke="#9fd0ff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function AriseWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <AriseMark className="size-8" />
      <span className="text-glow font-display text-lg font-bold tracking-[0.32em] text-ink">ARISE</span>
    </span>
  );
}

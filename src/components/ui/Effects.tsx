import type { CSSProperties } from "react";

/** Periodic light sweep across the parent (which must be `relative`, ideally `overflow-hidden`). */
export function Sweep({ delay = 1.2, duration = 7 }: { delay?: number; duration?: number }) {
  return <span className="fx-sweep" style={{ "--sweep-delay": `${delay}s`, "--sweep-duration": `${duration}s` } as CSSProperties} aria-hidden />;
}

/** A few twinkling dots, for celebratory states. */
export function Sparkles({ color = "#9fd0ff", count = 6 }: { color?: string; count?: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="sparkle absolute size-1 rounded-full"
          style={{
            left: `${(i * 37 + 11) % 92}%`,
            top: `${(i * 53 + 17) % 84}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animationDelay: `${(i * 0.37) % 2.4}s`,
          }}
        />
      ))}
    </span>
  );
}

import type { Equipment } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";

/** Compact line icons for equipment types (24×24 grid, currentColor). */
export function EquipmentIcon({ equipment, className }: { equipment: Equipment; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body;
  switch (equipment) {
    case "barbell":
    case "smith":
      body = (
        <>
          <path d="M2 12h20" {...common} />
          <rect x="4" y="7" width="3" height="10" rx="1" {...common} />
          <rect x="17" y="7" width="3" height="10" rx="1" {...common} />
          {equipment === "smith" && <path d="M12 3v18" {...common} strokeDasharray="2 2" />}
        </>
      );
      break;
    case "ez_bar":
      body = (
        <>
          <path d="M3 12h4l2-2 2 4 2-4 2 4 2-2h4" {...common} />
          <rect x="1.5" y="8" width="2.5" height="8" rx="1" {...common} />
          <rect x="20" y="8" width="2.5" height="8" rx="1" {...common} />
        </>
      );
      break;
    case "dumbbell":
      body = (
        <>
          <path d="M8 12h8" {...common} />
          <rect x="3" y="8" width="5" height="8" rx="1.5" {...common} />
          <rect x="16" y="8" width="5" height="8" rx="1.5" {...common} />
        </>
      );
      break;
    case "kettlebell":
      body = (
        <>
          <path d="M8.5 9a3.5 3.5 0 1 1 7 0" {...common} />
          <path d="M6 14a6 6 0 0 1 12 0c0 3-1.5 6-6 6s-6-3-6-6Z" {...common} />
        </>
      );
      break;
    case "machine":
      body = (
        <>
          <rect x="4" y="3" width="4" height="18" rx="1" {...common} />
          <path d="M8 7h8M8 12h10M16 5v4M18 10v4" {...common} />
          <path d="M3 21h18" {...common} />
        </>
      );
      break;
    case "cable":
      body = (
        <>
          <path d="M5 3v18M5 4h14" {...common} />
          <circle cx="17" cy="6" r="1.8" {...common} />
          <path d="M17 8v7" {...common} />
          <path d="M14 15h6l-1 3h-4Z" {...common} />
        </>
      );
      break;
    case "band":
      body = <path d="M5 6c4 0 4 12 7 12s3-12 7-12" {...common} />;
      break;
    case "bodyweight":
    default:
      body = (
        <>
          <circle cx="12" cy="4.5" r="2" {...common} />
          <path d="M12 7v7M7 10h10M12 14l-3.5 6.5M12 14l3.5 6.5" {...common} />
        </>
      );
  }
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} aria-hidden>
      {body}
    </svg>
  );
}

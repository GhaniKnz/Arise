import {
  Beef,
  Box,
  Carrot,
  Coffee,
  CookingPot,
  Cookie,
  Croissant,
  Dumbbell,
  Egg,
  Fish,
  Flame,
  Globe,
  Layers,
  Leaf,
  Microwave,
  Milk,
  Package,
  PiggyBank,
  Salad,
  Snowflake,
  Timer,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const LUCIDE: Record<string, LucideIcon> = {
  pot: CookingPot,
  microwave: Microwave,
  flame: Flame,
  snowflake: Snowflake,
  timer: Timer,
  beef: Beef,
  piggy: PiggyBank,
  leaf: Leaf,
  layers: Layers,
  coffee: Coffee,
  mug: Coffee,
  utensils: Utensils,
  salad: Salad,
  bowl: Salad,
  cookie: Cookie,
  milk: Milk,
  egg: Egg,
  carrot: Carrot,
  wheat: Wheat,
  croissant: Croissant,
  globe: Globe,
  package: Package,
  dumbbell: Dumbbell,
  fish: Fish,
  containers: Box,
};

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Hand-drawn line icons for kitchen tools missing from the icon set (24×24, currentColor). */
const CUSTOM: Record<string, React.ReactNode> = {
  pan: (
    <>
      <path d="M2.5 11h13v1a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5Z" {...stroke} />
      <path d="M15.5 12.5h6" {...stroke} />
    </>
  ),
  oven: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" {...stroke} />
      <path d="M3.5 8h17M7 5.8h.01M10 5.8h.01" {...stroke} />
      <rect x="7" y="11" width="10" height="6.5" rx="1" {...stroke} />
    </>
  ),
  tray: (
    <>
      <path d="M3 9h18l-1.5 7.5a1.5 1.5 0 0 1-1.5 1.2H6a1.5 1.5 0 0 1-1.5-1.2Z" {...stroke} />
      <path d="M7 12.5h10" {...stroke} />
    </>
  ),
  blender: (
    <>
      <path d="M7 3h10l-1.5 11h-7Z" {...stroke} />
      <path d="M17 5h2v5h-2.6" {...stroke} />
      <rect x="7" y="14" width="10" height="7" rx="1.5" {...stroke} />
      <path d="M12 17.5h.01" {...stroke} />
    </>
  ),
  knife: (
    <>
      <path d="M4 20 16.5 7.5c1.5-1.5 3.5-1.5 4 0L9 19Z" {...stroke} />
      <path d="M4 20l3-3" {...stroke} />
    </>
  ),
  board: (
    <>
      <rect x="3" y="7" width="15" height="12" rx="2.5" {...stroke} />
      <path d="M18 11h1.5a1.5 1.5 0 0 1 0 3H18" {...stroke} />
    </>
  ),
  grater: (
    <>
      <path d="M8 3h8l1.5 18h-11Z" {...stroke} />
      <path d="M10 8h.01M13 8h.01M10 11.5h.01M13 11.5h.01M10 15h.01M13 15h.01" {...stroke} strokeWidth={2.4} />
    </>
  ),
  peeler: (
    <>
      <path d="M12 21v-8" {...stroke} />
      <path d="M8.5 13h7" {...stroke} />
      <path d="M9.5 13 10 5a2 2 0 0 1 4 0l.5 8" {...stroke} />
      <path d="M12 6v4" {...stroke} />
    </>
  ),
  whisk: (
    <>
      <path d="M12 21v-6" {...stroke} />
      <path d="M12 15c-4 0-5-5-5-8a5 5 0 0 1 10 0c0 3-1 8-5 8Z" {...stroke} />
      <path d="M12 15c-1.6 0-2.2-5-2.2-8S10.5 2 12 2s2.2 2 2.2 5-.6 8-2.2 8Z" {...stroke} />
    </>
  ),
  strainer: (
    <>
      <path d="M3 9h14a7 7 0 0 1-14 0Z" {...stroke} />
      <path d="M17 10h4" {...stroke} />
      <path d="M7 12h.01M10 13.5h.01M13 12h.01" {...stroke} strokeWidth={2.4} />
    </>
  ),
  spatula: (
    <>
      <path d="M12 21v-8" {...stroke} />
      <rect x="8" y="3" width="8" height="10" rx="2" {...stroke} />
      <path d="M11 6v4M13 6v4" {...stroke} />
    </>
  ),
  jar: (
    <>
      <path d="M7 3h10v3H7z" {...stroke} />
      <path d="M7.5 6h9A1.5 1.5 0 0 1 18 7.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7.5A1.5 1.5 0 0 1 7.5 6Z" {...stroke} />
      <path d="M6 12h12" {...stroke} />
    </>
  ),
  paper: (
    <>
      <path d="M4 6h13a3 3 0 0 1 3 3v9H7a3 3 0 0 1-3-3Z" {...stroke} />
      <path d="M4 6a3 3 0 0 0 3 3h13" {...stroke} />
    </>
  ),
};

export function KitchenIcon({ name, className }: { name: string; className?: string }) {
  const Lucide = LUCIDE[name];
  if (Lucide) return <Lucide className={cn("size-4 shrink-0", className)} aria-hidden />;
  const body = CUSTOM[name] ?? CUSTOM.pan;
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} aria-hidden>
      {body}
    </svg>
  );
}

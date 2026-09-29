import type { Muscle } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";

type Region = { muscle: Muscle | null; points: string };

const mirror = (pts: string) =>
  pts
    .split(" ")
    .map((p) => {
      const [x, y] = p.split(",").map(Number);
      return `${60 - x},${y}`;
    })
    .join(" ");

const pair = (muscle: Muscle | null, pts: string): Region[] => [
  { muscle, points: pts },
  { muscle, points: mirror(pts) },
];

const FRONT: Region[] = [
  { muscle: "traps", points: "24,15.5 36,15.5 40,19.5 20,19.5" },
  ...pair("shoulders", "12,20 19,19.5 19,28 11,30"),
  ...pair("chest", "19.5,20 29.5,20 29.5,31 21,31.5 19.5,28"),
  ...pair("biceps", "11,31 18,30 17,42 11,43"),
  ...pair("forearms", "10.5,44 17,43 15,56 9,56"),
  { muscle: "abs", points: "22.5,32.5 37.5,32.5 36.5,52 23.5,52" },
  ...pair("obliques", "19.5,32.5 22,32.5 23,51 20,49"),
  { muscle: null, points: "21,52.5 39,52.5 40,58 20,58" },
  ...pair("quads", "19.5,58.5 27,58.5 27.5,80 21,80"),
  ...pair("adductors", "27.5,58.5 29.5,58.5 29,71 28,71"),
  ...pair("calves", "21,83 28,83 27,98 22.5,98"),
];

const BACK: Region[] = [
  { muscle: "traps", points: "24,15 36,15 40.5,20.5 30,30 19.5,20.5" },
  ...pair("rear_delts", "12,20 19,19.5 19,28 11,30"),
  ...pair("back", "19.5,21.5 29.5,31 29.5,44 22,42 19.5,31"),
  ...pair("triceps", "11,31 18,30 17,42 11,43"),
  ...pair("forearms", "10.5,44 17,43 15,56 9,56"),
  { muscle: "lower_back", points: "23.5,44 36.5,44 37,52 23,52" },
  ...pair("glutes", "20,52.5 29.5,52.5 29.5,62.5 20.5,62.5"),
  ...pair("hamstrings", "20.5,63.5 29,63.5 28,80 21,80"),
  ...pair("calves", "21,83 28,83 27,98 22.5,98"),
];

const FRONT_MUSCLES = new Set<Muscle>(["chest", "shoulders", "biceps", "abs", "obliques", "quads", "adductors"]);

export function viewFor(primary: Muscle): "front" | "back" {
  return FRONT_MUSCLES.has(primary) ? "front" : primary === "forearms" ? "front" : "back";
}

function Figure({ regions, primary, secondary, id }: { regions: Region[]; primary: Muscle[]; secondary: Muscle[]; id: string }) {
  return (
    <g>
      <circle cx="30" cy="8.5" r="5.8" fill="rgb(255 255 255 / 0.08)" stroke="rgb(255 255 255 / 0.14)" strokeWidth="0.6" />
      <rect x="27" y="13.5" width="6" height="3" rx="1" fill="rgb(255 255 255 / 0.08)" />
      {regions.map((r, i) => {
        const isPrimary = r.muscle != null && primary.includes(r.muscle);
        const isSecondary = !isPrimary && r.muscle != null && secondary.includes(r.muscle);
        return (
          <polygon
            key={i}
            points={r.points}
            fill={isPrimary ? `url(#mp-${id})` : isSecondary ? "rgb(167 139 250 / 0.55)" : "rgb(255 255 255 / 0.07)"}
            stroke={isPrimary ? "#9fd0ff" : isSecondary ? "rgb(167 139 250 / 0.8)" : "rgb(255 255 255 / 0.13)"}
            strokeWidth="0.6"
            strokeLinejoin="round"
            filter={isPrimary ? `url(#mg-${id})` : undefined}
          />
        );
      })}
    </g>
  );
}

interface Props {
  primary: Muscle | Muscle[];
  secondary?: Muscle[];
  view?: "front" | "back" | "both" | "auto";
  className?: string;
  title?: string;
}

/** Minimal anatomical silhouette highlighting the worked muscles. */
export function MuscleIcon({ primary, secondary = [], view = "auto", className, title }: Props) {
  const prim = Array.isArray(primary) ? primary : [primary];
  const resolved = view === "auto" ? viewFor(prim[0]) : view;
  const id = `${prim.join("-")}-${resolved}`;
  const width = resolved === "both" ? 124 : 60;
  return (
    <svg viewBox={`0 0 ${width} 102`} className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`mp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6fb8ff" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <filter id={`mg-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {resolved === "both" ? (
        <>
          <Figure regions={FRONT} primary={prim} secondary={secondary} id={id} />
          <g transform="translate(64 0)">
            <Figure regions={BACK} primary={prim} secondary={secondary} id={id} />
          </g>
        </>
      ) : (
        <Figure regions={resolved === "front" ? FRONT : BACK} primary={prim} secondary={secondary} id={id} />
      )}
    </svg>
  );
}

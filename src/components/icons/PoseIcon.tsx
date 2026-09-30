import { cn } from "@/lib/utils/cn";

/**
 * Movement silhouettes (48×48, side or front view). The body uses the text
 * color; equipment is drawn in the same color, dimmed. Keys are stored in
 * data as `p:<key>`.
 */
type Pose = {
  label: string;
  /** Caption under small tiles when the label is too long. */
  short?: string;
  head: [number, number];
  /** Body polylines (limbs, torso). */
  body: string[];
  /** Equipment polylines. */
  gear?: string[];
  /** Plates / weights: [cx, cy, r]. */
  plates?: [number, number, number][];
  /** Free SVG paths for equipment (arcs…). */
  paths?: string[];
  /** Dashed motion hints. */
  motion?: string[];
  floor?: boolean;
  keywords: string[];
};

export const POSES: Record<string, Pose> = {
  squat: {
    label: "Squat",
    head: [28.5, 15.5],
    body: ["31,44 27,44 33,35 22,34 26,21", "26,21 31,25.5 28.5,19.5"],
    plates: [[24.5, 19.5, 5.5]],
    floor: true,
    keywords: ["squat", "goblet", "hack"],
  },
  deadlift: {
    label: "Soulevé de terre",
    short: "Soulevé",
    head: [34, 18.5],
    body: ["30,44 26,44 29,35.5 18,28 30,22", "30,22 30.5,37"],
    plates: [[30.5, 38.5, 5.8]],
    floor: true,
    keywords: ["souleve", "deadlift", "rdl", "roumain", "good morning"],
  },
  bench: {
    label: "Développé couché",
    short: "Couché",
    head: [7.5, 28],
    body: ["39.5,44 36,44 33.5,34.5 26,31.5 12.5,31", "12.5,31 13,18"],
    gear: ["5,34.5 35,34.5", "9,34.5 9,44", "31,34.5 31,44"],
    plates: [[13, 15, 5]],
    floor: true,
    keywords: ["couche", "bench", "incline", "decline", "developpe halteres"],
  },
  ohp: {
    label: "Développé militaire",
    short: "Militaire",
    head: [24, 10.5],
    body: ["24,15.5 24,29", "17.5,17 30.5,17", "17.5,17 14.5,11 15,5", "30.5,17 33.5,11 33,5", "19.5,44 21,37 22,29.5 26,29.5 27,37 28.5,44"],
    gear: ["6,5 42,5"],
    paths: ["M7 1.5h3.2v7H7z", "M37.8 1.5H41v7h-3.2z"],
    floor: true,
    keywords: ["militaire", "overhead", "arnold", "developpe epaules", "developpe assis", "shoulder press"],
  },
  pullup: {
    label: "Traction",
    head: [24, 12.5],
    body: ["14,6 11.5,14.5 18,19", "34,6 36.5,14.5 30,19", "18,19 30,19", "24,17 24,32", "21,44 22,38 22.5,32 25.5,32 26,38 27,44"],
    gear: ["3,6 45,6"],
    keywords: ["traction", "pull-up", "pull up", "chin", "muscle-up"],
  },
  pushup: {
    label: "Pompes",
    head: [39.5, 30.5],
    body: ["6,43.5 22,38.3 35,33.5", "35,33.5 35.5,44"],
    floor: true,
    keywords: ["pompe", "push-up", "push up"],
  },
  dip: {
    label: "Dips",
    head: [24, 13.5],
    body: ["10,25 11,15.5 18,19.5", "38,25 37,15.5 30,19.5", "18,19.5 30,19.5", "24,18 24,31", "21,42 22,36.5 22.5,31 25.5,31 26,36.5 27,42"],
    gear: ["6,25 14,25", "34,25 42,25", "10,25 10,45", "38,25 38,45"],
    keywords: ["dip"],
  },
  row: {
    label: "Rowing",
    head: [32.5, 19.5],
    body: ["27,44 23,44 25,36.5 15,30 28,22.5", "28,22.5 20.5,23.5 25,30"],
    plates: [[25.5, 31, 4.2]],
    floor: true,
    keywords: ["rowing", "row", "tirage horizontal", "tirage buste", "t-bar"],
  },
  curl: {
    label: "Curl",
    head: [24.5, 7.5],
    body: ["27,44 23,44 23.5,35 23,26 23.5,13.5", "23.5,13.5 23,21.5 30,17"],
    plates: [[31.5, 16.2, 2.8]],
    floor: true,
    keywords: ["curl", "biceps"],
  },
  lateral: {
    label: "Élévations latérales",
    short: "Élévations",
    head: [24, 8.5],
    body: ["24,13 24,28.5", "18,15 30,15", "18,15 10.5,16 4.5,16.5", "30,15 37.5,16 43.5,16.5", "19.5,44 21,36.5 22,28.5 26,28.5 27,36.5 28.5,44"],
    plates: [
      [4, 16.5, 2.6],
      [44, 16.5, 2.6],
    ],
    floor: true,
    keywords: ["elevation", "lateral", "oiseau", "face pull"],
  },
  lunge: {
    label: "Fentes",
    head: [24, 12],
    body: ["36,44 32,44 32,34.5 23,31 17,41.5 8,43.5", "23,31 23.5,18", "23.5,18 25.5,30.5"],
    plates: [[25.8, 32.4, 2.6]],
    floor: true,
    keywords: ["fente", "lunge", "bulgare", "split squat", "step-up", "step up"],
  },
  hipthrust: {
    label: "Hip thrust",
    head: [7.2, 27.5],
    body: ["38,44 34.5,44 34,32 25,31 12,31", "12,31 22,27.5"],
    gear: ["2,33 13,33 13,44", "2,33 2,44"],
    plates: [[25, 26.3, 4.6]],
    floor: true,
    keywords: ["hip thrust", "pont", "bridge", "fessier", "glute"],
  },
  calf: {
    label: "Mollets",
    head: [24, 5.5],
    body: ["27.5,40 23,38.5 23.3,30.5 23,22.5 23.5,11", "23.5,11 25,22.5"],
    gear: ["16,40 34,40 34,44", "16,40 16,44"],
    plates: [[25.3, 24.2, 2.4]],
    motion: ["17,35 19,32.5 21,35"],
    floor: true,
    keywords: ["mollet", "calf", "extension debout"],
  },
  plank: {
    label: "Gainage",
    head: [38.5, 33],
    body: ["6,43.5 34,36", "34,36 34,43.5 41.5,43.5"],
    floor: true,
    keywords: ["gainage", "planche", "plank", "hollow"],
  },
  crunch: {
    label: "Crunch",
    head: [9, 31],
    body: ["36,43.5 29.5,34.5 22,42 15,40.5 11,36", "11,36 20,33"],
    floor: true,
    keywords: ["crunch", "abdo", "releve", "sit-up", "sit up", "enroulement"],
  },
  pulldown: {
    label: "Tirage vertical",
    short: "Tirage",
    head: [24, 14.5],
    body: ["12,9 12,19 18,20", "36,9 36,19 30,20", "18,20 30,20", "24,18.5 24,31", "19,31 29,31", "19,31 18,37.5 18,44", "29,31 30,37.5 30,44"],
    gear: ["6,9 42,9", "24,9 24,1", "13,33 35,33"],
    floor: true,
    keywords: ["tirage vertical", "pulldown", "lat pull", "tirage poitrine", "tirage nuque"],
  },
  triceps: {
    label: "Extension triceps",
    short: "Triceps",
    head: [24, 7.5],
    body: ["25,44 21,44 21.5,35 21,26 22.5,13.5", "22.5,13.5 23.5,21.5 29.5,27"],
    gear: ["31.5,3 29.8,26"],
    plates: [[31.6, 2.6, 1.8]],
    floor: true,
    keywords: ["triceps", "pushdown", "barre au front", "kickback", "extension nuque", "extension poulie"],
  },
  legext: {
    label: "Leg extension",
    short: "Leg ext.",
    head: [12, 9.5],
    body: ["11,15 13,28 24,28 33,24", "11,15 16,28"],
    gear: ["9,30 26,30", "9,30 7,13", "17.5,30 17.5,44", "24,31.5 24,44"],
    plates: [[34.6, 22.6, 2.4]],
    floor: true,
    keywords: ["leg extension", "extension jambe", "extension des jambes", "leg curl", "ischio"],
  },
  legpress: {
    label: "Presse à cuisses",
    short: "Presse",
    head: [8.5, 19],
    body: ["11,25 17,36 25,30 35,24", "11,25 17,31"],
    gear: ["5,22 13,40 25,40", "34,16.5 40.5,29.5", "19,40 19,44"],
    floor: true,
    keywords: ["presse", "leg press", "hack squat"],
  },
  kbswing: {
    label: "Swing kettlebell",
    short: "Kettlebell",
    head: [21, 7.5],
    body: ["24,44 20,44 20.5,35 19,26 19.5,13.5", "19.5,13.5 33,15"],
    paths: ["M31.8 17.6c0-4 5.4-4 5.4 0"],
    plates: [[34.5, 21.2, 4]],
    motion: ["M22 38 Q38 38 39 24"],
    floor: true,
    keywords: ["kettlebell", "swing", "snatch"],
  },
  run: {
    label: "Course",
    head: [27.5, 8],
    body: ["25.5,14 22,26", "30.5,40 27,39.5 29,31 22,26 18,34.5 10.5,37", "25.5,14 30,19.5 34,15.5", "25.5,14 19.5,18 16,23.5"],
    motion: ["3,14 9,14", "1,20 8,20", "4,26 10,26"],
    keywords: ["course", "run", "sprint", "tapis", "footing", "jogging"],
  },
  bike: {
    label: "Vélo",
    head: [33, 9.5],
    body: ["18,21 29,14", "29,14 33.5,20", "18,21 26,26.5 23,34"],
    gear: ["11,35 19,24 30,24 37,35", "19,24 23,35 30,24", "30,24 33.5,19.5 36,19.5", "17,21 21,21"],
    paths: ["M11 27.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15z", "M37 27.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15z"],
    keywords: ["velo", "bike", "spinning", "cycling", "elliptique"],
  },
  rope: {
    label: "Corde à sauter",
    short: "Corde",
    head: [24, 7.5],
    body: ["24,12 24,25", "24,13.5 17,19 13,25", "24,13.5 31,19 35,25", "20,41 21.5,33 24,25 26.5,33 28,41"],
    paths: ["M13 25C9 51 39 51 35 25"],
    keywords: ["corde", "saut", "jump", "burpee"],
  },
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Keyword found at the start of a word ("velo" must not match "développé"). */
const hasWord = (text: string, w: string) => {
  for (let i = text.indexOf(w); i !== -1; i = text.indexOf(w, i + 1)) if (i === 0 || !/[a-z0-9]/.test(text[i - 1])) return true;
  return false;
};

/** Movement silhouettes whose keywords appear in an exercise name (best first). */
export function suggestPoses(name: string, max = 4): string[] {
  const n = norm(name);
  if (n.trim().length < 3) return [];
  return Object.entries(POSES)
    .map(([k, p]) => [k, Math.max(0, ...p.keywords.filter((w) => hasWord(n, w)).map((w) => w.length))] as const)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

export function PoseIcon({ pose, className, title }: { pose: string; className?: string; title?: string }) {
  const p = POSES[pose] ?? POSES.squat;
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {p.floor && <line x1="3" y1="45.5" x2="45" y2="45.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" strokeLinecap="round" />}
      <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {p.gear?.map((g) => <polyline key={g} points={g} />)}
        {p.paths?.map((d) => <path key={d} d={d} />)}
      </g>
      {p.motion?.map((m) => (m.startsWith("M") ? <path key={m} d={m} stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round" /> : <polyline key={m} points={m} stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round" strokeLinejoin="round" />))}
      {p.plates?.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.6" />)}
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        {p.body.map((b) => <polyline key={b} points={b} />)}
      </g>
      <circle cx={p.head[0]} cy={p.head[1]} r="3.4" fill="currentColor" />
    </svg>
  );
}

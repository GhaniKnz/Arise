import type { TrackCategory } from "@/lib/db/types";

/**
 * Official Solo Leveling anime music (titles and credits only). The audio is
 * copyrighted and is NOT shipped with ARISE: each entry is a slot the user
 * fills with their own file, or opens on an official streaming service.
 */
export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  category: TrackCategory;
  /** Short context shown next to the title. */
  tag: string;
}

export const CATALOG: CatalogTrack[] = [
  { id: "s1-op", title: "LEveL", artist: "SawanoHiroyuki[nZk]:TOMORROW X TOGETHER", category: "opening", tag: "Opening · saison 1" },
  { id: "s2-op", title: "ReawakeR (feat. Felix of Stray Kids)", artist: "LiSA", category: "opening", tag: "Opening · saison 2" },
  { id: "s1-ed", title: "request", artist: "krage", category: "ending", tag: "Ending · saison 1" },
  { id: "s2-ed", title: "UN-APEX", artist: "TK from Ling tosite sigure", category: "ending", tag: "Ending · saison 2" },

  { id: "s1-dark-aria", title: "DARK ARIA", artist: "Hiroyuki Sawano (feat. XAI)", category: "ost", tag: "OST saison 1" },
  ...Array.from({ length: 10 }, (_, i) => ({ id: `s1-suite-${i + 1}`, title: `[Solo-Leveling]SymphonicSuite-Lv.${i + 1}`, artist: "Hiroyuki Sawano", category: "ost" as const, tag: "OST saison 1" })),
  { id: "s1-dungeon", title: "DunGeoN", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-ksk-gate", title: "KSK→GATE", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-hunter-monster", title: "Hunter→Monster", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-am-km", title: "Am→Km", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-everyday", title: "everydayLV.0", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-aikari", title: "aikari", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-onlyore", title: "onlyORE", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },
  { id: "s1-4evr", title: "4eVR", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 1" },

  { id: "s2-reviver", title: "REVIVER (feat. SennaRin)", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 2" },
  { id: "s2-shadowborn", title: "SHADOWBORN (feat. Benjamin & mpi)", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 2" },
  { id: "s2-howl", title: "HOWL", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 2" },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `s2-suite-${i + 1}`, title: `[Solo-Leveling]-Arise from the Shadow-Suite-Lv.${i + 1}`, artist: "Hiroyuki Sawano", category: "ost" as const, tag: "OST saison 2" })),
  { id: "s2-theme1", title: "[Solo-Leveling]Theme1-PF", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 2" },
  { id: "s2-theme2", title: "[Solo-Leveling]Theme2-PF", artist: "Hiroyuki Sawano", category: "ost", tag: "OST saison 2" },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

export const CATEGORY_LABEL: Record<TrackCategory, string> = {
  opening: "Openings",
  ending: "Endings",
  ost: "OST",
  insert: "Insert songs",
  sfx: "Sons",
  other: "Autres",
};

/** Official streaming services, searched for the exact title and artist. */
export function listenLinks(t: Pick<CatalogTrack, "title" | "artist">) {
  const q = encodeURIComponent(`${t.title} ${t.artist.replace(/\(feat\..*\)/, "")}`.trim());
  return [
    { label: "Spotify", href: `https://open.spotify.com/search/${q}` },
    { label: "YouTube Music", href: `https://music.youtube.com/search?q=${q}` },
    { label: "Apple Music", href: `https://music.apple.com/fr/search?term=${q}` },
    { label: "Deezer", href: `https://www.deezer.com/search/${q}` },
  ];
}

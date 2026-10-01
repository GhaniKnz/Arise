"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, ExternalLink, FileAudio, Link2, ListMusic, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Square, Trash2, Upload, Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, Field, Select, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { db } from "@/lib/db";
import { addTrackUrl, deleteTrack, importTracks, moveTrack } from "@/lib/db/repos/music";
import type { MusicTrack, TrackCategory } from "@/lib/db/types";
import { CATALOG, CATALOG_BY_ID, CATEGORY_LABEL, listenLinks, type CatalogTrack } from "@/lib/music/catalog";
import { player, syncLibrary, usePlayer } from "@/lib/music/player";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { fmtClock } from "@/lib/utils/format";

/* ─────────────── Open / close from anywhere ─────────────── */

let sheetOpen = false;
const sheetListeners = new Set<() => void>();
const setSheet = (v: boolean) => {
  sheetOpen = v;
  sheetListeners.forEach((l) => l());
};
export const openMusicSheet = () => setSheet(true);
const closeMusicSheet = () => setSheet(false);
function useSheetOpen() {
  return useSyncExternalStore(
    (cb) => {
      sheetListeners.add(cb);
      return () => sheetListeners.delete(cb);
    },
    () => sheetOpen,
    () => false,
  );
}

function useTracks() {
  return useLiveQuery(() => db.tracks.orderBy("order").toArray(), []);
}

/* ─────────────── Small pieces ─────────────── */

/** Three bouncing bars while music plays (static when paused). */
export function Equalizer({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-3.5 items-end gap-[2px]", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("w-[3px] rounded-sm bg-current", playing ? "eq-bar" : "h-1/3")} style={playing ? { animationDelay: `${i * 0.18}s` } : undefined} />
      ))}
    </span>
  );
}

/** Header button: opens the music menu, shows an equalizer while playing. */
export function MusicButton() {
  const s = usePlayer();
  return (
    <IconButton label={s.playing ? "Musique en cours : ouvrir le lecteur" : "Musique d'entraînement"} onClick={openMusicSheet} className={cn(s.playing && "text-arise!")}>
      {s.playing ? <Equalizer playing /> : <Music2 />}
    </IconButton>
  );
}

function Controls({ size = "md" }: { size?: "sm" | "md" }) {
  const s = usePlayer();
  const sm = size === "sm";
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Piste précédente" size={sm ? "sm" : undefined} onClick={player.prev}>
        <SkipBack />
      </IconButton>
      <button
        type="button"
        onClick={player.toggle}
        aria-label={s.playing ? "Pause" : "Lecture"}
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-arise-gradient text-white shadow-[0_0_18px_-4px_rgb(77_163_255/0.8)] active:scale-95", sm ? "size-9 [&>svg]:size-4" : "size-14 [&>svg]:size-6")}
      >
        {s.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="translate-x-px" />}
      </button>
      <IconButton label="Piste suivante" size={sm ? "sm" : undefined} onClick={player.next}>
        <SkipForward />
      </IconButton>
    </div>
  );
}

/** Compact player row (session screen), shown once a track is loaded. */
export function MiniPlayer({ className }: { className?: string }) {
  const s = usePlayer();
  const t = s.queue[s.index];
  if (!t) return null;
  const pct = s.duration ? (s.position / s.duration) * 100 : 0;
  return (
    <div className={cn("panel relative flex items-center gap-2 overflow-hidden py-1.5 pr-1.5 pl-3", className)}>
      <button type="button" onClick={openMusicSheet} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`Ouvrir le lecteur : ${t.title}`}>
        <Equalizer playing={s.playing} className="shrink-0 text-arise" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-ink">{t.title}</span>
          <span className="block truncate text-[11px] text-ink-3">{s.error ?? t.artist ?? CATEGORY_LABEL[t.category]}</span>
        </span>
      </button>
      <Controls size="sm" />
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5" aria-hidden>
        <span className="block h-full bg-arise" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/** Sidebar block (desktop): current track or a shortcut to the music menu. */
export function SidebarMusic() {
  const s = usePlayer();
  const t = s.queue[s.index];
  if (!t)
    return (
      <button type="button" onClick={openMusicSheet} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-ink-3 transition hover:bg-white/[0.03] hover:text-ink-2">
        <Music2 className="size-[18px]" /> Musique
      </button>
    );
  return <MiniPlayer className="rounded-xl" />;
}

/* ─────────────── The music menu ─────────────── */

type Filter = "all" | TrackCategory | "mine";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "opening", label: "Openings" },
  { value: "ending", label: "Endings" },
  { value: "ost", label: "OST" },
  { value: "sfx", label: "Sons" },
  { value: "mine", label: "Mes pistes" },
];
const IMPORT_CATEGORIES: TrackCategory[] = ["ost", "opening", "ending", "insert", "sfx", "other"];

interface Row {
  key: string;
  catalog?: CatalogTrack;
  track?: MusicTrack;
}

/** Mounted once (Providers): the menu can be opened from any screen, music survives navigation. */
export function MusicSheetHost() {
  const open = useSheetOpen();
  const tracks = useTracks();
  useEffect(() => {
    if (tracks) syncLibrary(tracks);
  }, [tracks]);
  return <MusicSheet open={open} tracks={tracks ?? []} />;
}

function MusicSheet({ open, tracks }: { open: boolean; tracks: MusicTrack[] }) {
  const s = usePlayer();
  const [filter, setFilter] = useState<Filter>("all");
  const [links, setLinks] = useState<string | null>(null);
  const [category, setCategory] = useState<TrackCategory>("ost");
  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const slotRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<string | null>(null);

  const byCatalog = useMemo(() => new Map(tracks.filter((t) => t.catalogId).map((t) => [t.catalogId!, t])), [tracks]);
  const rows = useMemo<Row[]>(() => {
    const own = tracks.filter((t) => !t.catalogId || !CATALOG_BY_ID.has(t.catalogId));
    if (filter === "mine") return own.map((t) => ({ key: t.id, track: t }));
    const catalog = CATALOG.filter((c) => filter === "all" || c.category === filter).map((c) => ({ key: c.id, catalog: c, track: byCatalog.get(c.id) }));
    const mine = own.filter((t) => filter === "all" || t.category === filter).map((t) => ({ key: t.id, track: t }));
    return [...catalog, ...mine];
  }, [tracks, filter, byCatalog]);
  const playable = rows.map((r) => r.track).filter((t): t is MusicTrack => !!t);
  const current = s.queue[s.index];

  const runImport = async (files: FileList | null, catalogId?: string) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const n = await importTracks([...files], { category, catalogId });
      toast({ tone: "success", title: n > 1 ? `${n} pistes importées` : n ? "Piste importée" : "Aucun fichier audio reconnu", message: n ? "Stockée sur cet appareil" : undefined });
    } catch (e) {
      toast({ tone: "error", title: "Import impossible", message: e instanceof Error ? e.message : "Espace de stockage insuffisant ?" });
    } finally {
      setBusy(false);
    }
  };

  const VolumeIcon = s.volume === 0 ? VolumeX : s.volume < 0.5 ? Volume1 : Volume2;

  return (
    <Sheet open={open} onClose={closeMusicSheet} title="Musique d'entraînement" description="Solo Leveling : openings, endings, OST et tes sons" size="lg" tall>
      <div className="space-y-4">
        {current ? (
          <div className="rounded-2xl border border-arise/30 bg-gradient-to-br from-arise/10 via-transparent to-violet/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-arise/40 bg-void/70 text-arise shadow-[0_0_18px_-6px_rgb(77_163_255/0.9)]">
                <Equalizer playing={s.playing} className="h-5 [&>span]:w-1" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-ink">{current.title}</p>
                <p className="truncate text-xs text-ink-3">{current.artist ?? CATEGORY_LABEL[current.category]}</p>
                {s.error && <p className="mt-0.5 text-xs text-warn">{s.error}</p>}
              </div>
              <IconButton label="Arrêter la musique" size="sm" onClick={player.stop}>
                <Square />
              </IconButton>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, s.duration)}
              step={1}
              value={Math.min(s.position, s.duration || s.position)}
              onChange={(e) => player.seek(Number(e.target.value))}
              aria-label="Position dans la piste"
              className="mt-3 w-full accent-[#4da3ff]"
            />
            <div className="flex justify-between text-[11px] text-ink-3 tabular">
              <span>{fmtClock(s.position)}</span>
              <span>{s.duration ? fmtClock(s.duration) : "--:--"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <IconButton label={s.shuffle ? "Lecture aléatoire activée" : "Lecture aléatoire désactivée"} onClick={player.toggleShuffle} className={cn(s.shuffle ? "text-arise!" : "text-ink-3!")}>
                <Shuffle />
              </IconButton>
              <Controls />
              <IconButton label={s.repeat === "one" ? "Répéter la piste" : s.repeat === "all" ? "Répéter la liste" : "Pas de répétition"} onClick={player.cycleRepeat} className={cn(s.repeat === "off" ? "text-ink-3!" : "text-arise!")}>
                {s.repeat === "one" ? <Repeat1 /> : <Repeat />}
              </IconButton>
            </div>
            {s.volumeControl ? (
              <label className="mt-2 flex items-center gap-2 text-ink-3">
                <button type="button" onClick={() => player.setVolume(s.volume ? 0 : 0.8)} aria-label={s.volume ? "Couper le son" : "Remettre le son"} className="touch-target flex items-center">
                  <VolumeIcon className="size-4" />
                </button>
                <input type="range" min={0} max={1} step={0.02} value={s.volume} onChange={(e) => player.setVolume(Number(e.target.value))} aria-label="Volume de la musique" className="flex-1 accent-[#4da3ff]" />
                <span className="w-9 text-right text-[11px] tabular">{Math.round(s.volume * 100)} %</span>
              </label>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-[11px] text-ink-3">
                <Volume2 className="size-3.5" /> Sur iPhone, règle le volume avec les boutons du téléphone.
              </p>
            )}
          </div>
        ) : (
          <Notice>
            Choisis une piste, ou importe tes fichiers : la musique continue écran verrouillé, avec les commandes sur l&apos;écran de verrouillage, jusqu&apos;à ce que tu la mettes en pause.
          </Notice>
        )}

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>

        {playable.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => player.playQueue(playable)}>
              <Play /> Tout lire ({playable.length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!s.shuffle) player.toggleShuffle();
                player.playQueue(playable, playable[Math.floor(Math.random() * playable.length)].id);
              }}
            >
              <Shuffle /> Aléatoire
            </Button>
          </div>
        )}

        <ul className="divide-y divide-line/60 rounded-2xl border border-line">
          {rows.length === 0 && <li className="p-4 text-sm text-ink-3">{filter === "mine" || filter === "sfx" ? "Aucune piste importée ici pour l'instant." : "Rien dans cette catégorie."}</li>}
          {rows.map((r) => {
            const t = r.track;
            const isCurrent = !!t && t.id === current?.id;
            const title = r.catalog?.title ?? t?.title ?? "";
            const sub = r.catalog ? `${r.catalog.tag} · ${r.catalog.artist}` : (t?.artist ?? CATEGORY_LABEL[t!.category]);
            return (
              <li key={r.key} className={cn("p-2.5", isCurrent && "bg-arise/10")}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!t}
                    onClick={() => (isCurrent ? player.toggle() : t && player.playQueue(playable, t.id))}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
                    aria-label={t ? (isCurrent && s.playing ? `Pause : ${title}` : `Lire : ${title}`) : `${title} (pas de fichier)`}
                  >
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4", t ? "bg-arise/15 text-arise" : "bg-white/5 text-ink-3")}>
                      {isCurrent ? <Equalizer playing={s.playing} /> : t ? <Play fill="currentColor" /> : <FileAudio />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-medium", t ? "text-ink" : "text-ink-3")}>{title}</span>
                      <span className="block truncate text-[11px] text-ink-3">{sub}</span>
                    </span>
                  </button>
                  {r.catalog && (
                    <>
                      <IconButton
                        label={t ? `Remplacer le fichier de ${title}` : `Importer le fichier de ${title}`}
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          pendingSlot.current = r.catalog!.id;
                          slotRef.current?.click();
                        }}
                      >
                        <Upload />
                      </IconButton>
                      <IconButton label={`Écouter ${title} sur une plateforme officielle`} size="sm" onClick={() => setLinks(links === r.key ? null : r.key)}>
                        <ExternalLink />
                      </IconButton>
                    </>
                  )}
                  {t && !r.catalog && (
                    <>
                      <IconButton label="Monter" size="sm" onClick={() => void moveTrack(t.id, -1)}>
                        <ArrowUp />
                      </IconButton>
                      <IconButton label="Descendre" size="sm" onClick={() => void moveTrack(t.id, 1)}>
                        <ArrowDown />
                      </IconButton>
                    </>
                  )}
                  {t && (
                    <IconButton label={`Retirer ${title} de l'appareil`} size="sm" onClick={() => void deleteTrack(t.id)}>
                      <Trash2 />
                    </IconButton>
                  )}
                </div>
                {r.catalog && links === r.key && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
                    {listenLinks(r.catalog).map((l) => (
                      <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-deep/60 px-3 text-xs text-ink-2 hover:border-arise/50">
                        {l.label} <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="space-y-3 rounded-2xl border border-line bg-white/[0.02] p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <ListMusic className="size-4 text-arise" /> Ajouter des pistes
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Catégorie" className="min-w-36 flex-1">
              <Select value={category} onChange={(e) => setCategory(e.target.value as TrackCategory)}>
                {IMPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="secondary" disabled={busy} onClick={() => filesRef.current?.click()}>
              <Upload /> Fichiers audio
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_10rem_auto]">
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Lien direct https://…/piste.mp3" inputMode="url" aria-label="Lien direct vers un fichier audio" />
            <TextInput value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} placeholder="Titre" aria-label="Titre de la piste" />
            <Button
              variant="secondary"
              disabled={!url.trim()}
              onClick={async () => {
                try {
                  await addTrackUrl(url, urlTitle, category);
                  setUrl("");
                  setUrlTitle("");
                  toast({ tone: "success", title: "Lien ajouté" });
                } catch (e) {
                  toast({ tone: "error", title: "Lien refusé", message: e instanceof Error ? e.message : undefined });
                }
              }}
            >
              <Link2 /> Ajouter
            </Button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-ink-3">
          Les musiques de Solo Leveling (Hiroyuki Sawano, LiSA, TOMORROW X TOGETHER, krage, TK…) sont protégées par le droit d&apos;auteur : ARISE ne les fournit pas. Importe tes propres fichiers (achetés ou à toi) dans chaque emplacement, ou écoute-les sur les plateformes officielles. Les fichiers restent sur cet appareil et ne sont ni synchronisés ni exportés.
        </p>

        <input
          ref={slotRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            void runImport(e.target.files, pendingSlot.current ?? undefined);
            e.target.value = "";
          }}
        />
        <input
          ref={filesRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void runImport(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </Sheet>
  );
}

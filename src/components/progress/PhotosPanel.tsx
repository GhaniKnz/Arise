"use client";

import { ArrowDownWideNarrow, ArrowLeftRight, ArrowUpNarrowWide, BookmarkPlus, Camera, CheckSquare, Columns2, GalleryHorizontal, Images, MoveHorizontal, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { POSE_LABEL } from "@/components/quick/PhotoSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Fields";
import { EmptyState, Notice, PageSkeleton } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { useComparisons, useKv, usePhotos } from "@/lib/db/hooks";
import { COMPARE_KEY, deleteComparison, saveComparison, setCompareSelection, type CompareSelection } from "@/lib/db/repos/body";
import type { PhotoComparison, Pose, ProgressPhoto } from "@/lib/db/types";
import { openSheet } from "@/lib/system/ui";
import { toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { diffDays, formatShort } from "@/lib/utils/date";
import { fmtSigned, plural } from "@/lib/utils/format";
import { PhotoCompare, PhotoImage, PhotoSideBySide, PhotoThumb } from "./PhotoCompare";
import { PhotoViewerSheet } from "./PhotoViewerSheet";

type PoseFilter = Pose | "all";
const POSES: Pose[] = ["front", "side", "back"];

/** Oldest first; photos of the same day keep their import order. */
const chronological = (a: ProgressPhoto, b: ProgressPhoto) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

function deltas(before: ProgressPhoto, after: ProgressPhoto) {
  const days = diffDays(before.date, after.date);
  return [
    days ? `${Math.abs(days)} ${plural(days, "jour", "jours")} d'écart` : "même jour",
    before.weightKg != null && after.weightKg != null ? fmtSigned(after.weightKg - before.weightKg, 1, "kg") : null,
    before.waistCm != null && after.waistCm != null ? `taille ${fmtSigned(after.waistCm - before.waistCm, 1, "cm")}` : null,
    before.bodyFatPct != null && after.bodyFatPct != null ? fmtSigned(after.bodyFatPct - before.bodyFatPct, 1, "% MG") : null,
  ].filter(Boolean) as string[];
}

export function PhotosPanel() {
  const photos = usePhotos();
  const comparisons = useComparisons();
  const stored = useKv<CompareSelection>(COMPARE_KEY);
  const [filter, setFilter] = useState<PoseFilter>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picking, setPicking] = useState<"before" | "after" | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const chrono = useMemo(() => [...(photos ?? [])].sort(chronological), [photos]);
  const byId = useMemo(() => new Map(chrono.map((p) => [p.id, p])), [chrono]);
  const visible = useMemo(() => chrono.filter((p) => filter === "all" || p.pose === filter), [chrono, filter]);
  const groups = useMemo(() => {
    const list = newestFirst ? [...visible].reverse() : visible;
    // Grouped by year: a photo every few weeks would leave month rows nearly empty.
    const out: { year: string; photos: ProgressPhoto[] }[] = [];
    for (const p of list) {
      const y = p.date.slice(0, 4);
      if (out.at(-1)?.year !== y) out.push({ year: y, photos: [] });
      out.at(-1)!.photos.push(p);
    }
    return out;
  }, [visible, newestFirst]);

  if (photos === undefined || comparisons === undefined) return <PageSkeleton />;

  // Chosen photos win; otherwise compare the first and the latest photo of one pose.
  const pool = filter === "all" ? chrono.filter((p) => p.pose === chrono.at(-1)?.pose) : visible;
  const before = (stored?.before && byId.get(stored.before)) || pool[0];
  const after = (stored?.after && byId.get(stored.after)) || pool.at(-1);
  const ready = before && after && before.id !== after.id;
  const roleOf = (id: string) => (id === before?.id ? "before" : id === after?.id ? "after" : undefined);

  const setRole = (role: "before" | "after", id: string) => {
    const next: CompareSelection = { before: before?.id, after: after?.id };
    next[role] = id;
    // Picking the photo already on the other side swaps them.
    if (role === "before" && id === after?.id) next.after = before?.id;
    if (role === "after" && id === before?.id) next.before = after?.id;
    void setCompareSelection(next);
  };

  const showInViewer = (sel: CompareSelection) => {
    void setCompareSelection(sel);
    viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSelected = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));

  const compareSelection = () => {
    const [a, b] = selection.map((id) => byId.get(id)!).sort(chronological);
    showInViewer({ before: a.id, after: b.id });
    setSelecting(false);
    setSelection([]);
  };

  const viewed = viewing ? (byId.get(viewing) ?? null) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[{ value: "all" as PoseFilter, label: "Tout" }, ...POSES.map((p) => ({ value: p as PoseFilter, label: POSE_LABEL[p] }))]}
          ariaLabel="Filtrer par pose"
          className="min-w-0 flex-1"
        />
        <Button onClick={() => openSheet("photo")}>
          <Camera /> Photo
        </Button>
      </div>

      {chrono.length === 0 ? (
        <EmptyState icon={<Camera />} title="Aucune photo pour l'instant" description="Une photo toutes les 2–4 semaines, même lumière et même pose : c'est le meilleur juge de ta progression." action={<Button size="sm" onClick={() => openSheet("photo")}>Prendre la première</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
            <div ref={viewerRef} className="scroll-mt-20">
              <Panel>
                <PanelHeader
                  title="Avant / Après"
                  icon={<ArrowLeftRight />}
                  subtitle="Touche AVANT ou APRÈS pour choisir la photo"
                  action={
                    <Segmented
                      size="sm"
                      value={mode}
                      onChange={setMode}
                      ariaLabel="Mode d'affichage"
                      options={[
                        { value: "slider", label: "", icon: <MoveHorizontal /> },
                        { value: "side", label: "", icon: <Columns2 /> },
                      ]}
                    />
                  }
                />
                <div className="mb-3 flex items-center gap-2">
                  <SlotButton label="AVANT" photo={before} onClick={() => setPicking("before")} />
                  <IconButton label="Inverser avant et après" disabled={!ready} onClick={() => ready && void setCompareSelection({ before: after.id, after: before.id })}>
                    <ArrowLeftRight />
                  </IconButton>
                  <SlotButton label="APRÈS" photo={after} onClick={() => setPicking("after")} />
                </div>
                {ready ? (
                  <>
                    <div className={cn("mx-auto w-full", mode === "slider" ? "max-w-md" : "max-w-2xl")}>
                      {mode === "slider" ? <PhotoCompare before={before} after={after} /> : <PhotoSideBySide before={before} after={after} />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-ink-2">{deltas(before, after).join(" · ")}</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const { created } = await saveComparison(before.id, after.id);
                          toast({ tone: created ? "success" : "system", title: created ? "Ajoutée à la galerie avant / après" : "Déjà dans la galerie avant / après" });
                        }}
                      >
                        <BookmarkPlus /> Garder cette comparaison
                      </Button>
                    </div>
                  </>
                ) : (
                  <Notice>Ajoute une deuxième photo (ou choisis-en deux différentes) pour activer le comparateur.</Notice>
                )}
              </Panel>
            </div>

            <Panel>
              <PanelHeader title="Galerie avant / après" icon={<GalleryHorizontal />} subtitle={comparisons.length ? "Touche une comparaison pour la revoir" : undefined} />
              {comparisons.length === 0 ? (
                <p className="text-sm text-ink-3">Garde tes meilleures comparaisons avec « Garder cette comparaison » : elles s&apos;affichent ici.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  {comparisons.map((c) => (
                    <ComparisonCard key={c.id} c={c} before={byId.get(c.beforeId)} after={byId.get(c.afterId)} active={c.beforeId === before?.id && c.afterId === after?.id} onOpen={() => showInViewer({ before: c.beforeId, after: c.afterId })} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              title="Galerie"
              icon={<Images />}
              subtitle={`${visible.length} ${plural(visible.length, "photo", "photos")} · triées de la ${newestFirst ? "plus récente à la plus ancienne" : "plus ancienne à la plus récente"}`}
              action={
                <div className="flex gap-1.5">
                  <IconButton label={newestFirst ? "Trier : plus anciennes d'abord" : "Trier : plus récentes d'abord"} onClick={() => setNewestFirst((v) => !v)}>
                    {newestFirst ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
                  </IconButton>
                  <IconButton
                    label={selecting ? "Annuler la sélection" : "Sélectionner deux photos à comparer"}
                    onClick={() => {
                      setSelecting((v) => !v);
                      setSelection([]);
                    }}
                  >
                    {selecting ? <X /> : <CheckSquare />}
                  </IconButton>
                </div>
              }
            />
            {selecting && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-arise/40 bg-arise/10 px-3 py-2 text-sm text-ink-2">
                <span>{selection.length < 2 ? `Choisis ${2 - selection.length} photo${selection.length ? "" : "s"}` : "Prêt : la plus ancienne sera AVANT"}</span>
                <Button size="sm" disabled={selection.length < 2} onClick={compareSelection}>
                  Comparer
                </Button>
              </div>
            )}
            {visible.length === 0 ? (
              <p className="text-sm text-ink-3">Aucune photo « {filter !== "all" && POSE_LABEL[filter]} ».</p>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => (
                  <section key={g.year}>
                    {groups.length > 1 && <h3 className="label mb-2 text-ink-3">{g.year}</h3>}
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {g.photos.map((p) => {
                        const order = selection.indexOf(p.id);
                        const role = roleOf(p.id);
                        return (
                          <li key={p.id}>
                            <PhotoThumb
                              photo={p}
                              selected={selecting ? order >= 0 : !!role}
                              badge={selecting ? (order >= 0 ? String(order + 1) : undefined) : role === "before" ? "AVANT" : role === "after" ? "APRÈS" : undefined}
                              tag={filter === "all" ? POSE_LABEL[p.pose] : undefined}
                              onClick={() => (selecting ? toggleSelected(p.id) : setViewing(p.id))}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
      <Notice>Tes photos sont stockées uniquement sur cet appareil{process.env.NEXT_PUBLIC_SUPABASE_URL ? " (et dans ton espace cloud privé si la synchronisation est active)" : ""}.</Notice>

      <PhotoViewerSheet
        photo={viewed}
        role={viewed ? roleOf(viewed.id) : undefined}
        onClose={() => setViewing(null)}
        onSetRole={(role) => {
          if (!viewed) return;
          setRole(role, viewed.id);
          toast({ tone: "system", title: role === "before" ? "Photo AVANT choisie" : "Photo APRÈS choisie" });
        }}
      />
      <PhotoPickerSheet
        open={picking != null}
        title={picking === "before" ? "Choisir la photo AVANT" : "Choisir la photo APRÈS"}
        photos={[...chrono].reverse()}
        current={picking === "before" ? before?.id : after?.id}
        onClose={() => setPicking(null)}
        onPick={(id) => {
          if (picking) setRole(picking, id);
          setPicking(null);
        }}
      />
    </div>
  );
}

function SlotButton({ label, photo, onClick }: { label: string; photo?: ProgressPhoto; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-1.5 text-left transition hover:border-arise/50" aria-label={`Choisir la photo ${label}`}>
      <span className="relative block h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-deep">{photo && <PhotoImage photo={photo} className="size-full object-cover" />}</span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold tracking-wider text-arise">{label}</span>
        <span className="block truncate text-xs text-ink-2">{photo ? `${formatShort(photo.date)} · ${POSE_LABEL[photo.pose]}` : "Choisir"}</span>
      </span>
    </button>
  );
}

function ComparisonCard({ c, before, after, active, onOpen }: { c: PhotoComparison; before?: ProgressPhoto; after?: ProgressPhoto; active: boolean; onOpen: () => void }) {
  if (!before || !after) return null;
  return (
    <li className={cn("overflow-hidden rounded-xl border bg-white/[0.02] transition", active ? "border-arise shadow-glow" : "border-line")}>
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Revoir la comparaison du ${formatShort(before.date)} au ${formatShort(after.date)}`}>
        <span className="grid grid-cols-2 gap-px bg-line">
          {[before, after].map((p, i) => (
            <span key={p.id} className="relative block aspect-[3/4] bg-deep">
              <PhotoImage photo={p} className="size-full object-cover" />
              <span className="absolute top-1 left-1 rounded bg-void/75 px-1 text-[9px] font-bold text-ink">{i === 0 ? "AVANT" : "APRÈS"}</span>
            </span>
          ))}
        </span>
        <span className="block px-2 pt-1.5 text-[11px] text-ink-2">
          {c.title ?? `${formatShort(before.date)} → ${formatShort(after.date)}`}
        </span>
      </button>
      <span className="flex items-center justify-between gap-1 px-2 pb-1.5 text-[11px] text-ink-3">
        <span className="truncate">{deltas(before, after).slice(0, 2).join(" · ")}</span>
        <button type="button" onClick={() => void deleteComparison(c.id)} className="touch-target -mr-1 flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-white/5 hover:text-bad" aria-label="Retirer de la galerie avant / après">
          <Trash2 className="size-3.5" />
        </button>
      </span>
    </li>
  );
}

function PhotoPickerSheet({ open, title, photos, current, onClose, onPick }: { open: boolean; title: string; photos: ProgressPhoto[]; current?: string; onClose: () => void; onPick: (id: string) => void }) {
  const [pose, setPose] = useState<PoseFilter>("all");
  const list = photos.filter((p) => pose === "all" || p.pose === pose);
  return (
    <Sheet open={open} onClose={onClose} title={title} description="Les plus récentes d'abord" size="lg" tall>
      <Segmented
        size="sm"
        className="mb-3"
        value={pose}
        onChange={setPose}
        options={[{ value: "all" as PoseFilter, label: "Toutes" }, ...POSES.map((p) => ({ value: p as PoseFilter, label: POSE_LABEL[p] }))]}
        ariaLabel="Filtrer par pose"
      />
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((p) => (
          <li key={p.id}>
            <PhotoThumb photo={p} selected={p.id === current} tag={POSE_LABEL[p.pose]} onClick={() => onPick(p.id)} />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

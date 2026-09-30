"use client";

import { motion } from "motion/react";
import { ArrowLeft, CalendarDays, Check, Clock, Gauge, Layers, Pencil, Plus, RotateCcw, Timer, Trash2, Trophy, Weight, Zap } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock";
import { ExercisePickerSheet } from "@/components/workout/ExercisePickerSheet";
import { RemoveExerciseSheet } from "@/components/workout/RemoveExerciseSheet";
import { SessionInfoSheet } from "@/components/workout/SessionInfoSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState, PageSkeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, StatTile } from "@/components/ui/Panel";
import { useActiveSession, useExerciseLibrary, useRoutine, useSession, useSessionSets } from "@/lib/db/hooks";
import { addExerciseToRoutine, addExerciseToSession, blockSets, deleteSession, removeExerciseFromRoutine, removeExerciseFromSession, slotAt, startSession } from "@/lib/db/repos/workout";
import { sessionMinutes } from "@/lib/domain/daily";
import { useSessionHistory } from "@/lib/hooks/useSessionHistory";
import { toast } from "@/lib/system/store";
import { formatDayLong, formatTime } from "@/lib/utils/date";
import { fmtDuration, fmtInt } from "@/lib/utils/format";

function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { prs, ledger } = useGame();
  const session = useSession(id);
  const sets = useSessionSets(id);
  const routine = useRoutine(session?.routineId);
  const active = useActiveSession();
  const { byId } = useExerciseLibrary();
  const history = useSessionHistory(id, session?.exerciseIds ?? []);
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(params.get("edit") === "1");
  const [editInfo, setEditInfo] = useState(false);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const justDone = params.get("done") === "1";

  const working = useMemo(() => (sets ?? []).filter((s) => s.done && !s.warmup), [sets]);
  if (session === undefined || sets === undefined) return <PageSkeleton />;
  if (session === null) return <EmptyState title="Séance introuvable" action={<Button onClick={() => router.push("/workout")}>Retour</Button>} />;

  const sessionPRs = prs.filter((p) => p.sessionId === session.id);
  const xp = ledger.days.get(session.date)?.xp;

  const stopEditing = () => {
    setEditing(false);
    if (params.get("edit")) router.replace(`/workout/history/${session.id}`, { scroll: false });
    toast({ tone: "success", title: "Modifications enregistrées", message: "XP, records et stats sont recalculés." });
  };

  const redo = async () => {
    if (routine) await startSession({ routine });
    else {
      const s = await startSession({ name: session.name, type: session.type });
      let current = s;
      for (let i = 0; i < session.exerciseIds.length; i++) {
        const exId = session.exerciseIds[i];
        await addExerciseToSession(current, exId, blockSets(working, session.exerciseIds, i).length || 3);
        current = { ...current, exerciseIds: [...current.exerciseIds, exId] };
      }
    }
    router.push("/session");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/workout")}>
          <ArrowLeft />
        </IconButton>
      </div>

      {justDone && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="panel panel-glow hud mb-4 p-5 text-center">
          <p className="label text-good">[ Quête accomplie ]</p>
          <p className="text-glow mt-1 font-display text-3xl font-bold tracking-wider text-white">SÉANCE TERMINÉE</p>
          <p className="mt-2 flex items-center justify-center gap-2 font-display text-lg text-arise">
            <Zap className="size-5" /> +100 XP{sessionPRs.length ? ` · ${sessionPRs.length} record${sessionPRs.length > 1 ? "s" : ""}` : ""}
          </p>
        </motion.div>
      )}

      <PageHeader
        kicker={formatDayLong(session.date)}
        title={session.name}
        action={
          editing ? (
            <Button size="sm" onClick={stopEditing}>
              <Check /> Terminer
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Modifier
            </Button>
          )
        }
      />

      {editing && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-2xl border border-arise/35 bg-arise/[0.07] p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Pencil className="size-4 text-arise" /> Mode édition
          </p>
          <p className="mt-0.5 text-xs text-ink-3">Corrige poids, reps, séries ou exercices : tout est enregistré au fur et à mesure.</p>
          <button type="button" onClick={() => setEditInfo(true)} className="mt-2.5 flex w-full items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-deep/70 px-3 py-2 text-left text-xs text-ink-2 transition hover:border-arise/50 flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5 text-arise" /> {formatDayLong(session.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-arise" /> {formatTime(session.startedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Timer className="size-3.5 text-arise" /> {fmtDuration(sessionMinutes(session) * 60)}
            </span>
            {session.rpe && (
              <span className="flex items-center gap-1">
                <Gauge className="size-3.5 text-arise" /> RPE {session.rpe}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 font-medium text-arise">
              <Pencil className="size-3.5" /> Nom, date, durée…
            </span>
          </button>
        </motion.div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Durée" icon={<Timer />} value={fmtDuration(sessionMinutes(session) * 60)} />
        <StatTile label="Séries" icon={<Layers />} accent="var(--color-violet-2)" value={working.length} />
        <StatTile label="Volume" icon={<Weight />} accent="var(--color-cyan)" value={fmtInt(working.reduce((a, s) => a + s.weightKg * s.reps, 0))} unit="kg" />
        <StatTile label="Records" icon={<Trophy />} value={sessionPRs.length} accent="var(--color-warn)" hint={xp ? `${fmtInt(xp)} XP ce jour-là` : undefined} />
      </div>

      {sessionPRs.length > 0 && (
        <Panel className="mb-4">
          <p className="label mb-2 flex items-center gap-2 text-warn">
            <Trophy className="size-4" /> Records personnels
          </p>
          <ul className="space-y-1 text-sm">
            {sessionPRs.map((p) => (
              <li key={p.exerciseId} className="flex justify-between gap-2">
                <span className="text-ink">{byId(p.exerciseId)?.name}</span>
                <span className="text-ink-2 tabular">
                  {p.weightKg > 0 ? `${p.weightKg.toLocaleString("fr-FR")} kg × ${p.reps}` : `${p.reps} reps`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="space-y-4">
        {session.exerciseIds.map((exId, i) => {
          const ex = byId(exId);
          if (!ex) return null;
          const slot = slotAt(session.exerciseIds, i);
          const re = routine?.exercises.filter((e) => e.exerciseId === exId)[slot];
          return (
            <Panel key={`${exId}-${slot}`}>
              <ExerciseBlock
                session={session}
                exercise={ex}
                slot={slot}
                sets={blockSets(sets, session.exerciseIds, i).sort((a, b) => Number(b.warmup) - Number(a.warmup) || a.order - b.order)}
                history={history?.get(exId)}
                repRange={re ? [re.repsMin, re.repsMax] : [8, 12]}
                compactHeader
                readOnly={!editing}
                onRemove={editing ? () => setRemoving(i) : undefined}
              />
            </Panel>
          );
        })}
      </div>

      {session.exerciseIds.length === 0 && <EmptyState icon={<Layers />} title="Aucun exercice" description={editing ? "Ajoute les exercices que tu as faits." : "Passe en mode édition pour en ajouter."} />}

      {editing && (
        <Button variant="secondary" block className="mt-4" onClick={() => setPicking(true)}>
          <Plus /> Ajouter un exercice
        </Button>
      )}

      {(session.notes || session.rpe) && (
        <Panel className="mt-4">
          {session.rpe && <p className="text-sm text-ink-2">Difficulté ressentie : {session.rpe}/10</p>}
          {session.notes && <p className="mt-1 text-sm whitespace-pre-line text-ink">{session.notes}</p>}
        </Panel>
      )}

      <ExercisePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        added={session.exerciseIds}
        routineName={routine?.name}
        alsoRoutineDefault={false}
        onPick={async (e, { alsoRoutine }) => {
          const compound = e.mechanic === "compound";
          await addExerciseToSession(session, e.id, 3, compound ? 6 : 10);
          if (alsoRoutine && routine) await addExerciseToRoutine(routine.id, { exerciseId: e.id, sets: 3, repsMin: compound ? 6 : 10, repsMax: compound ? 10 : 15, restSec: e.restSec });
          toast({ tone: "success", title: "Exercice ajouté", message: `${e.name} · ${alsoRoutine && routine ? `aussi dans le programme « ${routine.name} »` : "ajuste poids et reps de chaque série"}` });
          requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
        }}
      />

      <SessionInfoSheet open={editInfo} onClose={() => setEditInfo(false)} session={session} />

      {removing != null && session.exerciseIds[removing] && (
        <RemoveExerciseSheet
          open
          onClose={() => setRemoving(null)}
          exerciseName={byId(session.exerciseIds[removing])?.name ?? "l'exercice"}
          setCount={blockSets(sets, session.exerciseIds, removing).length}
          routineName={routine && routine.exercises.filter((e) => e.exerciseId === session.exerciseIds[removing]).length > slotAt(session.exerciseIds, removing) ? routine.name : undefined}
          onConfirm={async (alsoRoutine) => {
            const exId = session.exerciseIds[removing];
            const occurrence = slotAt(session.exerciseIds, removing);
            await removeExerciseFromSession(session, removing);
            if (alsoRoutine && routine) await removeExerciseFromRoutine(routine.id, exId, occurrence);
            toast({ tone: "system", title: "Exercice retiré", message: alsoRoutine && routine ? `Aussi du programme « ${routine.name} »` : undefined });
          }}
        />
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={redo} disabled={!!active}>
          <RotateCcw /> Refaire cette séance
        </Button>
        {confirm ? (
          <Button
            variant="danger"
            onClick={async () => {
              await deleteSession(session.id);
              router.replace("/workout");
            }}
          >
            Confirmer la suppression
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            <Trash2 /> Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}

export default function HistoryDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HistoryDetail />
    </Suspense>
  );
}

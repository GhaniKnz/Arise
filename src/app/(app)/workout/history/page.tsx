"use client";

import { ArrowLeft, CalendarPlus, ChevronRight, Dumbbell, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { RoutineIcon } from "@/components/icons/ExerciseIcon";
import { MissedDays } from "@/components/workout/MissedDays";
import { PastSessionSheet } from "@/components/workout/PastSessionSheet";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { routineColor, routineIcon } from "@/lib/data/routines";
import { sessionMinutes } from "@/lib/domain/daily";
import { formatDay, formatMonth, monthStart, type DayKey } from "@/lib/utils/date";
import { fmtDuration, fmtInt } from "@/lib/utils/format";

export default function HistoryPage() {
  const router = useRouter();
  const { raw, prs } = useGame();
  const [adding, setAdding] = useState<{ date?: DayKey } | null>(null);

  const months = useMemo(() => {
    const done = raw.sessions.filter((s) => s.status === "done").sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const setsBy = new Map<string, { n: number; kg: number }>();
    for (const x of raw.sets) {
      if (!x.done || x.warmup) continue;
      const cur = setsBy.get(x.sessionId) ?? { n: 0, kg: 0 };
      setsBy.set(x.sessionId, { n: cur.n + 1, kg: cur.kg + x.weightKg * x.reps });
    }
    const prBy = new Map<string, number>();
    for (const p of prs) if (p.sessionId) prBy.set(p.sessionId, (prBy.get(p.sessionId) ?? 0) + 1);
    const groups = new Map<string, { month: string; rows: { s: (typeof done)[number]; n: number; kg: number; pr: number }[] }>();
    for (const s of done) {
      const m = monthStart(s.date);
      const g = groups.get(m) ?? { month: m, rows: [] };
      const agg = setsBy.get(s.id) ?? { n: 0, kg: 0 };
      g.rows.push({ s, ...agg, pr: prBy.get(s.id) ?? 0 });
      groups.set(m, g);
    }
    return [...groups.values()];
  }, [raw.sessions, raw.sets, prs]);
  const total = months.reduce((a, m) => a + m.rows.length, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.push("/workout")}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader
        kicker="Workout"
        title="Historique"
        subtitle={`${total} séance${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}`}
        action={
          <Button size="sm" onClick={() => setAdding({})}>
            <CalendarPlus /> Séance passée
          </Button>
        }
      />

      <button
        type="button"
        onClick={() => setAdding({})}
        className="panel card-hover mb-4 flex w-full items-center gap-3 border-dashed p-4 text-left"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-arise/15 text-arise">
          <CalendarPlus className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">Tu as oublié de noter une séance ?</span>
          <span className="block text-xs text-ink-3">Choisis le jour et le programme : les séries sont préremplies, tu n&apos;as plus qu&apos;à corriger.</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3" />
      </button>

      <MissedDays onAdd={(date) => setAdding({ date })} />

      {months.length ? (
        <div className="space-y-4">
          {months.map((m) => (
            <Panel key={m.month}>
              <p className="mb-1 flex items-baseline justify-between gap-2">
                <span className="font-display text-base font-semibold text-ink first-letter:uppercase">{formatMonth(m.month)}</span>
                <span className="text-xs text-ink-3">
                  {m.rows.length} séance{m.rows.length > 1 ? "s" : ""} · {fmtInt(m.rows.reduce((a, r) => a + r.kg, 0))} kg
                </span>
              </p>
              <ul className="divide-y divide-line/60">
                {m.rows.map(({ s, n, kg, pr }) => (
                  <li key={s.id}>
                    <Link href={`/workout/history/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02]">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.03]" aria-hidden>
                        <RoutineIcon icon={routineIcon(s)} color={routineColor(s)} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                        <span className="block text-[11px] text-ink-3 first-letter:uppercase">
                          {formatDay(s.date)} · {fmtDuration(sessionMinutes(s) * 60)} · {n} séries · {fmtInt(kg)} kg
                        </span>
                      </span>
                      {pr > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
                          <Trophy className="size-3" /> {pr}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Dumbbell />} title="Aucune séance enregistrée" description="Lance une séance ou ajoute celles que tu as déjà faites." />
      )}

      <PastSessionSheet
        open={adding !== null}
        initialDate={adding?.date}
        onClose={() => setAdding(null)}
        onCreated={(id) => {
          setAdding(null);
          router.push(`/workout/history/${id}?edit=1`);
        }}
      />
    </div>
  );
}

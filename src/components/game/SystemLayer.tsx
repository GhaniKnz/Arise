"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { Crown, Sparkles, Swords, Trophy, X, Zap } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { RANK_META, STAT_META, type StatKey } from "@/lib/domain/game";
import { PR_LABEL } from "@/lib/domain/strength";
import { dismissOverlay, dismissToast, useSystemState, type Overlay, type Toast } from "@/lib/system/store";
import { cn } from "@/lib/utils/cn";
import { useMounted } from "@/lib/hooks/useMounted";
import { fmtDec } from "@/lib/utils/format";
import { BossPortrait } from "@/components/game/BossPortrait";

function EnergyBurst({ color, count = 28 }: { color: string; count?: number }) {
  const reduce = useReducedMotionConfig();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`ring${i}`}
          className="absolute rounded-full border-2"
          style={{ borderColor: color, width: 180, height: 180, boxShadow: `0 0 40px ${color}` }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 1.6, delay: i * 0.25, ease: "easeOut" }}
        />
      ))}
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 140 + ((i * 37) % 120);
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1.3 + (i % 5) * 0.12, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        );
      })}
    </div>
  );
}

function OverlayContent({ overlay }: { overlay: Overlay }) {
  switch (overlay.kind) {
    case "levelup": {
      const rank = RANK_META[overlay.rank];
      const gains = Object.entries(overlay.gains).filter(([, v]) => (v ?? 0) > 0) as [StatKey, number][];
      return (
        <>
          <EnergyBurst color="#8b5cf6" count={32} />
          <p className="label text-violet-2">[ Système ]</p>
          <motion.h2
            initial={{ scale: 0.6, opacity: 0, letterSpacing: "0.6em" }}
            animate={{ scale: 1, opacity: 1, letterSpacing: "0.12em" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-glow-violet mt-2 font-display text-5xl font-bold text-white sm:text-6xl"
          >
            LEVEL UP
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-3 font-display text-2xl font-semibold text-ink">
            NIVEAU <span className="text-gradient">{overlay.level}</span>
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-2 flex items-center justify-center gap-2 text-sm text-ink-2">
            <Crown className="size-4" style={{ color: rank.color }} />
            {rank.label} · {overlay.title}
          </motion.div>
          {gains.length > 0 && (
            <motion.ul initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 0.7 } } }} className="mt-5 flex flex-wrap justify-center gap-2">
              {gains.map(([k, v]) => (
                <motion.li key={k} variants={{ h: { opacity: 0, y: 8 }, s: { opacity: 1, y: 0 } }} className="rounded-lg border border-violet/40 bg-violet/15 px-2.5 py-1 font-display text-sm text-ink">
                  {k} <span className="text-good">+{v}</span>
                  <span className="sr-only"> {STAT_META[k].name}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </>
      );
    }
    case "quests":
      return (
        <>
          <EnergyBurst color="#4da3ff" />
          <p className="label text-arise">[ Quête quotidienne ]</p>
          <motion.h2
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-glow mt-3 font-display text-3xl leading-tight font-bold tracking-wider text-white sm:text-5xl"
          >
            DAILY QUEST
            <br />
            COMPLETE
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4 flex items-center justify-center gap-2 font-display text-2xl font-semibold text-arise">
            <Zap className="size-6" /> +{overlay.xp} XP
          </motion.p>
          <p className="mt-2 text-sm text-ink-3">Toutes les quêtes du jour sont accomplies.</p>
        </>
      );
    case "pr":
      return (
        <>
          <EnergyBurst color="#f5b94a" />
          <p className="label text-warn">[ Record battu ]</p>
          <motion.h2
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 font-display text-3xl leading-tight font-bold tracking-wider text-white sm:text-5xl"
            style={{ textShadow: "0 0 18px rgb(245 185 74 / 0.6)" }}
          >
            NEW PERSONAL
            <br />
            RECORD
          </motion.h2>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4">
            <p className="flex items-center justify-center gap-2 text-lg text-ink">
              <Trophy className="size-5 text-warn" /> {overlay.exercise}
            </p>
            <p className="mt-1 font-display text-4xl font-bold text-white">
              {overlay.weighted && overlay.weightKg > 0 ? `${fmtDec(overlay.weightKg)} kg × ${overlay.reps}` : `${overlay.reps} reps`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {overlay.kinds.map((k) => (
                <span key={k} className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs text-ink">
                  {PR_LABEL[k]}
                </span>
              ))}
            </div>
            {overlay.beat && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-3 text-sm text-ink-3">
                {overlay.beat}
              </motion.p>
            )}
            {overlay.xp ? (
              <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }} className="mt-3 flex items-center justify-center gap-1.5 font-display text-lg font-semibold text-warn">
                <Zap className="size-5" /> +{overlay.xp} XP · STR
              </motion.p>
            ) : null}
          </motion.div>
        </>
      );
    case "boss":
      return (
        <>
          <EnergyBurst color="#fb4f6e" count={36} />
          <p className="label text-boss">[ Donjon ]</p>
          <motion.div initial={{ scale: 1.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="mt-4 flex justify-center">
            <span className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-boss/70 bg-boss/15 shadow-[0_0_40px_rgb(251_79_110/0.6)]">
              <BossPortrait boss={{ name: overlay.name, icon: "", final: false }} />
            </span>
          </motion.div>
          <motion.h2
            initial={{ scale: 0.7, opacity: 0, letterSpacing: "0.5em" }}
            animate={{ scale: 1, opacity: 1, letterSpacing: "0.12em" }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl"
            style={{ textShadow: "0 0 22px rgb(251 79 110 / 0.7)" }}
          >
            BOSS VAINCU
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-3 text-lg text-ink">
            {overlay.name}
          </motion.p>
          <p className="mt-1 text-sm text-ink-3">Palier des {fmtDec(overlay.atKg)} kg franchi (moyenne 7 jours)</p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4 flex items-center justify-center gap-2 font-display text-2xl font-semibold text-arise">
            <Zap className="size-6" /> +{overlay.xp} XP
          </motion.p>
          {overlay.next && <p className="mt-2 text-xs text-ink-3">Prochain adversaire : {overlay.next}</p>}
        </>
      );
  }
}

function OverlayHost() {
  const { overlays } = useSystemState();
  const current = overlays[0];
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(dismissOverlay, current.kind === "levelup" || current.kind === "boss" ? 5200 : 4200);
    return () => window.clearTimeout(t);
  }, [current]);

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={JSON.stringify(current)}
          role="alertdialog"
          aria-live="assertive"
          aria-label={current.kind === "levelup" ? `Niveau ${current.level} atteint` : current.kind === "pr" ? "Nouveau record personnel" : current.kind === "boss" ? `Boss vaincu : ${current.name}` : "Quêtes du jour accomplies"}
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissOverlay}
        >
          <div
            className="absolute inset-0 bg-[#020308]/90 backdrop-blur-md"
            style={{
              backgroundImage:
                current.kind === "levelup"
                  ? "radial-gradient(circle at 50% 50%, rgb(139 92 246 / 0.35), transparent 55%)"
                  : current.kind === "pr"
                    ? "radial-gradient(circle at 50% 50%, rgb(245 185 74 / 0.22), transparent 55%)"
                    : current.kind === "boss"
                      ? "radial-gradient(circle at 50% 50%, rgb(251 79 110 / 0.28), transparent 55%)"
                      : "radial-gradient(circle at 50% 50%, rgb(77 163 255 / 0.3), transparent 55%)",
            }}
          />
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="relative flex flex-col items-center">
            <OverlayContent overlay={current} />
            <p className="mt-8 text-xs text-ink-3">Touche pour continuer</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TOAST_ICON = { system: Sparkles, quest: Swords, success: Sparkles, warn: Zap, error: X } as const;

function ToastItem({ t }: { t: Toast }) {
  const Icon = TOAST_ICON[t.tone];
  const accent = t.tone === "error" ? "var(--color-bad)" : t.tone === "warn" ? "var(--color-warn)" : t.tone === "quest" ? "var(--color-arise)" : "var(--color-violet-2)";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      role="status"
      className="pointer-events-auto relative w-full overflow-hidden rounded-xl border bg-[#0a1122]/95 shadow-2xl backdrop-blur-md"
      style={{ borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`, boxShadow: `0 0 24px -6px ${accent}` }}
    >
      <div className="flex items-center gap-2 border-b px-3 py-1.5" style={{ borderColor: `color-mix(in srgb, ${accent} 25%, transparent)` }}>
        <span className="flex size-4 items-center justify-center rounded-sm text-[10px] font-bold text-void" style={{ background: accent }}>
          !
        </span>
        <span className="label text-[10px]" style={{ color: accent }}>
          {t.tone === "quest" ? "Quête" : t.tone === "error" ? "Erreur" : "Notification"}
        </span>
        <button onClick={() => dismissToast(t.id)} className="ml-auto text-ink-3 hover:text-ink" aria-label="Fermer la notification">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{t.title}</p>
          {t.message && <p className="mt-0.5 text-xs text-ink-3">{t.message}</p>}
        </div>
        {t.xp != null && <span className={cn("shrink-0 font-display text-sm font-semibold text-arise")}>+{t.xp} XP</span>}
        {t.action && (
          <button
            type="button"
            onClick={() => {
              t.action!.onClick();
              dismissToast(t.id);
            }}
            className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition active:scale-95"
            style={{ borderColor: `color-mix(in srgb, ${accent} 50%, transparent)`, color: accent }}
          >
            {t.action.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Toaster() {
  const { toasts } = useSystemState();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,var(--safe-top))] z-[110] flex flex-col items-center gap-2 px-4 lg:right-6 lg:left-auto lg:w-96 lg:items-end" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function SystemLayer() {
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <>
      <Toaster />
      <OverlayHost />
    </>,
    document.body,
  );
}

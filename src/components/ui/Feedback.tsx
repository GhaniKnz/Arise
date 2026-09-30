"use client";

import { AlertTriangle, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-void/30 px-5 py-8 text-center", className)}>
      {icon && <div className="flex size-12 items-center justify-center rounded-2xl bg-arise/10 text-arise shadow-[0_0_24px_-6px_rgb(77_163_255/0.6)] [&>svg]:size-6">{icon}</div>}
      <div>
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBox({ title = "Une erreur est survenue", message, action }: { title?: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-bad/30 bg-bad/10 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bad" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        {message && <p className="mt-0.5 text-sm text-ink-2">{message}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function Notice({ children, tone = "info", className }: { children: ReactNode; tone?: "info" | "warn"; className?: string }) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl border px-3 py-2.5 text-[13px]", tone === "warn" ? "border-warn/30 bg-warn/10 text-ink-2" : "border-arise/25 bg-arise/8 text-ink-2", className)}>
      {tone === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" /> : <Info className="mt-0.5 size-4 shrink-0 text-arise" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tracking-wide whitespace-nowrap [&>svg]:size-3", className)}
      style={color ? { borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 14%, transparent)`, color: "var(--color-ink)" } : undefined}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />}
      {children}
    </span>
  );
}

/** Small "i" button that reveals an explanation (works on touch and keyboard). */
export function InfoTip({ children, label = "Explication" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="touch-target inline-flex size-5 items-center justify-center rounded-full text-ink-3 hover:text-ink"
      >
        <Info className="size-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 z-50 mt-1.5 w-64 rounded-xl border border-line-strong bg-raised p-3 text-left text-xs leading-relaxed font-normal tracking-normal text-ink-2 normal-case shadow-xl"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-gradient-to-r from-transparent via-line-strong to-transparent", className)} />;
}

"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { useIsWide } from "@/lib/hooks/useMediaQuery";
import { useMounted } from "@/lib/hooks/useMounted";
import { IconButton } from "./Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Full height on mobile (for search screens). */
  tall?: boolean;
  className?: string;
}

const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

/** Bottom sheet on mobile, centered dialog from 640px. */
export function Sheet({ open, onClose, title, description, children, footer, size = "md", tall, className }: SheetProps) {
  const wide = useIsWide();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      target?.focus({ preventScroll: true });
    }, 60);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[#02040a]/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "panel relative flex w-full flex-col overflow-hidden rounded-b-none rounded-t-3xl outline-none sm:rounded-3xl",
              tall ? "h-[92dvh] sm:h-auto sm:max-h-[86dvh]" : "max-h-[90dvh] sm:max-h-[86dvh]",
              widths[size],
              className,
            )}
            style={{ background: "linear-gradient(180deg, #121a2e, #0b1020)" }}
            initial={wide ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" }}
            animate={wide ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={wide ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            drag={wide ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 sm:hidden" onPointerDown={(e) => dragControls.start(e)} aria-hidden>
              <div className="h-1.5 w-11 rounded-full bg-white/15" />
            </div>
            {(title || description) && (
              <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 sm:pt-5" onPointerDown={(e) => !wide && dragControls.start(e)}>
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="font-display text-lg font-semibold tracking-wide text-ink">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
                </div>
                <IconButton label="Fermer" size="sm" onClick={onClose} className="-mr-1">
                  <X />
                </IconButton>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && <div className="border-t border-line bg-abyss/80 px-5 py-3 pb-[max(0.75rem,var(--safe-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

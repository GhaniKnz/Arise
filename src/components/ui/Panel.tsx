import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  hud?: boolean;
  padded?: boolean;
  as?: "div" | "section" | "article";
}

export function Panel({ glow, hud, padded = true, className, children, as: Tag = "section", ...rest }: PanelProps) {
  return (
    <Tag className={cn("panel", glow && "panel-glow", hud && "hud", padded && "p-4 sm:p-5", className)} {...rest}>
      {children}
    </Tag>
  );
}

interface PanelHeaderProps {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, icon, action, subtitle, className }: PanelHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="label flex items-center gap-2 text-ink-2">
          {icon && <span className="text-arise [&>svg]:size-4">{icon}</span>}
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && <p className="mt-1 text-xs text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  hint,
  accent,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  accent?: string;
  /** Small pictogram shown before the label, tinted with `accent`. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-deep/60 px-3 py-2.5", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
        {icon ? (
          <span className="icon-glow flex shrink-0 [&>svg]:size-3.5" style={{ color: accent ?? "var(--color-arise)" }} aria-hidden>
            {icon}
          </span>
        ) : (
          accent && <span className="size-1.5 rounded-full" style={{ background: accent }} aria-hidden />
        )}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-display text-lg font-semibold text-ink">{value}</span>
        {unit && <span className="text-xs text-ink-3">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

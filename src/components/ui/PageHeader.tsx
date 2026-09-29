import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({ title, kicker, subtitle, action, className }: { title: ReactNode; kicker?: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-5 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {kicker && <p className="label mb-1 text-arise/90">{kicker}</p>}
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

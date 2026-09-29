"use client";

import { motion } from "motion/react";
import { Flame, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGame } from "@/components/providers/GameProvider";
import { AriseMark, AriseWordmark } from "@/components/icons/AriseLogo";
import { RankBadge, XpBar } from "@/components/game/LevelBadge";
import { IconButton } from "@/components/ui/Button";
import { Sweep } from "@/components/ui/Effects";
import { isActive, PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/nav";
import { openSheet } from "@/lib/system/ui";
import { titleFor } from "@/lib/domain/game";
import { cn } from "@/lib/utils/cn";

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors", active ? "text-ink" : "text-ink-3 hover:bg-white/[0.03] hover:text-ink-2")}
    >
      {active && (
        <motion.span
          layoutId="side-active"
          className="absolute inset-0 rounded-xl border border-arise/30 bg-gradient-to-r from-arise/15 to-violet/5"
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
        >
          <span className="absolute top-2 bottom-2 -left-px w-[3px] rounded-full bg-arise shadow-[0_0_10px_#4da3ff]" />
        </motion.span>
      )}
      <Icon className={cn("relative size-[18px] transition-transform group-hover:scale-110", active && "icon-glow text-arise")} />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, ledger } = useGame();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-abyss/70 backdrop-blur-xl lg:flex">
      <div className="px-5 pt-6 pb-4">
        <Link href="/" aria-label="ARISE — accueil">
          <AriseWordmark />
        </Link>
      </div>

      {profile && (
        <Link href="/status" className="card-hover relative mx-4 mb-4 block overflow-hidden rounded-2xl border border-line bg-deep/60 p-3">
          <Sweep delay={2} duration={9} />
          <div className="flex items-center gap-3">
            <RankBadge level={ledger.level.level} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
              <p className="truncate text-xs text-ink-3">
                Niv. {ledger.level.level} · {titleFor(ledger.level.level)}
              </p>
            </div>
          </div>
          <XpBar level={ledger.level} compact className="mt-3" />
        </Link>
      )}

      <div className="px-4">
        <button
          type="button"
          onClick={() => openSheet("menu")}
          className="bg-arise-gradient relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold text-white shadow-[0_0_0_1px_rgb(120_170_255/0.45),0_8px_24px_-8px_rgb(77_163_255/0.7)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <Sweep delay={0.5} duration={5} />
          <Plus className="size-4" /> Ajouter
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
        {PRIMARY_NAV.map((item) => (
          <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <div className="label px-3 pt-5 pb-2 text-[10px]">Système</div>
        {SECONDARY_NAV.map((item) => (
          <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <Flame className={cn("size-4 text-warn", ledger.streak.current > 0 && "flame-flicker")} />
          <span>
            Série : <strong className="text-ink">{ledger.streak.current}</strong> jour{ledger.streak.current > 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </aside>
  );
}

export function TopBar() {
  const { profile, ledger } = useGame();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line/60 bg-void/70 px-4 pt-[var(--safe-top)] backdrop-blur-xl lg:hidden" style={{ height: "calc(3.5rem + var(--safe-top))" }}>
      <span className="scanline" aria-hidden />
      <Link href="/" className="flex items-center gap-2" aria-label="ARISE — accueil">
        <AriseMark className="aura size-7" />
        <span className="text-shimmer font-display text-[15px] font-bold tracking-[0.3em]">ARISE</span>
      </Link>
      <div className="flex items-center gap-1.5">
        {profile && (
          <>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
                ledger.streak.current > 0 ? "border-warn/40 bg-warn/10 text-ink shadow-[0_0_12px_-4px_rgb(251_191_36/0.7)]" : "border-line bg-deep/60 text-ink-2",
              )}
              aria-label={`Série de ${ledger.streak.current} jours`}
            >
              <Flame className={cn("size-3.5 text-warn", ledger.streak.current > 0 && "flame-flicker")} />
              {ledger.streak.current}
            </span>
            <Link href="/status" className="ring-spin flex rounded-full" style={{ "--ring-color": "#4da3ff" } as React.CSSProperties} aria-label={`Niveau ${ledger.level.level}`}>
              <span className="relative flex items-center gap-1.5 overflow-hidden rounded-full border border-line bg-deep py-0.5 pr-2.5 pl-0.5">
                <RankBadge level={ledger.level.level} size="sm" />
                <span className="flex flex-col">
                  <span className="font-display text-xs leading-tight font-semibold text-ink">Niv. {ledger.level.level}</span>
                  <span className="h-[3px] w-10 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-arise to-violet shadow-[0_0_6px_#4da3ff]" style={{ width: `${Math.round(ledger.level.progress * 100)}%` }} />
                  </span>
                </span>
              </span>
            </Link>
          </>
        )}
        <IconButton label="Plus de sections" onClick={() => openSheet("more")}>
          <LayoutGrid />
        </IconButton>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [PRIMARY_NAV[0], PRIMARY_NAV[1], null, PRIMARY_NAV[2], PRIMARY_NAV[3]];
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#070b16]/85 pb-[var(--safe-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {items.map((item) => {
          if (!item)
            return (
              <li key="add" className="flex w-16 items-center justify-center">
                <button
                  type="button"
                  onClick={() => openSheet("menu")}
                  aria-label="Ajouter : repas, poids, séance, pas…"
                  className="bg-arise-gradient relative -mt-7 flex size-14 items-center justify-center rounded-2xl text-white shadow-[0_0_0_1px_rgb(140_180_255/0.5),0_10px_30px_-6px_rgb(77_163_255/0.8)] transition active:scale-90"
                >
                  <span className="absolute inset-0 animate-pulse-glow rounded-2xl shadow-[0_0_28px_rgb(77_163_255/0.7)]" aria-hidden />
                  <Plus className="relative size-7" strokeWidth={2.4} />
                </button>
              </li>
            );
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium tracking-wide transition-colors", active ? "text-ink" : "text-ink-3")}
              >
                {active && (
                  <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-arise shadow-[0_0_12px_#4da3ff]" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
                )}
                <motion.span key={String(active)} initial={active ? { scale: 0.6, y: 4 } : false} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 520, damping: 18 }} className="flex">
                  <Icon className={cn("size-[22px]", active && "icon-glow text-arise")} />
                </motion.span>
                <span className="uppercase">{item.short ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

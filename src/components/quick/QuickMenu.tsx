"use client";

import { motion } from "motion/react";
import { Camera, Droplet, Dumbbell, Footprints, HeartPulse, ImagePlus, Moon, ScanBarcode, Scale, Utensils, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { SECONDARY_NAV } from "@/lib/nav";
import { closeSheet, openSheet, type QuickSheet } from "@/lib/system/ui";

interface Action {
  label: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  sheet?: QuickSheet;
}

const ACTIONS: Action[] = [
  { label: "Ajouter repas", icon: Utensils, color: "#4da3ff", href: "/nutrition/add" },
  { label: "Scanner repas", icon: Camera, color: "#a78bfa", href: "/nutrition/scan" },
  { label: "Code-barres", icon: ScanBarcode, color: "#22d3ee", href: "/nutrition/barcode" },
  { label: "Commencer séance", icon: Dumbbell, color: "#34d399", href: "/session" },
  { label: "Ajouter poids", icon: Scale, color: "#f5b94a", sheet: "weight" },
  { label: "Ajouter pas", icon: Footprints, color: "#4da3ff", sheet: "steps" },
  { label: "Eau", icon: Droplet, color: "#22d3ee", sheet: "water" },
  { label: "Sommeil", icon: Moon, color: "#a78bfa", sheet: "sleep" },
  { label: "Cardio", icon: HeartPulse, color: "#fb7185", sheet: "cardio" },
  { label: "Photo", icon: ImagePlus, color: "#f472b6", sheet: "photo" },
];

export function QuickMenuSheet({ open }: { open: boolean }) {
  const router = useRouter();
  return (
    <Sheet open={open} onClose={closeSheet} title="Ajouter" description="Que veux-tu enregistrer ?" size="md">
      <motion.ul
        className="grid grid-cols-3 gap-2.5 sm:grid-cols-5"
        initial="h"
        animate="s"
        variants={{ s: { transition: { staggerChildren: 0.03 } } }}
      >
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <motion.li key={a.label} variants={{ h: { opacity: 0, y: 12, scale: 0.95 }, s: { opacity: 1, y: 0, scale: 1 } }}>
              <button
                type="button"
                onClick={() => {
                  if (a.sheet) openSheet(a.sheet);
                  else {
                    closeSheet();
                    router.push(a.href!);
                  }
                }}
                className="group flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-deep/60 p-2 text-center transition hover:border-line-strong active:scale-95"
              >
                <span
                  className="flex size-11 items-center justify-center rounded-xl transition group-hover:scale-105"
                  style={{ background: `color-mix(in srgb, ${a.color} 16%, transparent)`, color: a.color, boxShadow: `0 0 20px -6px ${a.color}` }}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-[12px] leading-tight font-medium text-ink-2">{a.label}</span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </Sheet>
  );
}

export function MoreSheet({ open }: { open: boolean }) {
  return (
    <Sheet open={open} onClose={closeSheet} title="Système" description="Toutes les sections d'ARISE">
      <ul className="space-y-1.5">
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} onClick={closeSheet} className="flex items-center gap-3 rounded-2xl border border-line bg-deep/50 p-3 transition hover:border-arise/40 active:scale-[0.99]">
                <span className="flex size-10 items-center justify-center rounded-xl bg-arise/10 text-arise">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{item.label}</span>
                  <span className="block truncate text-xs text-ink-3">{item.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

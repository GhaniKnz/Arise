"use client";

import { Bell, Play, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Chip, Toggle } from "@/components/ui/Fields";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { updateProfile } from "@/lib/db/repos/profile";
import type { SoundPack } from "@/lib/db/types";
import { cue, type Cue } from "@/lib/system/feedback";
import { toast } from "@/lib/system/store";

const PACKS: { value: SoundPack; label: string; hint: string }[] = [
  { value: "system", label: "Système (Hunter)", hint: "Pings cristallins, « Arise » grave au lancement, montée en puissance sur les records, alerte de fin de repos" },
  { value: "classic", label: "Classique", hint: "Bips courts et discrets" },
];

const PREVIEWS: { cue: Cue; label: string }[] = [
  { cue: "start", label: "Début de séance" },
  { cue: "set", label: "Série" },
  { cue: "clear", label: "Exercice fini" },
  { cue: "pr", label: "Record" },
  { cue: "timer", label: "Fin du repos" },
  { cue: "finish", label: "Séance terminée" },
  { cue: "levelup", label: "Level up" },
];

export function PreferencesSection() {
  const { profile } = useGame();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  if (!profile) return null;

  return (
    <Panel id="preferences">
      <PanelHeader title="Préférences" icon={<SlidersHorizontal />} />
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-2">Repos par défaut entre les séries</p>
        <div className="flex flex-wrap gap-2">
          {[60, 90, 120, 150, 180, 240].map((s) => (
            <Chip key={s} active={profile.restTimerSec === s} onClick={() => updateProfile({ restTimerSec: s })}>
              {s < 120 ? `${s} s` : `${s / 60} min`}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-3">Les programmes peuvent définir un repos propre à chaque exercice.</p>
      </div>
      <div className="mt-3 divide-y divide-line/60">
        <Toggle
          checked={profile.sound}
          onChange={(v) => {
            void updateProfile({ sound: v });
            if (v) cue("quest");
          }}
          label="Sons du Système"
          description="Début de séance, séries, records, fin de repos, quêtes, level up"
        />
        {profile.sound && (
          <div className="py-3">
            <p className="mb-2 text-[13px] font-medium text-ink-2">Style des sons</p>
            <div className="flex flex-wrap gap-2">
              {PACKS.map((p) => (
                <Chip
                  key={p.value}
                  active={(profile.soundPack ?? "system") === p.value}
                  onClick={() => {
                    void updateProfile({ soundPack: p.value });
                    cue(p.value === "system" ? "start" : "quest", p.value);
                  }}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-3">{PACKS.find((p) => p.value === (profile.soundPack ?? "system"))?.hint}</p>
            <p className="mt-3 mb-1.5 text-[11px] font-medium tracking-wide text-ink-3 uppercase">Écouter</p>
            <div className="flex flex-wrap gap-1.5">
              {PREVIEWS.map((p) => (
                <Chip key={p.cue} onClick={() => cue(p.cue)}>
                  <Play /> {p.label}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <Toggle checked={profile.vibration} onChange={(v) => updateProfile({ vibration: v })} label="Vibrations" description="Sur les appareils compatibles" />
        <Toggle checked={profile.animations !== false} onChange={(v) => updateProfile({ animations: v })} label="Animations" description="Transitions de pages, compteurs, apparitions des fenêtres. Désactivé : interface instantanée" />
        <Toggle checked={profile.effects !== "reduced"} onChange={(v) => updateProfile({ effects: v ? "full" : "reduced" })} label="Effets visuels" description="Particules et halos animés (désactive pour économiser la batterie)" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-sm text-ink-2">
          <Bell className="size-4 text-arise" />
          Notifications (fin du repos)
        </div>
        {perm === "granted" ? (
          <span className="text-xs text-good">Activées</span>
        ) : perm === "unsupported" ? (
          <span className="text-xs text-ink-3">Non supportées</span>
        ) : perm === "denied" ? (
          <span className="text-xs text-warn">Refusées (réglages du navigateur)</span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const p = await Notification.requestPermission();
              setPerm(p);
              if (p === "granted") toast({ tone: "success", title: "Notifications activées" });
            }}
          >
            Activer
          </Button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-ink-3">Sur iPhone, les notifications nécessitent d&apos;installer ARISE sur l&apos;écran d&apos;accueil (Partager → Sur l&apos;écran d&apos;accueil).</p>
    </Panel>
  );
}

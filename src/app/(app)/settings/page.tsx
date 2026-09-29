"use client";

import { Info } from "lucide-react";
import { AiSection } from "@/components/settings/AiSection";
import { DataSection } from "@/components/settings/DataSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SyncSection } from "@/components/settings/SyncSection";
import { TargetsSection } from "@/components/settings/TargetsSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";

const NAV = [
  ["#profile", "Profil"],
  ["#targets", "Objectifs"],
  ["#quests", "Quêtes"],
  ["#preferences", "Préférences"],
  ["#ai", "IA"],
  ["#sync", "Compte"],
  ["#data", "Données"],
] as const;

export default function SettingsPage() {
  return (
    <>
      <PageHeader kicker="Système" title="Réglages" />
      <nav className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar" aria-label="Sections des réglages">
        {NAV.map(([href, label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full border border-line bg-deep/60 px-3 py-1.5 text-[13px] text-ink-2 hover:border-line-strong hover:text-ink">
            {label}
          </a>
        ))}
      </nav>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>section]:scroll-mt-20">
        <ProfileSection />
        <TargetsSection />
        <PreferencesSection />
        <AiSection />
        <SyncSection />
        <DataSection />
        <Panel className="lg:col-span-2">
          <PanelHeader title="À propos" icon={<Info />} />
          <div className="space-y-2 text-sm text-ink-2">
            <p>
              <strong className="text-ink">ARISE</strong> — système de progression personnel. Les calculs (calories, macros, maintenance adaptative, projections) sont des estimations à ajuster selon ton évolution réelle.
            </p>
            <p className="text-ink-3">
              Données nutritionnelles de référence : tables CIQUAL (ANSES) et USDA ; produits du commerce : Open Food Facts (licence ODbL). ARISE ne fournit pas d&apos;avis médical. Univers visuel original inspiré de l&apos;esthétique « hunter system », sans affiliation.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

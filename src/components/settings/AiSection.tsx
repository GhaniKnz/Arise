"use client";

import { Bot, Check, ExternalLink, Gauge, KeyRound, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Segmented, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { getAccessCode, getAiProvider, getGeminiKey, getUserAiKey, setAccessCode, setAiProvider, setGeminiKey, setUserAiKey, type AiProviderPref } from "@/lib/api";
import { toast } from "@/lib/system/store";

interface Status {
  serverKey: boolean;
  geminiServerKey?: boolean;
  accessCodeRequired: boolean;
  model: string;
  geminiModels?: string[];
}

function KeyField({ label, hint, has, placeholder, onSave }: { label: string; hint: React.ReactNode; has: boolean; placeholder: string; onSave: (k: string) => boolean }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <Field label={label} hint={hint}>
        <TextInput type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={has ? "•••••••••••• (enregistrée)" : placeholder} />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (onSave(value.trim())) setValue("");
        }}
      >
        <KeyRound /> {value ? "Enregistrer la clé" : has ? "Supprimer la clé" : "Enregistrer"}
      </Button>
    </div>
  );
}

export function AiSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState(getAccessCode);
  const [hasClaude, setHasClaude] = useState(() => !!getUserAiKey());
  const [hasGemini, setHasGemini] = useState(() => !!getGeminiKey());
  const [provider, setProvider] = useState<AiProviderPref>(getAiProvider);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const geminiReady = !!status?.geminiServerKey || hasGemini;
  const claudeReady = !!status?.serverKey || hasClaude;

  return (
    <Panel id="ai">
      <PanelHeader title="Intelligence artificielle" icon={<Bot />} subtitle="Estimation des repas en photo, coach ARISE AI, rapport hebdo" />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          { name: "Gemini (Google)", ready: geminiReady, detail: geminiReady ? `Photo en priorité · ${status?.geminiModels?.[0] ?? "Gemini Flash"}` : "Gratuit, idéal pour les photos" },
          { name: "Claude (Anthropic)", ready: claudeReady, detail: claudeReady ? `Coach et rapport · ${status?.model ?? ""}` : "Optionnel, payant à l'usage" },
        ].map((e) => (
          <div key={e.name} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-3 text-sm">
            <span className={`size-2.5 shrink-0 rounded-full ${e.ready ? "bg-good shadow-[0_0_8px_#34d399]" : "bg-ink-3/50"}`} />
            <span className="min-w-0">
              <span className="block text-ink">{e.name}</span>
              <span className="block truncate text-[11px] text-ink-3">{e.detail}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {status?.geminiServerKey ? (
          <p className="text-xs text-ink-3">Clé Gemini configurée sur le serveur (GEMINI_API_KEY).</p>
        ) : (
          <KeyField
            label="Ta clé API Gemini (gratuite)"
            has={hasGemini}
            placeholder="AIza…"
            hint={
              <>
                Crée-la sur{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-arise hover:underline">
                  Google AI Studio <ExternalLink className="size-3" />
                </a>
                . Elle reste dans ce navigateur et n&apos;est envoyée qu&apos;avec tes requêtes IA.
              </>
            }
            onSave={(k) => {
              if (k && !/^AIza[0-9A-Za-z_-]{20,}$/.test(k)) {
                toast({ tone: "error", title: "Clé invalide", message: "Une clé Gemini commence par « AIza »." });
                return false;
              }
              setGeminiKey(k);
              setHasGemini(!!k);
              toast({ tone: "success", title: k ? "Clé Gemini enregistrée sur cet appareil" : "Clé Gemini supprimée" });
              return true;
            }}
          />
        )}

        {status?.serverKey ? (
          <p className="text-xs text-ink-3">Clé Claude configurée sur le serveur (ANTHROPIC_API_KEY).</p>
        ) : (
          <KeyField
            label="Ta clé API Claude (optionnelle)"
            has={hasClaude}
            placeholder="sk-ant-…"
            hint="Pour un coach plus poussé. Crée-la sur console.anthropic.com (facturée à l'usage)."
            onSave={(k) => {
              if (k && !k.startsWith("sk-ant-")) {
                toast({ tone: "error", title: "Clé invalide", message: "Une clé Anthropic commence par « sk-ant- »." });
                return false;
              }
              setUserAiKey(k);
              setHasClaude(!!k);
              toast({ tone: "success", title: k ? "Clé Claude enregistrée sur cet appareil" : "Clé Claude supprimée" });
              return true;
            }}
          />
        )}

        <Field label="Moteur utilisé" hint="Automatique : Gemini pour les photos, Claude pour le coach et le rapport si tu as une clé Claude, sinon Gemini partout.">
          <Segmented
            size="sm"
            value={provider}
            onChange={(v: AiProviderPref) => {
              setProvider(v);
              setAiProvider(v);
            }}
            ariaLabel="Moteur IA"
            options={[
              { value: "auto", label: "Automatique", icon: <Sparkles /> },
              { value: "gemini", label: "Gemini" },
              { value: "claude", label: "Claude" },
            ]}
          />
        </Field>
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-line bg-white/[0.02] p-3 text-xs text-ink-2">
        <p className="flex items-center gap-2 font-medium text-ink">
          <Gauge className="size-4 text-arise" /> Quota gratuit Gemini
        </p>
        <p>
          Sans frais, Google limite le nombre de requêtes par jour et par projet (remise à zéro à minuit, heure du Pacifique). ARISE utilise d&apos;abord le modèle le plus précis, puis bascule automatiquement sur les modèles « Lite » (quota bien plus large) quand la limite est atteinte.
        </p>
        <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-arise hover:underline">
          Voir mes limites exactes dans AI Studio <ExternalLink className="size-3" />
        </a>
        <p className="flex items-start gap-2 pt-1 text-ink-3">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warn" /> En offre gratuite, Google peut utiliser les contenus envoyés (dont les photos) pour améliorer ses produits. N&apos;envoie pas de photo avec des informations personnelles.
        </p>
      </div>

      {status?.accessCodeRequired && (
        <div className="mt-4 space-y-2">
          <Field label="Code d'accès ARISE" hint="Ce déploiement protège l'IA par un code (ARISE_ACCESS_CODE).">
            <TextInput type="password" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAccessCode(code.trim());
              toast({ tone: "success", title: "Code enregistré" });
            }}
          >
            <Check /> Enregistrer le code
          </Button>
        </div>
      )}
      <Notice className="mt-4">Les estimations de l&apos;IA (photo, conseils) sont indicatives et modifiables avant validation. Le coach ne remplace pas un avis médical.</Notice>
    </Panel>
  );
}

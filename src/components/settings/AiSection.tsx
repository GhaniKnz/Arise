"use client";

import { Bot, Check, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { getAccessCode, getUserAiKey, setAccessCode, setUserAiKey } from "@/lib/api";
import { toast } from "@/lib/system/store";

interface Status {
  serverKey: boolean;
  accessCodeRequired: boolean;
  model: string;
}

export function AiSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [code, setCode] = useState(getAccessCode);
  const [hasKey, setHasKey] = useState(() => !!getUserAiKey());

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const saveKey = () => {
    const k = key.trim();
    if (k && !k.startsWith("sk-ant-")) {
      toast({ tone: "error", title: "Clé invalide", message: "Une clé Anthropic commence par « sk-ant- »." });
      return;
    }
    setUserAiKey(k);
    setHasKey(!!k);
    setKey("");
    toast({ tone: "success", title: k ? "Clé enregistrée sur cet appareil" : "Clé supprimée" });
  };

  const ready = status?.serverKey || hasKey;

  return (
    <Panel id="ai">
      <PanelHeader title="Intelligence artificielle" icon={<Bot />} subtitle="Scan photo des repas, coach ARISE AI, rapport hebdo" />
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-3 text-sm">
        <span className={`size-2.5 rounded-full ${ready ? "bg-good shadow-[0_0_8px_#34d399]" : "bg-warn"}`} />
        <span className="text-ink">{ready ? "IA opérationnelle" : "IA non configurée"}</span>
        {status && <span className="ml-auto text-xs text-ink-3">Modèle : {status.model}</span>}
      </div>
      {status?.serverKey ? (
        <p className="mt-2 text-xs text-ink-3">Une clé est configurée sur le serveur (variable ANTHROPIC_API_KEY).</p>
      ) : (
        <div className="mt-3 space-y-2">
          <Field label="Ta clé API Anthropic" hint={hasKey ? "Une clé est enregistrée sur cet appareil. Saisis-en une nouvelle pour la remplacer, ou vide pour la supprimer." : "Crée une clé sur console.anthropic.com. Elle reste dans ce navigateur et n'est envoyée qu'avec tes requêtes IA."}>
            <TextInput type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={hasKey ? "••••••••••••" : "sk-ant-…"} />
          </Field>
          <Button size="sm" variant="secondary" onClick={saveKey}>
            <KeyRound /> {key ? "Enregistrer la clé" : hasKey ? "Supprimer la clé" : "Enregistrer"}
          </Button>
        </div>
      )}
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
      <Notice className="mt-4">Les estimations de l&apos;IA (photo, conseils) sont indicatives. Le coach ne remplace pas un avis médical.</Notice>
    </Panel>
  );
}

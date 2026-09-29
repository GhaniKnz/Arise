"use client";

import { Cloud, CloudOff, LogOut, Mail, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { deleteCloudData, resetSyncWatermarks, syncNow, useSyncState } from "@/lib/sync/engine";
import { supabase, SYNC_ENABLED } from "@/lib/sync/supabase";
import { toast } from "@/lib/system/store";
import { formatTime } from "@/lib/utils/date";

export function SyncSection() {
  const sync = useSyncState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!SYNC_ENABLED)
    return (
      <Panel id="sync">
        <PanelHeader title="Compte & synchronisation" icon={<CloudOff />} subtitle="Mode local (aucun compte nécessaire)" />
        <p className="text-sm text-ink-2">Tes données sont enregistrées uniquement sur cet appareil. Pour synchroniser téléphone et ordinateur, connecte un projet Supabase gratuit :</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-3">
          <li>Crée un projet sur supabase.com et exécute <code className="text-ink-2">supabase/migrations/0001_init.sql</code>.</li>
          <li>
            Ajoute <code className="text-ink-2">NEXT_PUBLIC_SUPABASE_URL</code> et <code className="text-ink-2">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> aux variables d&apos;environnement.
          </li>
          <li>Redéploie : la connexion (e-mail, lien magique, Google) apparaîtra ici.</li>
        </ol>
      </Panel>
    );

  const sb = supabase()!;
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/settings` : undefined;

  const run = async (fn: () => Promise<{ error: { message: string } | null } | void>, success?: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res && res.error) throw new Error(res.error.message);
      if (success) toast({ tone: "success", title: success });
    } catch (e) {
      toast({ tone: "error", title: "Échec", message: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  if (sync.status === "signed-out" || sync.status === "off")
    return (
      <Panel id="sync">
        <PanelHeader title="Compte & synchronisation" icon={<Cloud />} subtitle="Synchronise tes données entre tes appareils" />
        <div className="space-y-3">
          <Button variant="secondary" block onClick={() => run(() => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } }))} disabled={busy}>
            Continuer avec Google
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail">
              <TextInput type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Mot de passe">
              <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run(() => sb.auth.signInWithPassword({ email, password }), "Connecté")} disabled={busy || !email || password.length < 6}>
              Se connecter
            </Button>
            <Button variant="secondary" onClick={() => run(() => sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }), "Compte créé : confirme ton e-mail")} disabled={busy || !email || password.length < 6}>
              Créer un compte
            </Button>
            <Button variant="ghost" onClick={() => run(() => sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }), "Lien magique envoyé")} disabled={busy || !email}>
              <Mail /> Lien magique
            </Button>
          </div>
          <Notice>Tes données locales sont conservées et fusionnées avec ton espace cloud à la première connexion.</Notice>
        </div>
      </Panel>
    );

  return (
    <Panel id="sync">
      <PanelHeader title="Compte & synchronisation" icon={<Cloud />} subtitle={sync.email} />
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-3 text-sm">
        <span className={`size-2.5 rounded-full ${sync.status === "error" ? "bg-bad" : sync.status === "syncing" ? "animate-pulse bg-arise" : "bg-good"}`} />
        <span className="text-ink">{sync.status === "syncing" ? "Synchronisation…" : sync.status === "error" ? "Erreur de synchronisation" : "Synchronisé"}</span>
        {sync.lastSync && <span className="ml-auto text-xs text-ink-3">à {formatTime(sync.lastSync)}</span>}
      </div>
      {sync.error && <p className="mt-2 text-xs text-bad">{sync.error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => syncNow()} disabled={sync.status === "syncing"}>
          <RefreshCw /> Synchroniser
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            run(async () => {
              await sb.auth.signOut();
              await resetSyncWatermarks();
            }, "Déconnecté (données locales conservées)")
          }
        >
          <LogOut /> Se déconnecter
        </Button>
        {confirmDelete ? (
          <Button size="sm" variant="danger" onClick={() => run(async () => { await deleteCloudData(); setConfirmDelete(false); }, "Données cloud supprimées")}>
            Confirmer la suppression cloud
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Supprimer mes données cloud
          </Button>
        )}
      </div>
    </Panel>
  );
}

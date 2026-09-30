"use client";

import { motion } from "motion/react";
import { Bot, Loader2, SendHorizontal, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { RichText } from "@/components/coach/RichText";
import { AriseMark } from "@/components/icons/AriseLogo";
import { IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Fields";
import { Notice } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiHeaders, getUserAiKey } from "@/lib/api";
import { buildCoachContext } from "@/lib/ai/context";
import { db } from "@/lib/db";
import { useCoachMessages } from "@/lib/db/hooks";
import { insert } from "@/lib/db/repo";
import type { CoachMessage } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";

const SUGGESTIONS = [
  "Pourquoi mon poids a augmenté aujourd'hui ?",
  "Est-ce que je dois réduire mes calories ?",
  "Quelle séance dois-je faire aujourd'hui ?",
  "Est-ce que je mange assez de protéines ?",
  "Pourquoi mon développé couché stagne ?",
  "Comment améliorer ma récupération ?",
];

export default function CoachPage() {
  const game = useGame();
  const messages = useCoachMessages();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((s: { serverKey: boolean }) => setAiReady(s.serverKey || !!getUserAiKey()))
      .catch(() => setAiReady(!!getUserAiKey()));
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length, streaming]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming !== null) return;
    setInput("");
    setError(null);
    await insert<CoachMessage>(db.coachMessages, { role: "user", content });
    const history = [...(messages ?? []), { role: "user" as const, content }].slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    // The API requires the conversation to start with a user turn.
    while (history.length && history[0].role !== "user") history.shift();

    setStreaming("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ messages: history, context: buildCoachContext(game) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}) as { message?: string });
        throw new Error((body as { message?: string }).message ?? `Erreur ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }
      if (acc.trim()) await insert<CoachMessage>(db.coachMessages, { role: "assistant", content: acc.trim() });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "Le coach ne répond pas.");
      if (acc.trim()) await insert<CoachMessage>(db.coachMessages, { role: "assistant", content: acc.trim() });
    } finally {
      setStreaming(null);
      abortRef.current = null;
    }
  };

  const clear = async () => {
    await db.coachMessages.clear();
  };

  const list = messages ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        kicker="Coach IA"
        title="ARISE AI"
        subtitle="Réponses basées sur tes données et la recherche. Pas de diagnostic médical."
        action={
          list.length > 0 && (
            <IconButton label="Effacer la conversation" variant="secondary" onClick={clear}>
              <Trash2 />
            </IconButton>
          )
        }
      />

      {aiReady === false && (
        <Notice tone="warn" className="mb-4">
          L&apos;IA n&apos;est pas encore configurée. Ajoute ta clé API Anthropic dans{" "}
          <Link href="/settings#ai" className="text-arise underline">
            Réglages → IA
          </Link>{" "}
          (ou <code>ANTHROPIC_API_KEY</code> sur le serveur).
        </Notice>
      )}

      <div className="space-y-4 pb-4" aria-live="polite">
        {list.length === 0 && streaming === null && (
          <div className="panel hud flex flex-col items-center p-6 text-center">
            <AriseMark className="size-14" />
            <p className="mt-3 font-display text-lg font-bold text-ink">Pose ta question, Chasseur.</p>
            <p className="mt-1 max-w-sm text-sm text-ink-3">Je lis tes 14 derniers jours (repas, poids, pas, sommeil, séances) pour te répondre précisément.</p>
          </div>
        )}
        {list.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {streaming !== null && (streaming ? <Bubble role="assistant" content={streaming} live /> : <Thinking />)}
        {error && <Notice tone="warn">{error}</Notice>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-[calc(4.5rem+var(--safe-bottom))] z-20 -mx-4 bg-gradient-to-t from-void via-void/95 to-transparent px-4 pt-4 pb-2 lg:bottom-0">
        {list.length === 0 && (
          <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
            {SUGGESTIONS.map((s) => (
              <Chip key={s} onClick={() => send(s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-2xl border border-line-strong bg-deep/95 p-2 shadow-xl backdrop-blur"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Demande à ARISE AI…"
            aria-label="Message au coach"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base text-ink outline-none placeholder:text-ink-3"
          />
          <button type="submit" disabled={!input.trim() || streaming !== null} className="touch-target bg-arise-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition active:scale-90 disabled:opacity-40" aria-label="Envoyer">
            {streaming !== null ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ role, content, live }: { role: "user" | "assistant"; content: string; live?: boolean }) {
  const mine = role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", mine ? "bg-white/[0.06] text-ink-2" : "bg-arise/15 text-arise")} aria-hidden>
        {mine ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed", mine ? "rounded-tr-md bg-arise/15 text-ink" : "panel rounded-tl-md text-ink-2")}>
        {mine ? <p className="whitespace-pre-line">{content}</p> : <RichText text={content} />}
        {live && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-arise align-middle" aria-hidden />}
      </div>
    </motion.div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2.5 text-sm text-ink-3">
      <span className="flex size-8 items-center justify-center rounded-xl bg-arise/15 text-arise">
        <Bot className="size-4" />
      </span>
      <span className="flex gap-1" aria-label="ARISE AI réfléchit">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="size-2 rounded-full bg-arise" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </span>
    </div>
  );
}

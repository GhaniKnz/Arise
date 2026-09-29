"use client";

import { ArrowLeft, CheckCircle2, ExternalLink, Target } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { IconButton } from "@/components/ui/Button";
import { Badge, EmptyState, Notice } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { ARTICLE_BY_SLUG, CATEGORY_LABEL, EVIDENCE_META, pubmedUrl } from "@/lib/data/knowledge";

const EVIDENCE_COLOR = { solide: "#34d399", limitée: "#fbbf24", hypothèse: "#a78bfa" } as const;

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const a = ARTICLE_BY_SLUG.get(slug);
  if (!a) return <EmptyState title="Article introuvable" action={<Link href="/knowledge" className="text-arise">Toutes les fiches →</Link>} />;
  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-2">
        <IconButton label="Retour" onClick={() => router.back()}>
          <ArrowLeft />
        </IconButton>
      </div>
      <PageHeader kicker={CATEGORY_LABEL[a.category]} title={a.title} subtitle={`${a.readMin} min de lecture`} />
      <Panel glow className="mb-4">
        <p className="text-[15px] leading-relaxed text-ink">{a.summary}</p>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader title="Ce que dit la recherche" />
        <ul className="space-y-3">
          {a.claims.map((c) => (
            <li key={c.text} className="flex flex-col gap-1.5 border-b border-line/50 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3">
              <Badge color={EVIDENCE_COLOR[c.evidence]} className="shrink-0 self-start">
                {EVIDENCE_META[c.evidence].label}
              </Badge>
              <p className="text-sm leading-relaxed text-ink-2">{c.text}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader title="Pour toi, concrètement" icon={<Target />} />
        <ul className="space-y-2">
          {a.practical.map((p) => (
            <li key={p} className="flex gap-2.5 text-sm text-ink">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" /> {p}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Sources" />
        <ol className="space-y-3">
          {a.sources.map((s, i) => (
            <li key={s.title} className="text-sm">
              <p className="text-ink-2">
                <span className="text-ink-3">[{i + 1}]</span> {s.authors} ({s.year}). <em className="text-ink">{s.title}</em>. {s.journal}.
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2">
                <Badge>{s.type}</Badge>
                <a href={pubmedUrl(s)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-arise hover:underline">
                  Voir sur PubMed <ExternalLink className="size-3" />
                </a>
              </p>
            </li>
          ))}
        </ol>
        <Notice className="mt-4">Contenu informatif, ne remplace pas l&apos;avis d&apos;un professionnel de santé.</Notice>
      </Panel>
    </article>
  );
}

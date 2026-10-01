"use client";

import { BookOpen, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip, TextInput } from "@/components/ui/Fields";
import { Badge } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { ARTICLES, CATEGORY_LABEL, EVIDENCE_META, type ArticleCategory } from "@/lib/data/knowledge";
import { normalize } from "@/lib/data/foods";

const EVIDENCE_COLOR = { solide: "#34d399", limitée: "#fbbf24", hypothèse: "#a78bfa" } as const;

export default function KnowledgePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ArticleCategory | null>(null);
  const list = useMemo(() => {
    const nq = normalize(q);
    return ARTICLES.filter((a) => (!cat || a.category === cat) && (!nq || normalize(`${a.title} ${a.summary}`).includes(nq)));
  }, [q, cat]);

  return (
    <>
      <PageHeader kicker="Knowledge" title="Science de la transformation" subtitle="Conseils tirés de méta-analyses, consensus et positions officielles, avec leurs sources." />
      <Panel className="mb-4">
        <p className="label mb-2">Niveaux de preuve</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(EVIDENCE_META) as (keyof typeof EVIDENCE_META)[]).map((k) => (
            <li key={k} className="flex items-start gap-2 text-xs text-ink-2">
              <Badge color={EVIDENCE_COLOR[k]}>{EVIDENCE_META[k].label}</Badge>
              <span className="pt-1 text-ink-3">{EVIDENCE_META[k].desc}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (protéines, sommeil, créatine…)" className="pl-10" aria-label="Rechercher un article" />
      </div>
      <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar">
        <Chip active={!cat} onClick={() => setCat(null)}>
          Tout
        </Chip>
        {(Object.keys(CATEGORY_LABEL) as ArticleCategory[]).map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((a) => {
          const solid = a.claims.filter((c) => c.evidence === "solide").length;
          return (
            <li key={a.slug}>
              <Link href={`/knowledge/${a.slug}`} className="panel group flex h-full flex-col p-4 transition hover:border-arise/40">
                <p className="label text-arise/90">{CATEGORY_LABEL[a.category]}</p>
                <p className="mt-1 font-display text-lg leading-snug font-bold text-ink">{a.title}</p>
                <p className="mt-1.5 line-clamp-3 text-sm text-ink-2">{a.summary}</p>
                <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-ink-3">
                  <BookOpen className="size-3.5" /> {a.readMin} min · {a.sources.length} source{a.sources.length > 1 ? "s" : ""} · {solid}/{a.claims.length} données solides
                  <ChevronRight className="ml-auto size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

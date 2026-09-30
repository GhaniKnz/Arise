"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Splits pasted text into lines, dropping list markers ("1.", "2)", "-", "•"). */
export function splitSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:\d+\s*[.)-]|[-•*–])\s*/, "").trim())
    .filter(Boolean);
}

function AutoTextArea({ value, onChange, onPaste, placeholder, ariaLabel, autoFocus }: { value: string; onChange: (v: string) => void; onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void; placeholder?: string; ariaLabel: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onPaste={onPaste}
      className="min-h-10 w-full resize-none overflow-hidden rounded-xl border border-line-strong bg-void/60 px-3 py-2 text-[14px] leading-snug text-ink outline-none placeholder:text-ink-3/70 focus:border-arise focus:shadow-[0_0_0_3px_rgb(77_163_255/0.18)]"
    />
  );
}

/**
 * Editable ordered list (exercise steps, tips): edit, reorder, delete, add.
 * Pasting several lines in a row creates one item per line.
 */
export function StepsEditor({
  items,
  onChange,
  numbered = true,
  marker,
  addLabel,
  placeholder,
  itemLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  numbered?: boolean;
  marker?: ReactNode;
  addLabel: string;
  placeholder: string;
  itemLabel: string;
}) {
  const [focusIdx, setFocusIdx] = useState(-1);
  const update = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const paste = (i: number) => (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const lines = splitSteps(e.clipboardData.getData("text"));
    if (lines.length < 2) return;
    e.preventDefault();
    const keep = items[i].trim() ? [items[i]] : [];
    onChange([...items.slice(0, i), ...keep, ...lines, ...items.slice(i + 1)]);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-center text-xs text-ink-3">Rien pour l&apos;instant.</p>}
      <ol className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={cn("mt-2 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", numbered ? "bg-arise/15 text-arise" : "text-warn")}>{numbered ? i + 1 : marker}</span>
            <div className="min-w-0 flex-1">
              <AutoTextArea value={s} onChange={(v) => update(i, v)} onPaste={paste(i)} placeholder={placeholder} ariaLabel={`${itemLabel} ${i + 1}`} autoFocus={focusIdx === i} />
            </div>
            <div className="flex shrink-0 flex-col">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Monter ${itemLabel.toLowerCase()} ${i + 1}`} className="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-white/5 hover:text-ink disabled:opacity-25">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Descendre ${itemLabel.toLowerCase()} ${i + 1}`} className="flex size-6 items-center justify-center rounded-md text-ink-3 hover:bg-white/5 hover:text-ink disabled:opacity-25">
                <ArrowDown className="size-3.5" />
              </button>
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Supprimer ${itemLabel.toLowerCase()} ${i + 1}`} className="mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-bad/10 hover:text-bad">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => {
          setFocusIdx(items.length);
          onChange([...items, ""]);
        }}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-sm text-ink-2 transition hover:border-arise/60 hover:text-ink"
      >
        <Plus className="size-4" /> {addLabel}
      </button>
    </div>
  );
}

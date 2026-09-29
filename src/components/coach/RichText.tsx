import { Fragment, type ReactNode } from "react";

/** Minimal, safe markdown subset: paragraphs, "-"/"•"/"1." lists and **bold**. No HTML injection. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((b, bi) => {
        const lines = b.split("\n").filter((l) => l.trim() !== "");
        const isList = lines.length > 0 && lines.every((l) => /^\s*([-•*]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={bi} className={ordered ? "list-decimal space-y-1 pl-5" : "space-y-1"}>
              {lines.map((l, li) => (
                <li key={li} className={ordered ? "" : "flex gap-2"}>
                  {!ordered && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-arise" aria-hidden />}
                  <span>{inline(l.replace(/^\s*([-•*]|\d+[.)])\s+/, ""))}</span>
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

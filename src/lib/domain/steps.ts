import type { DayKey } from "@/lib/utils/date";

export interface StepsImport {
  date: DayKey;
  steps: number;
}

const MAX_STEPS = 150_000;

/** "8 432", "8,432", "8.432", "8432,0" → 8432. */
function parseCount(raw: string): number | null {
  let t = raw.replace(/[\s  ']/g, "");
  // A trailing decimal part (1–2 digits) is a fraction, not thousands.
  t = t.replace(/[.,]\d{1,2}$/, "");
  t = t.replace(/[.,]/g, "");
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= MAX_STEPS ? n : null;
}

/**
 * Reads step counts from free text (clipboard from an iOS Shortcut, a note…).
 * One entry per line; a line may carry a date (2026-09-29 or 29/09/2026),
 * otherwise it is for `today`. The last value wins for a given date.
 */
export function parseStepsText(text: string, today: DayKey): StepsImport[] {
  const out = new Map<DayKey, number>();
  for (const line of text.split(/[\n;]+/)) {
    let date: DayKey = today;
    let rest = line;
    const iso = rest.match(/(\d{4})-(\d{2})-(\d{2})/);
    const fr = rest.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (iso) {
      date = `${iso[1]}-${iso[2]}-${iso[3]}`;
      rest = rest.replace(iso[0], " ");
    } else if (fr) {
      date = `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
      rest = rest.replace(fr[0], " ");
    }
    // Drop times like 21:04 so they are not read as counts.
    rest = rest.replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ");
    const m = rest.match(/\d[\d\s  .,']*/);
    const n = m ? parseCount(m[0].trim()) : null;
    if (n != null && /^\d{4}-\d{2}-\d{2}$/.test(date)) out.set(date, n);
  }
  return [...out.entries()].map(([date, steps]) => ({ date, steps })).sort((a, b) => a.date.localeCompare(b.date));
}

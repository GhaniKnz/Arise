const intFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec1Opt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const dec2Opt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const round = (v: number, step = 1) => Math.round(v / step) * step;
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-";
  return intFmt.format(Math.round(n));
}

export function fmtDec(n: number | null | undefined, fixed = false): string {
  if (n == null || Number.isNaN(n)) return "-";
  return fixed ? dec1.format(n) : dec1Opt.format(n);
}

export function fmtDec2(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-";
  return dec2Opt.format(n);
}

export function fmtSigned(n: number, digits = 1, unit = ""): string {
  const s = n > 0 ? "+" : n < 0 ? "−" : "±";
  const abs = Math.abs(n);
  const body = digits === 0 ? intFmt.format(abs) : dec1Opt.format(Number(abs.toFixed(digits)));
  return `${s}${body}${unit ? ` ${unit}` : ""}`;
}

/** 4320 → "1 h 12" */
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

/** 454 min → "7 h 34" */
export function fmtSleep(min: number | null | undefined): string {
  if (min == null) return "-";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** 90 → "01:30" */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtLiters(ml: number | null | undefined): string {
  if (ml == null) return "-";
  return dec1Opt.format(ml / 1000);
}

export function pct(value: number, target: number): number {
  if (!target || target <= 0) return 0;
  return value / target;
}

/** AI-written text likes em dashes as separators: show them as a plain comma instead. */
export function plainDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/,\s*([.,;:!?)])/g, "$1").replace(/^,\s*/gm, "");
}

export function plural(n: number, one: string, many: string): string {
  return Math.abs(n) >= 2 ? many : one;
}

/** Parses "77,5" or "77.5" into a number, returns undefined when empty/invalid. */
export function parseNum(input: string): number | undefined {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

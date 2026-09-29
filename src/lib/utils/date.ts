/** Day keys are local calendar dates formatted as YYYY-MM-DD. */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(now: Date = new Date()): DayKey {
  return toKey(now);
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** Inclusive list of day keys from start to end. */
export function rangeKeys(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  const n = diffDays(start, end);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(key: DayKey): number {
  return (fromKey(key).getDay() + 6) % 7;
}

export function weekStart(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key));
}

export function monthStart(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(key: DayKey): number {
  const d = fromKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function addMonths(key: DayKey, months: number): DayKey {
  const d = fromKey(monthStart(key));
  d.setMonth(d.getMonth() + months);
  return toKey(d);
}

export const WEEKDAYS_SHORT = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"] as const;
export const WEEKDAYS_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDay = (key: DayKey) => dayFmt.format(fromKey(key));
export const formatDayLong = (key: DayKey) => longFmt.format(fromKey(key));
export const formatShort = (key: DayKey) => shortFmt.format(fromKey(key));
export const formatMonth = (key: DayKey) => monthFmt.format(fromKey(key));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export function relativeDayLabel(key: DayKey, today: DayKey = todayKey()): string {
  const d = diffDays(key, today);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  if (d === -1) return "Demain";
  return formatDay(key);
}

export function hourOfDay(now: Date = new Date()): number {
  return now.getHours();
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

// Pure date helpers working on "YYYY-MM-DD" strings (calendar dates, no time zone drift).

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(s: string): boolean {
  if (!ISO_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

/** Today's calendar date in the given IANA time zone. */
export function todayISO(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

export function addDays(iso: string, n: number): string {
  const dt = toUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

/** Monday of the ISO week containing the date. */
export function weekStart(iso: string): string {
  const dt = toUTC(iso);
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -dow);
}

export function isMonday(iso: string): boolean {
  return isValidISODate(iso) && weekStart(iso) === iso;
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86400000);
}

export function formatLong(iso: string): string {
  return toUTC(iso).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShort(iso: string): string {
  return toUTC(iso).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
}

export function formatWeekRange(start: string): string {
  const end = addDays(start, 6);
  return `${formatShort(start)} – ${formatShort(end)} ${end.slice(0, 4)}`;
}

/** Minutes the given time zone is ahead of UTC at that instant (e.g. +330 for Asia/Kolkata). */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  const truncated = Math.floor(date.getTime() / 60000) * 60000;
  return Math.round((asUTC - truncated) / 60000);
}

/** "YYYY-MM-DDTHH:mm" typed in the app's time zone → UTC ISO string. Null if invalid. */
export function zonedLocalToISO(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000).toISOString();
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" in the app's time zone (for datetime-local inputs). */
export function isoToZonedLocal(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + tzOffsetMinutes(d, timeZone) * 60000);
  return shifted.toISOString().slice(0, 16);
}

export interface PeriodNavigation {
  periodStart: string;
  prev: string;
  next: string | null; // null when next would be in the future
  isCurrent: boolean;
}

/** Works out previous/next periods; never allows navigating into the future. */
export function periodNavigation(mode: "day" | "week", date: string, today: string): PeriodNavigation {
  if (mode === "day") {
    const next = addDays(date, 1);
    return {
      periodStart: date,
      prev: addDays(date, -1),
      next: next <= today ? next : null,
      isCurrent: date === today,
    };
  }
  const start = weekStart(date);
  const current = weekStart(today);
  const next = addDays(start, 7);
  return {
    periodStart: start,
    prev: addDays(start, -7),
    next: next <= current ? next : null,
    isCurrent: start === current,
  };
}

export function periodHref(mode: "day" | "week", periodStart: string, today: string): string {
  if (mode === "day") return periodStart === today ? "/" : `/achievers/day/${periodStart}`;
  return `/achievers/week/${periodStart}`;
}

/**
 * Store-time helpers. The merchant enters dates in their store's time zone
 * ("2026-11-27T08:00"); the database and the storefront use real instants.
 */

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export const isLocalDateTime = (v: string) => LOCAL.test(v);

/** Wall-clock parts of an instant in a time zone. */
function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

/** Milliseconds the time zone is ahead of UTC at that instant. */
function offset(date: Date, tz: string) {
  const p = parts(date, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - Math.floor(date.getTime() / 60000) * 60000;
}

export function safeZone(tz: string | null | undefined) {
  try {
    if (tz) {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    }
  } catch {
    /* unknown zone */
  }
  return "UTC";
}

/** "2026-11-27T08:00" in the store's zone → the instant. Null when empty or invalid. */
export function localToDate(local: string, tz: string): Date | null {
  const m = LOCAL.exec(local);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Twice, so a date on the other side of a daylight-saving change gets its own offset.
  let t = wall - offset(new Date(wall), tz);
  t = wall - offset(new Date(t), tz);
  return new Date(t);
}

/** The instant → "2026-11-27T08:00" in the store's zone ("" for none). */
export function dateToLocal(date: Date | null | undefined, tz: string) {
  if (!date) return "";
  const p = parts(date, tz);
  const n = (x: number) => String(x).padStart(2, "0");
  return `${p.y}-${n(p.mo)}-${n(p.d)}T${n(p.h)}:${n(p.mi)}`;
}

/** Short label for the merchant, e.g. "Nov 30, 23:59". */
export function shortLabel(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

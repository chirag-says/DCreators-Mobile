/**
 * Pure month-grid date maths, with no React or React Native imports so it can
 * be unit-tested on its own. MonthCalendar renders these; BookConsultantScreen
 * uses the set helpers to manage a multi-date selection.
 */

/** 'YYYY-MM-DD' for a given year, 0-based month, and day. */
export function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Number of days in a 0-based month. */
export function getDaysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/** Weekday index of the 1st, Monday-first (0=Mon … 6=Sun). */
export function getFirstWeekday(y: number, m: number): number {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

/** Immutably add or remove a value from a set (returns a new set). */
export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

/** Chronological list of 'YYYY-MM-DD' keys. Lexicographic sort == date sort. */
export function sortedDateKeys(set: Set<string>): string[] {
  return Array.from(set).sort();
}

/**
 * Booking vocabulary: what a consultant's rate is quoted against, and when and
 * for how long an engagement runs.
 *
 * The four columns behind this arrived together (20260829120100) and are read
 * together on every screen that shows a booking — the pricing screen writes the
 * unit, the profile renders it, the booking screen collects the span, and three
 * work-order screens display both. Parsing and labels live here so a rate never
 * renders one way on the client's screen and another on the consultant's.
 */

// ── Price unit ──────────────────────────────────────────────────────────────

/** DB values of consultant_profiles.price_unit. */
export type PriceUnit = 'per_project' | 'per_day' | 'per_hour';

export const PRICE_UNITS: PriceUnit[] = ['per_project', 'per_day', 'per_hour'];

/** Selector copy, consultant-facing. */
export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  per_project: 'Per Project',
  per_day: 'Per Day',
  per_hour: 'Per Hour',
};

/** Suffix on a rendered amount, client-facing. */
export const PRICE_UNIT_SUFFIX: Record<PriceUnit, string> = {
  per_project: '/ project',
  per_day: '/ day',
  per_hour: '/ hour',
};

/**
 * Rows written before the column existed read as per_project, matching the
 * DB default — a base_price has always implicitly been a whole-project fee.
 */
export function toPriceUnit(value: unknown): PriceUnit {
  return PRICE_UNITS.includes(value as PriceUnit) ? (value as PriceUnit) : 'per_project';
}

// ── Duration ────────────────────────────────────────────────────────────────

/** DB values of projects.duration_unit. */
export type DurationUnit = 'hours' | 'days';

export const DURATION_UNITS: DurationUnit[] = ['hours', 'days'];

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  hours: 'Hours',
  days: 'Days',
};

/** "3 days", "1 hour". Null on projects that never recorded a span. */
export function formatDuration(
  value: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (!value || !unit) return null;
  return `${value} ${value === 1 ? unit.replace(/s$/, '') : unit}`;
}

// ── Start time ──────────────────────────────────────────────────────────────

/**
 * Half-hour slots, 6am to 10pm, rendered as a chip row on the booking screen.
 *
 * A native clock picker would mean a new dependency for a field whose realistic
 * range is sixteen hours, and the codebase already builds its own MonthCalendar
 * rather than pulling in a date library. Same call, same reason.
 */
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let minutes = 6 * 60; minutes <= 22 * 60; minutes += 30) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
})();

/** "14:30" or Postgres's "14:30:00" → "2:30 PM". Null when unset. */
export function formatStartTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [rawHour, rawMinute] = time.split(':');
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return null;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${rawMinute ?? '00'} ${suffix}`;
}

// ── Schedule summary ────────────────────────────────────────────────────────

/**
 * "12 Sep 2026 · 2:30 PM · 3 days" — the whole engagement in one line, for the
 * work-order screens. Null when the project carries no schedule at all, which
 * is every bidding-path project and everything created before 20260829120100.
 *
 * A formatter rather than a shared component: the three screens that show this
 * each have their own card idiom, and only the parsing needs to agree.
 */
export function formatSchedule(project: {
  event_date?: string | null;
  start_time?: string | null;
  duration_value?: number | null;
  duration_unit?: string | null;
} | null | undefined): string | null {
  if (!project) return null;
  const parts = [
    project.event_date
      ? new Date(project.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null,
    formatStartTime(project.start_time),
    formatDuration(project.duration_value, project.duration_unit),
  ].filter(Boolean);
  return parts.length ? parts.join('  ·  ') : null;
}

// ── Opening budget ──────────────────────────────────────────────────────────

/**
 * The budget a booking screen starts the client on, derived from the
 * consultant's rate.
 *
 * Multiplies only when the rate's unit and the duration's unit measure the same
 * thing. A per-hour rate against a duration in days would need a working-day
 * length this app has never defined, and guessing eight would put a wrong number
 * into a money field the client is about to commit to. Falling back to the raw
 * rate is visibly a starting point; a plausible-looking wrong total is not.
 */
export function seedBudget(
  basePrice: number | null | undefined,
  unit: unknown,
  durationValue: number,
  durationUnit: DurationUnit,
): number | null {
  if (!basePrice) return null;
  const priceUnit = toPriceUnit(unit);
  if (priceUnit === 'per_day' && durationUnit === 'days') return basePrice * durationValue;
  if (priceUnit === 'per_hour' && durationUnit === 'hours') return basePrice * durationValue;
  return basePrice;
}

import {
  toPriceUnit, formatDuration, formatStartTime, seedBudget, TIME_SLOTS,
} from '../booking';

describe('toPriceUnit', () => {
  it('passes through valid units', () => {
    expect(toPriceUnit('per_day')).toBe('per_day');
    expect(toPriceUnit('per_hour')).toBe('per_hour');
  });
  it('falls back to per_project for unknown/empty values', () => {
    expect(toPriceUnit(undefined)).toBe('per_project');
    expect(toPriceUnit('weekly')).toBe('per_project');
  });
});

describe('formatDuration', () => {
  it('singularises a value of 1', () => {
    expect(formatDuration(1, 'days')).toBe('1 day');
    expect(formatDuration(1, 'hours')).toBe('1 hour');
  });
  it('keeps the plural for values above 1', () => {
    expect(formatDuration(3, 'days')).toBe('3 days');
  });
  it('returns null when value or unit is missing', () => {
    expect(formatDuration(null, 'days')).toBeNull();
    expect(formatDuration(2, null)).toBeNull();
  });
});

describe('formatStartTime', () => {
  it('converts 24h to 12h with AM/PM', () => {
    expect(formatStartTime('09:30')).toBe('9:30 AM');
    expect(formatStartTime('14:00')).toBe('2:00 PM');
    expect(formatStartTime('00:00')).toBe('12:00 AM');
    expect(formatStartTime('12:00')).toBe('12:00 PM');
  });
  it('accepts a Postgres time string', () => {
    expect(formatStartTime('18:30:00')).toBe('6:30 PM');
  });
  it('returns null for empty input', () => {
    expect(formatStartTime(null)).toBeNull();
  });
});

describe('seedBudget', () => {
  it('multiplies when rate unit and duration unit match', () => {
    expect(seedBudget(5000, 'per_day', 3, 'days')).toBe(15000);
    expect(seedBudget(800, 'per_hour', 4, 'hours')).toBe(3200);
  });
  it('does not guess across mismatched units', () => {
    // A per-hour rate against a duration in days has no defined working day.
    expect(seedBudget(800, 'per_hour', 2, 'days')).toBe(800);
  });
  it('treats a project rate as a flat fee', () => {
    expect(seedBudget(20000, 'per_project', 5, 'days')).toBe(20000);
  });
  it('returns null without a base price', () => {
    expect(seedBudget(null, 'per_day', 3, 'days')).toBeNull();
  });
});

describe('TIME_SLOTS', () => {
  it('runs half-hourly from 6am to 10pm inclusive', () => {
    expect(TIME_SLOTS[0]).toBe('06:00');
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe('22:00');
    expect(TIME_SLOTS).toContain('12:30');
  });
});

import {
  toDateKey, getDaysInMonth, getFirstWeekday, toggleInSet, sortedDateKeys,
} from '../calendar';

describe('toDateKey', () => {
  it('zero-pads month and day and makes month 1-based', () => {
    expect(toDateKey(2026, 0, 5)).toBe('2026-01-05');   // January
    expect(toDateKey(2026, 11, 31)).toBe('2026-12-31'); // December
  });
});

describe('getDaysInMonth', () => {
  it('handles 30- and 31-day months', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);  // Jan
    expect(getDaysInMonth(2026, 3)).toBe(30);  // Apr
  });
  it('handles February in common and leap years', () => {
    expect(getDaysInMonth(2026, 1)).toBe(28); // 2026 not leap
    expect(getDaysInMonth(2028, 1)).toBe(29); // 2028 leap
  });
});

describe('getFirstWeekday (Monday-first)', () => {
  it('returns 0 for a month starting on Monday', () => {
    // 1 June 2026 is a Monday.
    expect(getFirstWeekday(2026, 5)).toBe(0);
  });
  it('returns 6 for a month starting on Sunday', () => {
    // 1 Feb 2026 is a Sunday.
    expect(getFirstWeekday(2026, 1)).toBe(6);
  });
});

describe('toggleInSet', () => {
  it('adds a missing value and returns a new set', () => {
    const start = new Set<string>(['a']);
    const next = toggleInSet(start, 'b');
    expect(next.has('b')).toBe(true);
    expect(next).not.toBe(start);        // immutable
    expect(start.has('b')).toBe(false);  // original untouched
  });
  it('removes a present value', () => {
    expect(toggleInSet(new Set(['a', 'b']), 'a').has('a')).toBe(false);
  });
});

describe('sortedDateKeys', () => {
  it('sorts YYYY-MM-DD keys chronologically', () => {
    const set = new Set(['2026-09-28', '2026-09-05', '2026-10-01']);
    expect(sortedDateKeys(set)).toEqual(['2026-09-05', '2026-09-28', '2026-10-01']);
  });
  it('returns [] for an empty set', () => {
    expect(sortedDateKeys(new Set())).toEqual([]);
  });
});

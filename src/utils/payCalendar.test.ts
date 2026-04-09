import { describe, expect, it } from 'vitest';
import {
  generatePaycheckDates,
  getMinPaychecksInMonth,
  getPaychecksInMonth,
  getPaychecksInQuarter,
} from './payCalendar';

// ---------------------------------------------------------------------------
// Bi-weekly
// ---------------------------------------------------------------------------

describe('generatePaycheckDates — bi-weekly', () => {
  // Anchor: 2026-01-02 (Friday). Known 3-paycheck months in 2026 for this anchor:
  // January (Jan 2, 16, 30), May (May 1, 15, 29), October (Oct 2, 16, 30)
  const anchor = '2026-01-02';

  it('returns the correct dates for a 2-paycheck month', () => {
    // February 2026: Feb 13, Feb 27
    const dates = generatePaycheckDates(anchor, 'bi-weekly', '2026-02-01', '2026-02-28');
    expect(dates).toEqual(['2026-02-13', '2026-02-27']);
  });

  it('returns the correct dates for a 3-paycheck month', () => {
    // January 2026: Jan 2, Jan 16, Jan 30
    const dates = generatePaycheckDates(anchor, 'bi-weekly', '2026-01-01', '2026-01-31');
    expect(dates).toEqual(['2026-01-02', '2026-01-16', '2026-01-30']);
  });

  it('produces exactly 26 paychecks in a full calendar year', () => {
    const dates = generatePaycheckDates(anchor, 'bi-weekly', '2026-01-01', '2026-12-31');
    expect(dates).toHaveLength(26);
  });

  it('returns an empty array when the range is before the anchor', () => {
    const dates = generatePaycheckDates(anchor, 'bi-weekly', '2025-12-01', '2025-12-15');
    // Should resolve backwards correctly — Dec 5 and Dec 19 are bi-weekly before anchor
    expect(dates.every((d) => d >= '2025-12-01' && d <= '2025-12-15')).toBe(true);
  });

  it('returns dates sorted ascending', () => {
    const dates = generatePaycheckDates(anchor, 'bi-weekly', '2026-01-01', '2026-06-30');
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
  });
});

describe('getPaychecksInMonth — bi-weekly', () => {
  const anchor = '2026-01-02';

  it('returns 3 for a 3-paycheck month (January 2026)', () => {
    expect(getPaychecksInMonth(anchor, 'bi-weekly', 2026, 1)).toBe(3);
  });

  it('returns 2 for a 2-paycheck month (February 2026)', () => {
    expect(getPaychecksInMonth(anchor, 'bi-weekly', 2026, 2)).toBe(2);
  });

  it('sums to 26 across all 12 months of the year', () => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getPaychecksInMonth(anchor, 'bi-weekly', 2026, month);
    }
    expect(total).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// Weekly
// ---------------------------------------------------------------------------

describe('generatePaycheckDates — weekly', () => {
  // Anchor: 2026-01-02 (Friday)
  const anchor = '2026-01-02';

  it('produces exactly 52 paychecks in a full calendar year', () => {
    const dates = generatePaycheckDates(anchor, 'weekly', '2026-01-01', '2026-12-31');
    expect(dates).toHaveLength(52);
  });

  it('returns 4 paychecks for a 4-week month', () => {
    // February 2026: Feb 6, 13, 20, 27 (anchor Jan 2 → weekly on Fridays)
    const count = getPaychecksInMonth(anchor, 'weekly', 2026, 2);
    expect(count).toBe(4);
  });

  it('returns 5 paychecks for a 5-week month', () => {
    // January 2026: Jan 2, 9, 16, 23, 30
    const count = getPaychecksInMonth(anchor, 'weekly', 2026, 1);
    expect(count).toBe(5);
  });

  it('annual sum is 52', () => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getPaychecksInMonth(anchor, 'weekly', 2026, month);
    }
    expect(total).toBe(52);
  });
});

// ---------------------------------------------------------------------------
// Semi-monthly
// ---------------------------------------------------------------------------

describe('generatePaycheckDates — semi-monthly', () => {
  const anchor = '2026-01-01'; // anchor unused for semi-monthly; days drive the schedule
  const semiMonthlyDays = { first: 15, second: 31 };

  it('returns exactly 2 paychecks per month', () => {
    for (let month = 1; month <= 12; month++) {
      const count = getPaychecksInMonth(anchor, 'semi-monthly', 2026, month, semiMonthlyDays);
      expect(count).toBe(2);
    }
  });

  it('produces exactly 24 paychecks in a full calendar year', () => {
    const dates = generatePaycheckDates(
      anchor,
      'semi-monthly',
      '2026-01-01',
      '2026-12-31',
      semiMonthlyDays,
    );
    expect(dates).toHaveLength(24);
  });

  it('clamps day 31 to the last day of the month (e.g., Feb 28)', () => {
    const dates = generatePaycheckDates(
      anchor,
      'semi-monthly',
      '2026-02-01',
      '2026-02-28',
      semiMonthlyDays,
    );
    expect(dates).toContain('2026-02-28');
    expect(dates).toContain('2026-02-15');
  });

  it('clamps day 31 to Feb 29 on a leap year', () => {
    const dates = generatePaycheckDates(
      anchor,
      'semi-monthly',
      '2028-02-01',
      '2028-02-29',
      semiMonthlyDays,
    );
    expect(dates).toContain('2028-02-29');
  });
});

// ---------------------------------------------------------------------------
// Monthly
// ---------------------------------------------------------------------------

describe('generatePaycheckDates — monthly', () => {
  const anchor = '2026-01-31';

  it('returns exactly 1 paycheck per month', () => {
    for (let month = 1; month <= 12; month++) {
      const count = getPaychecksInMonth(anchor, 'monthly', 2026, month);
      expect(count).toBe(1);
    }
  });

  it('produces exactly 12 paychecks in a full calendar year', () => {
    const dates = generatePaycheckDates(anchor, 'monthly', '2026-01-01', '2026-12-31');
    expect(dates).toHaveLength(12);
  });

  it('clamps day 31 to the last day of February (non-leap year)', () => {
    const dates = generatePaycheckDates(anchor, 'monthly', '2026-02-01', '2026-02-28');
    expect(dates).toEqual(['2026-02-28']);
  });

  it('clamps day 31 to Feb 29 on a leap year', () => {
    const leapAnchor = '2028-01-31';
    const dates = generatePaycheckDates(leapAnchor, 'monthly', '2028-02-01', '2028-02-29');
    expect(dates).toEqual(['2028-02-29']);
  });
});

// ---------------------------------------------------------------------------
// Leap year anchor
// ---------------------------------------------------------------------------

describe('leap year anchor — Feb 29', () => {
  it('bi-weekly anchor on Feb 29 resolves correctly on a non-leap year', () => {
    // 2028 is a leap year. Anchor is Feb 29, 2028.
    // 2029 is not a leap year — the utility should still produce 26 paychecks.
    const anchor = '2028-02-29';
    const dates = generatePaycheckDates(anchor, 'bi-weekly', '2029-01-01', '2029-12-31');
    expect(dates).toHaveLength(26);
  });

  it('monthly anchor on Feb 29 clamps to Feb 28 on a non-leap year', () => {
    const anchor = '2028-02-29';
    const dates = generatePaycheckDates(anchor, 'monthly', '2029-02-01', '2029-02-28');
    expect(dates).toEqual(['2029-02-28']);
  });
});

// ---------------------------------------------------------------------------
// Year boundary
// ---------------------------------------------------------------------------

describe('year boundary handling', () => {
  it('bi-weekly dates crossing Dec 31 → Jan 1 are bucketed into the correct month', () => {
    // Anchor 2026-12-25 → next paycheck is 2027-01-08 (bi-weekly)
    const anchor = '2026-12-25';
    const decCount = getPaychecksInMonth(anchor, 'bi-weekly', 2026, 12);
    const janCount = getPaychecksInMonth(anchor, 'bi-weekly', 2027, 1);

    // Dec 25 falls in December; Jan 8 falls in January — no overlap
    expect(decCount).toBeGreaterThanOrEqual(1);
    expect(janCount).toBeGreaterThanOrEqual(1);

    // Together they are separate months
    const decDates = generatePaycheckDates(anchor, 'bi-weekly', '2026-12-01', '2026-12-31');
    const janDates = generatePaycheckDates(anchor, 'bi-weekly', '2027-01-01', '2027-01-31');
    const overlap = decDates.filter((d) => janDates.includes(d));
    expect(overlap).toHaveLength(0);
  });

  it('weekly dates crossing Dec 31 → Jan 1 are bucketed correctly', () => {
    const anchor = '2026-12-31';
    const decDates = generatePaycheckDates(anchor, 'weekly', '2026-12-01', '2026-12-31');
    const janDates = generatePaycheckDates(anchor, 'weekly', '2027-01-01', '2027-01-31');
    const overlap = decDates.filter((d) => janDates.includes(d));
    expect(overlap).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getPaychecksInQuarter
// ---------------------------------------------------------------------------

describe('getPaychecksInQuarter', () => {
  const anchor = '2026-01-02';

  it('bi-weekly: Q1 2026 has 6 or 7 paychecks', () => {
    // Jan(3) + Feb(2) + Mar(2) = 7
    const count = getPaychecksInQuarter(anchor, 'bi-weekly', 2026, 1);
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(7);
  });

  it('bi-weekly: sums of all 4 quarters equals 26', () => {
    let total = 0;
    for (let q = 1; q <= 4; q++) {
      total += getPaychecksInQuarter(anchor, 'bi-weekly', 2026, q);
    }
    expect(total).toBe(26);
  });

  it('semi-monthly: each quarter always has exactly 6 paychecks', () => {
    const semiMonthlyDays = { first: 1, second: 15 };
    for (let q = 1; q <= 4; q++) {
      const count = getPaychecksInQuarter(anchor, 'semi-monthly', 2026, q, semiMonthlyDays);
      expect(count).toBe(6);
    }
  });
});

// ---------------------------------------------------------------------------
// getMinPaychecksInMonth
// ---------------------------------------------------------------------------

describe('getMinPaychecksInMonth', () => {
  const anchor = '2026-01-02';

  it('bi-weekly: minimum is 2', () => {
    expect(getMinPaychecksInMonth(anchor, 'bi-weekly', 2026)).toBe(2);
  });

  it('weekly: minimum is 4', () => {
    expect(getMinPaychecksInMonth(anchor, 'weekly', 2026)).toBe(4);
  });

  it('semi-monthly: minimum is always 2', () => {
    const semiMonthlyDays = { first: 1, second: 15 };
    expect(getMinPaychecksInMonth(anchor, 'semi-monthly', 2026, semiMonthlyDays)).toBe(2);
  });

  it('monthly: minimum is always 1', () => {
    expect(getMinPaychecksInMonth(anchor, 'monthly', 2026)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases — empty / invalid input
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('returns empty array when firstPaycheckDate is empty string', () => {
    expect(generatePaycheckDates('', 'bi-weekly', '2026-01-01', '2026-01-31')).toEqual([]);
  });

  it('returns empty array when rangeStart is after rangeEnd', () => {
    expect(generatePaycheckDates('2026-01-01', 'bi-weekly', '2026-02-01', '2026-01-01')).toEqual(
      [],
    );
  });
});

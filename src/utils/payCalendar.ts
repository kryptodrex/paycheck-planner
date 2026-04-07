import type { PayFrequency } from '../types/frequencies';

export interface SemiMonthlyDays {
  first: number;
  second: number;
}

// ---------------------------------------------------------------------------
// Internal ISO date helpers — no Date() constructors, no timezone drift.
// All dates are treated as calendar dates in the format YYYY-MM-DD.
// ---------------------------------------------------------------------------

/** Returns the number of days in a given month (1-based). */
function daysInMonth(year: number, month: number): number {
  // Day 0 of next month = last day of this month
  return new Date(year, month, 0).getDate();
}

/** Parses an ISO date string into { year, month, day } without timezone offset. */
function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** Formats a { year, month, day } back to an ISO date string. */
function formatISODate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Clamps day to the last valid day of the given month. */
function clampToMonthEnd(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

/** Adds `days` calendar days to an ISO date string, returning a new ISO string. */
function addDays(iso: string, days: number): string {
  const { year, month, day } = parseISODate(iso);
  // Use UTC to avoid DST shifting the date
  const ms = Date.UTC(year, month - 1, day) + days * 86_400_000;
  const d = new Date(ms);
  return formatISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Compares two ISO date strings. Returns negative, 0, or positive. */
function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Paycheck date generators per frequency
// ---------------------------------------------------------------------------

function generateBiWeeklyDates(
  firstPaycheckDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dates: string[] = [];

  // Walk backwards from anchor to find the first date at/after rangeStart
  let current = firstPaycheckDate;

  if (compareISO(current, rangeStart) > 0) {
    // Anchor is after rangeStart — walk backwards
    while (compareISO(addDays(current, -14), rangeStart) >= 0) {
      current = addDays(current, -14);
    }
  } else {
    // Anchor is before rangeStart — walk forward to first date >= rangeStart
    while (compareISO(current, rangeStart) < 0) {
      current = addDays(current, 14);
    }
  }

  while (compareISO(current, rangeEnd) <= 0) {
    dates.push(current);
    current = addDays(current, 14);
  }

  return dates;
}

function generateWeeklyDates(
  firstPaycheckDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dates: string[] = [];

  let current = firstPaycheckDate;

  if (compareISO(current, rangeStart) > 0) {
    while (compareISO(addDays(current, -7), rangeStart) >= 0) {
      current = addDays(current, -7);
    }
  } else {
    while (compareISO(current, rangeStart) < 0) {
      current = addDays(current, 7);
    }
  }

  while (compareISO(current, rangeEnd) <= 0) {
    dates.push(current);
    current = addDays(current, 7);
  }

  return dates;
}

function generateSemiMonthlyDates(
  rangeStart: string,
  rangeEnd: string,
  semiMonthlyDays: SemiMonthlyDays,
): string[] {
  const dates: string[] = [];
  const start = parseISODate(rangeStart);
  const end = parseISODate(rangeEnd);

  for (let year = start.year; year <= end.year; year++) {
    const monthStart = year === start.year ? start.month : 1;
    const monthEnd = year === end.year ? end.month : 12;

    for (let month = monthStart; month <= monthEnd; month++) {
      const day1 = clampToMonthEnd(year, month, semiMonthlyDays.first);
      const day2 = clampToMonthEnd(year, month, semiMonthlyDays.second);

      const iso1 = formatISODate(year, month, day1);
      const iso2 = formatISODate(year, month, day2);

      if (compareISO(iso1, rangeStart) >= 0 && compareISO(iso1, rangeEnd) <= 0) {
        dates.push(iso1);
      }
      if (compareISO(iso2, rangeStart) >= 0 && compareISO(iso2, rangeEnd) <= 0) {
        dates.push(iso2);
      }
    }
  }

  return dates;
}

function generateMonthlyDates(
  firstPaycheckDate: string,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dates: string[] = [];
  const anchor = parseISODate(firstPaycheckDate);
  const anchorDay = anchor.day;
  const start = parseISODate(rangeStart);
  const end = parseISODate(rangeEnd);

  for (let year = start.year; year <= end.year; year++) {
    const monthStart = year === start.year ? start.month : 1;
    const monthEnd = year === end.year ? end.month : 12;

    for (let month = monthStart; month <= monthEnd; month++) {
      const day = clampToMonthEnd(year, month, anchorDay);
      const iso = formatISODate(year, month, day);

      if (compareISO(iso, rangeStart) >= 0 && compareISO(iso, rangeEnd) <= 0) {
        dates.push(iso);
      }
    }
  }

  return dates;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns sorted ISO date strings for all paycheck dates within the given range
 * (inclusive on both ends).
 *
 * - `bi-weekly` / `weekly`: rolling intervals from the anchor date.
 * - `semi-monthly`: uses `semiMonthlyDays.first` and `.second`; clamps to end of month.
 * - `monthly`: uses the anchor day-of-month; clamps to end of month.
 * - `quarterly` / `yearly`: treated as monthly (one paycheck per period from anchor).
 *
 * All date arithmetic is UTC-based to avoid DST drift.
 */
export function generatePaycheckDates(
  firstPaycheckDate: string,
  frequency: PayFrequency,
  rangeStart: string,
  rangeEnd: string,
  semiMonthlyDays?: SemiMonthlyDays,
): string[] {
  if (!firstPaycheckDate || compareISO(rangeStart, rangeEnd) > 0) {
    return [];
  }

  switch (frequency) {
    case 'bi-weekly':
      return generateBiWeeklyDates(firstPaycheckDate, rangeStart, rangeEnd);

    case 'weekly':
      return generateWeeklyDates(firstPaycheckDate, rangeStart, rangeEnd);

    case 'semi-monthly': {
      const days = semiMonthlyDays ?? { first: 1, second: 15 };
      return generateSemiMonthlyDates(rangeStart, rangeEnd, days);
    }

    case 'monthly':
    case 'quarterly':
    case 'yearly':
      return generateMonthlyDates(firstPaycheckDate, rangeStart, rangeEnd);

    default:
      return [];
  }
}

/**
 * Returns the number of paychecks that fall within the given calendar month.
 * `month` is 1-based (January = 1).
 */
export function getPaychecksInMonth(
  firstPaycheckDate: string,
  frequency: PayFrequency,
  year: number,
  month: number,
  semiMonthlyDays?: SemiMonthlyDays,
): number {
  const rangeStart = formatISODate(year, month, 1);
  const rangeEnd = formatISODate(year, month, daysInMonth(year, month));
  return generatePaycheckDates(firstPaycheckDate, frequency, rangeStart, rangeEnd, semiMonthlyDays).length;
}

/**
 * Returns the number of paychecks that fall within the given calendar quarter.
 * `quarter` is 1-based (Q1 = 1, Q4 = 4).
 */
export function getPaychecksInQuarter(
  firstPaycheckDate: string,
  frequency: PayFrequency,
  year: number,
  quarter: number,
  semiMonthlyDays?: SemiMonthlyDays,
): number {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const rangeStart = formatISODate(year, startMonth, 1);
  const rangeEnd = formatISODate(year, endMonth, daysInMonth(year, endMonth));
  return generatePaycheckDates(firstPaycheckDate, frequency, rangeStart, rangeEnd, semiMonthlyDays).length;
}

/**
 * Returns the minimum number of paychecks that fall in any single calendar month
 * across all 12 months of the given year. Useful for computing the worst-case
 * buffer needed for the stable account allocation strategy.
 */
export function getMinPaychecksInMonth(
  firstPaycheckDate: string,
  frequency: PayFrequency,
  year: number,
  semiMonthlyDays?: SemiMonthlyDays,
): number {
  let min = Infinity;
  for (let month = 1; month <= 12; month++) {
    const count = getPaychecksInMonth(firstPaycheckDate, frequency, year, month, semiMonthlyDays);
    if (count < min) {
      min = count;
    }
  }
  return min === Infinity ? 0 : min;
}

/**
 * Returns a 12-element array of paycheck counts per calendar month for the
 * given year. Index 0 = January, index 11 = December.
 */
export function getPaychecksPerMonthInYear(
  firstPaycheckDate: string,
  frequency: PayFrequency,
  year: number,
  semiMonthlyDays?: SemiMonthlyDays,
): number[] {
  const counts: number[] = [];
  for (let month = 1; month <= 12; month++) {
    counts.push(getPaychecksInMonth(firstPaycheckDate, frequency, year, month, semiMonthlyDays));
  }
  return counts;
}

import { MONTHS_PER_CYCLE } from './constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Normalise any date-like value to UTC midnight so day maths is timezone-safe. */
export function startOfUtcDay(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Add months while clamping the day of month, so a subscription billing on the
 * 31st renews on the 30th/28th in shorter months instead of skipping ahead.
 */
export function addMonthsClamped(value, months) {
  const date = new Date(value);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return target;
}

/**
 * First billing date on or after `from` for a subscription anchored at
 * `billingDate`. A subscription billing today still counts as renewing today.
 */
export function computeNextRenewal(billingDate, billingCycle, from = new Date()) {
  const anchor = startOfUtcDay(billingDate);
  const today = startOfUtcDay(from);
  const stepMonths = MONTHS_PER_CYCLE[billingCycle] ?? 1;

  if (anchor >= today) return anchor;

  const elapsedMonths =
    (today.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - anchor.getUTCMonth());

  let steps = Math.max(0, Math.floor(elapsedMonths / stepMonths));
  let next = addMonthsClamped(anchor, steps * stepMonths);

  // Guard against edge cases (month clamping) and settle on the first date >= today.
  let guard = 0;
  while (next < today && guard < 6000) {
    steps += 1;
    next = addMonthsClamped(anchor, steps * stepMonths);
    guard += 1;
  }
  return next;
}

/** Whole days between today and a future/past date (negative when in the past). */
export function daysUntil(value, from = new Date()) {
  if (!value) return null;
  return Math.round((startOfUtcDay(value) - startOfUtcDay(from)) / DAY_MS);
}

/** Convert any billing cycle cost to its monthly equivalent. */
export function toMonthlyCost(cost, billingCycle) {
  const months = MONTHS_PER_CYCLE[billingCycle] ?? 1;
  return cost / months;
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Months a subscription is active inside a calendar year, counting partial
 * years (kept from the original localStorage app's yearly spend calculation).
 */
export function activeMonthsInYear(startDate, endDate, year) {
  if (!startDate) return 0;

  const start = startOfUtcDay(startDate);
  const end = endDate ? startOfUtcDay(endDate) : new Date(Date.UTC(year, 11, 31));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  const overlapStart = start > yearStart ? start : yearStart;
  const overlapEnd = end < yearEnd ? end : yearEnd;

  if (overlapEnd < overlapStart) return 0;

  return (
    (overlapEnd.getUTCFullYear() - overlapStart.getUTCFullYear()) * 12 +
    (overlapEnd.getUTCMonth() - overlapStart.getUTCMonth()) +
    1
  );
}

import { config } from '../config/env.js';
import {
  activeMonthsInYear,
  computeNextRenewal,
  daysUntil,
  round2,
  toMonthlyCost,
} from './renewal.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Count usage-log entries whose recordedAt falls within the last N days
 * (inclusive of today).
 */
function recentUses(usageLogs, windowDays, now = new Date()) {
  if (!Array.isArray(usageLogs) || usageLogs.length === 0) return 0;
  const cutoff = new Date(now.getTime() - windowDays * DAY_MS);
  return usageLogs.reduce((sum, log) => {
    const at = new Date(log.recordedAt ?? 0);
    return at >= cutoff ? sum + (log.amount ?? 1) : sum;
  }, 0);
}

/** Derived, read-only fields the dashboard and table rely on. */
export function decorateSubscription(subscription, now = new Date()) {
  const doc = typeof subscription.toObject === 'function'
    ? subscription.toObject()
    : { ...subscription };

  // The renewal date is always derived from the billing anchor + cycle. Stored
  // values go stale between writes (a cycle can roll over while the app is
  // idle), so every response recomputes it instead of trusting the document.
  const renewalDate = doc.billingDate
    ? computeNextRenewal(doc.billingDate, doc.billingCycle, now)
    : doc.nextRenewalDate;

  const monthlyCost = round2(toMonthlyCost(doc.cost, doc.billingCycle));
  const renewalInDays = daysUntil(renewalDate, now);
  // The end date is the first day the plan is no longer billed, so a plan that
  // ends today counts as ended rather than renewing today.
  const isEnded = Boolean(doc.endDate) && daysUntil(doc.endDate, now) <= 0;

  // Low-usage is determined by how many times the subscription was used in the
  // last 30 days (from the log), falling back to the raw usageCount for
  // subscriptions that pre-date usage-log tracking.
  const usageLogs = Array.isArray(doc.usageLogs) ? doc.usageLogs : [];
  const recentUsageCount = usageLogs.length > 0
    ? recentUses(usageLogs, 30, now)
    : doc.usageCount ?? 0;

  return {
    ...doc,
    id: String(doc._id ?? doc.id),
    nextRenewalDate: renewalDate,
    monthlyCost,
    yearlyCost: round2(monthlyCost * 12),
    daysUntilRenewal: renewalInDays,
    recentUsageCount,
    isLowUsage: recentUsageCount <= config.lowUsageThreshold - 1,
    isRenewingSoon:
      !isEnded &&
      renewalInDays !== null &&
      renewalInDays >= 0 &&
      renewalInDays <= config.renewalWindowDays,
    isEnded,
  };
}

export function sortByRenewal(a, b) {
  return new Date(a.nextRenewalDate) - new Date(b.nextRenewalDate);
}

/** Whole-year spend for a decorated subscription, using its monthly equivalent. */
export function spendInYear(subscription, year) {
  const months = activeMonthsInYear(
    subscription.billingDate,
    subscription.endDate,
    year
  );
  return subscription.monthlyCost * months;
}

export function nextRenewalFor(subscription, now = new Date()) {
  return computeNextRenewal(subscription.billingDate, subscription.billingCycle, now);
}

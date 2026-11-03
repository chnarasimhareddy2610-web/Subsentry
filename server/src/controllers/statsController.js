import Subscription from '../models/Subscription.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  decorateSubscription,
  nextRenewalFor,
  sortByRenewal,
  spendInYear,
} from '../utils/metrics.js';
import { round2 } from '../utils/renewal.js';

/**
 * Recompute stored renewal dates that have rolled over since the last write,
 * so the persisted data stays truthful without a separate cron job.
 */
async function refreshRenewalDates(subscriptions, now) {
  const operations = [];

  for (const subscription of subscriptions) {
    const fresh = nextRenewalFor(subscription, now);
    if (fresh.getTime() !== new Date(subscription.nextRenewalDate).getTime()) {
      subscription.nextRenewalDate = fresh;
      operations.push({
        updateOne: {
          filter: { _id: subscription._id },
          update: { $set: { nextRenewalDate: fresh } },
        },
      });
    }
  }

  if (operations.length > 0) {
    await Subscription.bulkWrite(operations);
  }
}

export const getDashboardStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const subscriptions = await Subscription.find();
  await refreshRenewalDates(subscriptions, now);

  const decorated = subscriptions.map((subscription) =>
    decorateSubscription(subscription, now)
  );

  const currentYear = now.getUTCFullYear();
  const previousYear = currentYear - 1;

  // Spend and the category mix describe what is still being billed; a lapsed
  // plan stays in the list (with its history) but stops inflating the run rate.
  const active = decorated.filter((item) => !item.isEnded);

  const monthlyExpenditure = round2(
    active.reduce((sum, item) => sum + item.monthlyCost, 0)
  );

  const yearlySpend = round2(
    decorated.reduce((sum, item) => sum + spendInYear(item, currentYear), 0)
  );

  const previousYearSpend = round2(
    decorated.reduce((sum, item) => sum + spendInYear(item, previousYear), 0)
  );

  const upcomingRenewals = decorated
    .filter((item) => item.isRenewingSoon)
    .sort(sortByRenewal);

  const lowUsage = decorated
    .filter((item) => item.isLowUsage && !item.isEnded)
    .sort((a, b) => a.usageCount - b.usageCount);

  const categories = new Map();
  for (const item of active) {
    const entry = categories.get(item.category) ?? {
      category: item.category,
      count: 0,
      monthlyCost: 0,
    };
    entry.count += 1;
    entry.monthlyCost = round2(entry.monthlyCost + item.monthlyCost);
    categories.set(item.category, entry);
  }

  res.json({
    generatedAt: now.toISOString(),
    settings: {
      lowUsageThreshold: config.lowUsageThreshold,
      renewalWindowDays: config.renewalWindowDays,
    },
    totals: {
      subscriptions: decorated.length,
      monthlyExpenditure,
      yearlySpend,
      previousYearSpend,
      upcomingRenewals: upcomingRenewals.length,
      lowUsage: lowUsage.length,
      totalUsage: decorated.reduce((sum, item) => sum + item.usageCount, 0),
    },
    upcomingRenewals,
    lowUsage,
    categoryBreakdown: [...categories.values()].sort(
      (a, b) => b.monthlyCost - a.monthlyCost
    ),
  });
});

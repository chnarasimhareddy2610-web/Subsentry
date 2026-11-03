import Subscription from '../models/Subscription.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decorateSubscription } from '../utils/metrics.js';
import { startOfUtcDay } from '../utils/renewal.js';

const buildPayload = (body) => ({
  name: body.name.trim(),
  service: body.service.trim(),
  category: body.category ?? 'Other',
  cost: Number(body.cost),
  billingCycle: body.billingCycle ?? 'monthly',
  billingDate: body.billingDate,
  endDate: body.endDate || null,
});

async function findOrFail(id) {
  const subscription = await Subscription.findById(id);
  if (!subscription) {
    const error = new Error('Subscription not found');
    error.status = 404;
    throw error;
  }
  return subscription;
}

export const listSubscriptions = asyncHandler(async (_req, res) => {
  const subscriptions = await Subscription.find().sort({ createdAt: -1 });

  // Decorated dates are derived, so sort on those: the stored column can be a
  // cycle behind for subscriptions that rolled over since the last write.
  // Array#sort is stable in Node, so createdAt -1 still breaks ties.
  res.json(
    subscriptions
      .map((subscription) => decorateSubscription(subscription))
      .sort((a, b) => new Date(a.nextRenewalDate) - new Date(b.nextRenewalDate))
  );
});

export const getSubscription = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);
  res.json(decorateSubscription(subscription));
});

export const createSubscription = asyncHandler(async (req, res) => {
  const payload = buildPayload(req.body);
  if (req.body.usageCount !== undefined) {
    payload.usageCount = req.body.usageCount;
  }

  const subscription = await Subscription.create(payload);
  res.status(201).json(decorateSubscription(subscription));
});

export const updateSubscription = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);
  const payload = buildPayload(req.body);

  Object.assign(subscription, payload);

  // Usage is only overwritten when the client actually sends it.
  if (req.body.usageCount !== undefined) {
    subscription.usageCount = req.body.usageCount;
  }

  await subscription.save();
  res.json(decorateSubscription(subscription));
});

export const deleteSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findByIdAndDelete(req.params.id);
  if (!subscription) {
    const error = new Error('Subscription not found');
    error.status = 404;
    throw error;
  }
  res.json({ message: 'Subscription deleted', id: req.params.id });
});

/**
 * End a subscription without deleting it. The stored history stays available,
 * but a plan whose end date has been reached drops out of spend and alerts.
 * Defaults to ending today; an explicit endDate lets the client backdate it.
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);

  subscription.endDate = req.body.endDate ?? startOfUtcDay(new Date());
  await subscription.save();

  res.json(decorateSubscription(subscription));
});

/**
 * Return the full usage log for a single subscription, newest first.
 */
export const getUsageHistory = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);
  const logs = [...(subscription.usageLogs ?? [])].sort(
    (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)
  );
  res.json({ id: req.params.id, logs });
});

/** Record one or more uses and append an entry to the log. */
export const logUsage = asyncHandler(async (req, res) => {
  const amount = req.body.amount ?? 1;
  const note = (req.body.note ?? '').trim().slice(0, 200);
  const subscription = await findOrFail(req.params.id);

  const now = new Date();
  subscription.usageCount += amount;
  subscription.lastUsedAt = now;
  subscription.usageLogs.push({ amount, note, recordedAt: now });

  await subscription.save();

  res.json(decorateSubscription(subscription));
});

/** Set the total usage count directly (does not touch the log). */
export const setUsage = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);

  subscription.usageCount = req.body.count;
  subscription.lastUsedAt = req.body.count > 0 ? new Date() : null;
  await subscription.save();

  res.json(decorateSubscription(subscription));
});

/** Reset usage tracking and clear the log for a fresh tracking period. */
export const resetUsage = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);

  subscription.usageCount = 0;
  subscription.lastUsedAt = null;
  subscription.usageLogs = [];
  await subscription.save();

  res.json(decorateSubscription(subscription));
});

/** Delete a single usage-log entry by its sub-document id. */
export const deleteUsageLog = asyncHandler(async (req, res) => {
  const subscription = await findOrFail(req.params.id);
  const logId = req.params.logId;

  const before = subscription.usageLogs.length;
  subscription.usageLogs = subscription.usageLogs.filter(
    (log) => String(log._id) !== logId
  );

  if (subscription.usageLogs.length === before) {
    const error = new Error('Usage log entry not found');
    error.status = 404;
    throw error;
  }

  // Keep the aggregate count in sync.
  subscription.usageCount = Math.max(0, subscription.usageCount - 1);
  subscription.lastUsedAt =
    subscription.usageLogs.length > 0
      ? subscription.usageLogs.at(-1).recordedAt
      : null;

  await subscription.save();
  res.json(decorateSubscription(subscription));
});

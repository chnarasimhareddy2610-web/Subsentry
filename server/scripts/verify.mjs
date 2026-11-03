/**
 * End-to-end check of the API against a real MongoDB server.
 *
 * By default this starts an ephemeral MongoDB via mongodb-memory-server so the
 * suite is self-contained. Set VERIFY_MONGO_URI to test an existing database.
 *
 *   npm run verify --workspace server
 */
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { computeNextRenewal } from '../src/utils/renewal.js';
import Subscription from '../src/models/Subscription.js';

const results = [];
let failures = 0;

function check(name, condition, details = '') {
  results.push({ name, pass: Boolean(condition), details });
  if (!condition) failures += 1;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : `  ${details}`}`);
}

const isoDay = (date) => date.toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

let memoryServer;
let httpServer;
let origin;
let baseUrl;

async function start() {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (!fs.existsSync(dist)) {
    console.warn('[verify] client/dist is missing; run `npm run build` first for the static-serving checks.');
  }

  let uri = process.env.VERIFY_MONGO_URI;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('subsentry_verify');
  }

  await connectDB(uri);
  await mongoose.connection.dropDatabase();

  httpServer = app.listen(0);
  await new Promise((resolve) => httpServer.once('listening', resolve));
  origin = `http://127.0.0.1:${httpServer.address().port}`;
  baseUrl = `${origin}/api`;
}

async function call(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

async function run() {
  await start();

  const health = await call('GET', '/health');
  check('GET /health reports connected database', health.status === 200 && health.data.database === 'connected', JSON.stringify(health.data));

  // ── Create ───────────────────────────────────────────────────────────
  const anchor = addDays(3);
  const created = await call('POST', '/subscriptions', {
    name: 'Ada Lovelace',
    service: 'Netflix',
    category: 'Entertainment',
    cost: 499,
    billingCycle: 'monthly',
    billingDate: isoDay(anchor),
  });

  check('POST /subscriptions creates a record', created.status === 201, JSON.stringify(created));
  check('Next renewal equals the future billing anchor', isoDay(new Date(created.data.nextRenewalDate)) === isoDay(anchor), created.data?.nextRenewalDate);
  check('New subscription is flagged as renewing soon', created.data.isRenewingSoon === true);
  check('New subscription is flagged as low usage', created.data.isLowUsage === true);

  const id = created.data.id;

  // ── Validation ───────────────────────────────────────────────────────
  const missingFields = await call('POST', '/subscriptions', { category: 'Music' });
  check('Missing required fields return 422', missingFields.status === 422, JSON.stringify(missingFields.data));

  const badCost = await call('POST', '/subscriptions', {
    name: 'A', service: 'B', cost: -10, billingDate: isoDay(addDays(1)),
  });
  check('Negative cost is rejected', badCost.status === 422, JSON.stringify(badCost.data));

  const badDate = await call('POST', '/subscriptions', {
    name: 'A', service: 'B', cost: 10, billingDate: 'not-a-date',
  });
  check('Invalid billing date is rejected', badDate.status === 422, JSON.stringify(badDate.data));

  const badCategory = await call('POST', '/subscriptions', {
    name: 'A', service: 'B', cost: 10, billingDate: isoDay(addDays(1)), category: 'Nonsense',
  });
  check('Unknown category is rejected', badCategory.status === 422, JSON.stringify(badCategory.data));

  const badUsage = await call('POST', `/subscriptions/${id}/usage`, { amount: -3 });
  check('Negative usage increment is rejected', badUsage.status === 422, JSON.stringify(badUsage.data));

  // ── Usage tracking ───────────────────────────────────────────────────
  const used = await call('POST', `/subscriptions/${id}/usage`, { amount: 2 });
  check('POST /usage records uses', used.status === 200 && used.data.usageCount === 2, JSON.stringify(used.data));

  const fetched = await call('GET', `/subscriptions/${id}`);
  check('Usage persists in MongoDB', fetched.data.usageCount === 2, JSON.stringify(fetched.data));

  const setUsage = await call('PUT', `/subscriptions/${id}/usage`, { count: 7 });
  check('PUT /usage sets the exact count', setUsage.status === 200 && setUsage.data.usageCount === 7);

  const reset = await call('DELETE', `/subscriptions/${id}/usage`);
  check('DELETE /usage resets the count', reset.status === 200 && reset.data.usageCount === 0);

  await call('POST', `/subscriptions/${id}/usage`, { amount: 1 });

  // ── Update / recompute ───────────────────────────────────────────────
  const updated = await call('PUT', `/subscriptions/${id}`, {
    name: 'Ada Lovelace',
    service: 'Netflix Premium',
    category: 'Entertainment',
    cost: 1200,
    billingCycle: 'yearly',
    billingDate: isoDay(addDays(40)),
    usageCount: 1,
  });
  check('PUT /subscriptions updates fields', updated.status === 200 && updated.data.service === 'Netflix Premium' && updated.data.cost === 1200, JSON.stringify(updated.data));
  check('Monthly cost normalises a yearly plan (1200 / 12)', updated.data.monthlyCost === 100);
  check('Renewal date follows the new cycle anchor', isoDay(new Date(updated.data.nextRenewalDate)) === isoDay(addDays(40)));

  // ── Renewal alerts + stats ───────────────────────────────────────────
  const soon = await call('POST', '/subscriptions', {
    name: 'Grace Hopper',
    service: 'GitHub Copilot',
    category: 'Productivity',
    cost: 900,
    billingCycle: 'monthly',
    billingDate: isoDay(addDays(2)),
    usageCount: 8,
  });
  check('Second subscription created', soon.status === 201, JSON.stringify(soon.data));

  const farAway = await call('POST', '/subscriptions', {
    name: 'Linus',
    service: 'Annual Backup',
    category: 'Other',
    cost: 1200,
    billingCycle: 'yearly',
    billingDate: isoDay(addDays(100)),
    usageCount: 0,
  });
  check('Third subscription created', farAway.status === 201);

  const stats = await call('GET', '/subscriptions/stats');
  check('Stats endpoint responds', stats.status === 200, JSON.stringify(stats.data));

  const upcomingIds = stats.data.upcomingRenewals.map((item) => item.id);
  check('7-day renewal tracker includes only near renewals',
    upcomingIds.includes(soon.data.id) && !upcomingIds.includes(id) && !upcomingIds.includes(farAway.data.id),
    JSON.stringify(upcomingIds));

  check('Dashboard counts subscriptions', stats.data.totals.subscriptions === 3, String(stats.data.totals.subscriptions));
  check('Monthly expenditure sums normalised costs',
    stats.data.totals.monthlyExpenditure === 100 + 900 + 100,
    String(stats.data.totals.monthlyExpenditure));
  check('Low usage list has the right members',
    stats.data.lowUsage.length === 2 &&
      stats.data.lowUsage.some((item) => item.id === id) &&
      stats.data.lowUsage.some((item) => item.id === farAway.data.id),
    JSON.stringify(stats.data.lowUsage.map((item) => item.service)));

  // ── Cancelling a plan ────────────────────────────────────────────────
  const cancellable = await call('POST', '/subscriptions', {
    name: 'Katherine Johnson', service: 'Streaming Plus', category: 'Entertainment',
    cost: 500, billingCycle: 'monthly', billingDate: isoDay(addDays(2)), usageCount: 1,
  });
  check('Fourth subscription created for the cancel check', cancellable.status === 201, JSON.stringify(cancellable.data));

  const beforeCancel = await call('GET', '/subscriptions/stats');
  const beforeMonthly = beforeCancel.data.totals.monthlyExpenditure;
  const beforeYear = beforeCancel.data.totals.yearlySpend;
  const beforeCategoryCount = beforeCancel.data.categoryBreakdown.reduce(
    (sum, item) => sum + item.count, 0
  );
  const upcomingBefore = beforeCancel.data.upcomingRenewals.map((item) => item.id);
  const lowBefore = beforeCancel.data.lowUsage.map((item) => item.id);

  check('Renewal tracker lists a plan due in 2 days', upcomingBefore.includes(cancellable.data.id), JSON.stringify(upcomingBefore));
  check('Low usage panel flags a plan with 1 use', lowBefore.includes(cancellable.data.id), JSON.stringify(lowBefore));

  const cancelled = await call('POST', `/subscriptions/${cancellable.data.id}/cancel`);
  check('POST /cancel ends a subscription', cancelled.status === 200 && cancelled.data.isEnded === true, JSON.stringify(cancelled.data));
  check('Cancel defaults to an end date of today', isoDay(new Date(cancelled.data.endDate)) === isoDay(new Date()), String(cancelled.data.endDate));
  check('Cancel keeps the record instead of deleting it', cancelled.data.usageCount === 1 && cancelled.data.service === 'Streaming Plus');

  const afterCancel = await call('GET', '/subscriptions/stats');
  const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  check('Ended plan stops counting toward monthly expenditure',
    afterCancel.data.totals.monthlyExpenditure === round2(beforeMonthly - 500),
    `${beforeMonthly} -> ${afterCancel.data.totals.monthlyExpenditure}`);
  // The plan billed 2 months before it ended, so yearly spend keeps exactly
  // those months and stops: nothing is added for the lapsed period.
  check('Ended plan stops adding to yearly spend',
    afterCancel.data.totals.yearlySpend === round2(beforeYear - 2 * 500),
    `${beforeYear} -> ${afterCancel.data.totals.yearlySpend}`);
  check('Ended plan drops out of the 7-day renewal tracker',
    !afterCancel.data.upcomingRenewals.some((item) => item.id === cancellable.data.id));
  check('Ended plan drops out of low usage detection',
    !afterCancel.data.lowUsage.some((item) => item.id === cancellable.data.id));
  const categoryCount = afterCancel.data.categoryBreakdown.reduce((sum, item) => sum + item.count, 0);
  check('Category breakdown counts only active plans',
    categoryCount === beforeCategoryCount - 1,
    `${beforeCategoryCount} -> ${categoryCount}`);

  const endedList = await call('GET', '/subscriptions');
  const endedRow = endedList.data.find((item) => item.id === cancellable.data.id);
  check('List keeps the ended plan marked as ended', Boolean(endedRow) && endedRow.isEnded === true, JSON.stringify(endedRow?.isEnded));

  const backdated = await call('POST', `/subscriptions/${cancellable.data.id}/cancel`, {
    endDate: isoDay(addDays(-3)),
  });
  check('Cancel accepts an explicit past end date', backdated.status === 200 && isoDay(new Date(backdated.data.endDate)) === isoDay(addDays(-3)), JSON.stringify(backdated.data));

  const badEndDate = await call('POST', `/subscriptions/${cancellable.data.id}/cancel`, {
    endDate: 'not-a-date',
  });
  check('Malformed end date is rejected', badEndDate.status === 422, JSON.stringify(badEndDate.data));

  const badCancelId = await call('POST', '/subscriptions/not-an-id/cancel');
  check('Malformed id on cancel returns 422', badCancelId.status === 422, JSON.stringify(badCancelId.data));

  const missingCancel = await call('POST', '/subscriptions/000000000000000000000000/cancel');
  check('Unknown id on cancel returns 404', missingCancel.status === 404, JSON.stringify(missingCancel.data));

  const cleaned = await call('DELETE', `/subscriptions/${cancellable.data.id}`);
  check('Cancel check record cleaned up', cleaned.status === 200);

  // ── Renewal math ─────────────────────────────────────────────────────
  const monthlyRoll = computeNextRenewal('2026-01-31', 'monthly', new Date('2026-02-15T00:00:00Z'));
  check('Monthly renewal clamps month-end (Jan 31 -> Feb 28)', isoDay(monthlyRoll) === '2026-02-28', isoDay(monthlyRoll));

  const yearlyRoll = computeNextRenewal('2024-03-10', 'yearly', new Date('2026-01-01T00:00:00Z'));
  check('Yearly renewal rolls to the next anniversary', isoDay(yearlyRoll) === '2026-03-10', isoDay(yearlyRoll));

  const quarterlyRoll = computeNextRenewal('2026-01-15', 'quarterly', new Date('2026-05-01T00:00:00Z'));
  check('Quarterly renewal rolls in 3-month steps', isoDay(quarterlyRoll) === '2026-07-15', isoDay(quarterlyRoll));

  // ── Delete ───────────────────────────────────────────────────────────
  const deleted = await call('DELETE', `/subscriptions/${id}`);
  check('DELETE /subscriptions removes the record', deleted.status === 200);

  const missing = await call('GET', `/subscriptions/${id}`);
  check('Deleted subscription returns 404', missing.status === 404);

  const list = await call('GET', '/subscriptions');
  check('List reflects the deletion', list.status === 200 && list.data.length === 2 && !list.data.some((item) => item.id === id), String(list.data?.length));

  const invalidId = await call('GET', '/subscriptions/not-an-id');
  check('Malformed id returns 422', invalidId.status === 422, JSON.stringify(invalidId.data));

  const badJson = await fetch(`${baseUrl}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"name": ',
  });
  check('Malformed JSON body returns 400', badJson.status === 400, `status ${badJson.status}`);

  // ── Renewal tracking survives a cycle rollover ───────────────────────
  // A subscription only rewrites its stored date on save, so a row left
  // untouched across a renewal must still report the upcoming cycle.
  const stale = await call('POST', '/subscriptions', {
    name: 'Barbara Liskov',
    service: 'Stale Cycle',
    category: 'Other',
    cost: 300,
    billingCycle: 'monthly',
    billingDate: isoDay(addDays(-40)),
  });
  await Subscription.updateOne(
    { _id: stale.data.id },
    { $set: { nextRenewalDate: addDays(-5) } }
  );

  const staleList = await call('GET', '/subscriptions');
  const staleRow = staleList.data.find((item) => item.id === stale.data.id);
  check('List recomputes a stale renewal date', Boolean(staleRow) && staleRow.daysUntilRenewal >= 0, JSON.stringify(staleRow?.daysUntilRenewal));
  check(
    'Rolled renewal date stays on the billing anchor',
    isoDay(new Date(staleRow.nextRenewalDate)) === isoDay(computeNextRenewal(stale.data.billingDate, 'monthly')),
    isoDay(new Date(staleRow.nextRenewalDate))
  );

  const staleGet = await call('GET', `/subscriptions/${stale.data.id}`);
  check('Single fetch recomputes a stale renewal date', staleGet.data.daysUntilRenewal >= 0, String(staleGet.data?.daysUntilRenewal));

  // ── Built React app ──────────────────────────────────────────────────
  const page = await fetch(`${origin}/`);
  const html = await page.text();
  check('Express serves the built React app', page.status === 200 && html.includes('<div id="root">') && html.includes('/assets/'), `status ${page.status}`);

  const assetPath = /<script[^>]+src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
  const asset = assetPath ? await fetch(`${origin}${assetPath}`) : null;
  check('Built JS bundle is served', Boolean(asset?.ok) && (asset.headers.get('content-type') || '').includes('javascript'), assetPath || 'asset not referenced');

  const spaFallback = await fetch(`${origin}/some/client/route`);
  check('SPA fallback returns the app shell', spaFallback.status === 200 && (await spaFallback.text()).includes('<div id="root">'));

  const unknownRoute = await call('GET', '/does-not-exist');
  check('Unknown route returns JSON 404', unknownRoute.status === 404 && typeof unknownRoute.data?.message === 'string');
}

try {
  await run();
} catch (error) {
  console.error('\nVerification crashed:', error);
  failures += 1;
} finally {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  await disconnectDB();
  if (memoryServer) await memoryServer.stop();
}

console.log(`\n${results.filter((item) => item.pass).length}/${results.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);

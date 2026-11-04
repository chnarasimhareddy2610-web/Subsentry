import CategoryBreakdown from './CategoryBreakdown.jsx';
import LeakSuggestions from './LeakSuggestions.jsx';
import LowUsagePanel from './LowUsagePanel.jsx';
import { formatCurrency, formatInteger } from '../format.js';
import { EmptyState, PageHeader, SkeletonLines } from './ui.jsx';

export default function InsightsView({
  stats,
  subscriptions,
  ready,
  loading,
  onAdd,
  onViewHistory,
}) {
  const active = subscriptions.filter((item) => !item.isEnded);
  const lowUsage = stats?.lowUsage ?? [];

  const recentTotal = active.reduce(
    (sum, item) => sum + (item.recentUsageCount ?? item.usageCount ?? 0),
    0
  );
  const waste = lowUsage.reduce((sum, item) => sum + (item.monthlyCost ?? 0), 0);
  const maxUses = active.reduce(
    (max, item) => Math.max(max, item.recentUsageCount ?? item.usageCount ?? 0),
    1
  );

  const usageRows = [...active].sort(
    (a, b) =>
      (b.recentUsageCount ?? b.usageCount ?? 0) - (a.recentUsageCount ?? a.usageCount ?? 0)
  );

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="What the ledger says."
        subtitle="Usage is the honest measure of value. These figures show which plans earn their cost and which are quietly draining it."
      />

      {!ready && (
        <div className="panel" aria-busy="true">
          <SkeletonLines lines={6} widths={['w40', 'w90', 'w70', 'w90', 'w70', 'w40']} />
        </div>
      )}

      {ready && subscriptions.length === 0 && (
        <section className="panel">
          <EmptyState
            center
            title="Nothing to analyse yet"
            text="Add a subscription and log a few uses — insights appear once there is something to read."
            action={
              <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
                Add subscription
              </button>
            }
          />
        </section>
      )}

      {ready && subscriptions.length > 0 && (
        <div className="section-stack">
          <section className="metrics-strip" aria-label="Insight totals">
            <div className="metric">
              <p className="metric__label">Monthly commitment</p>
              <p className="metric__value">
                {formatCurrency(stats?.totals?.monthlyExpenditure ?? 0)}
              </p>
              <p className="metric__meta">{active.length} active plans</p>
            </div>
            <div className="metric">
              <p className="metric__label">Potentially wasted</p>
              <p className="metric__value">{formatCurrency(waste)}</p>
              <p className={`metric__meta${waste > 0 ? ' is-warn' : ' is-good'}`}>
                {lowUsage.length} underused {lowUsage.length === 1 ? 'plan' : 'plans'}
              </p>
            </div>
            <div className="metric">
              <p className="metric__label">Uses logged · 30d</p>
              <p className="metric__value">{formatInteger(recentTotal)}</p>
              <p className="metric__meta">
                {formatInteger(stats?.totals?.totalUsage ?? 0)} recorded all time
              </p>
            </div>
            <div className="metric">
              <p className="metric__label">Categories in use</p>
              <p className="metric__value">{formatInteger(stats?.categoryBreakdown?.length ?? 0)}</p>
              <p className="metric__meta">Across the active ledger</p>
            </div>
          </section>

          <div className="two-col">
            <section className="panel" aria-labelledby="usage-by-plan">
              <div className="panel-head">
                <h2 className="panel-title" id="usage-by-plan">
                  Usage by plan
                </h2>
                <span className="panel-sub">Last 30 days</span>
              </div>

              {loading ? (
                <SkeletonLines lines={4} widths={['w90', 'w70', 'w90', 'w40']} />
              ) : (
                <div className="usage-bars">
                  {usageRows.map((item) => {
                    const recent = item.recentUsageCount ?? item.usageCount ?? 0;
                    const width = Math.max((recent / maxUses) * 100, 3);
                    return (
                      <div className="usage-bar-row" key={item.id}>
                        <span className="timeline-meta" title={item.service}>
                          {item.service}
                        </span>
                        <span className="usage-bar-track" aria-hidden="true">
                          <span
                            className={`usage-bar-fill${item.isLowUsage ? ' is-low' : ''}`}
                            style={{ width: `${width}%` }}
                          />
                        </span>
                        <span className="cell-num">
                          {recent} {recent === 1 ? 'use' : 'uses'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="panel-note">
                Terracotta bars fall below {stats?.settings?.lowUsageThreshold ?? 3} uses in 30 days.
              </p>
            </section>

            <LowUsagePanel
              items={lowUsage}
              threshold={stats?.settings?.lowUsageThreshold ?? 3}
              ready={ready}
              onViewHistory={onViewHistory}
            />
          </div>

          <div className="two-col">
            <CategoryBreakdown
              categories={stats?.categoryBreakdown ?? []}
              ready={ready}
              total={stats?.totals?.monthlyExpenditure ?? 0}
            />
            <LeakSuggestions subscriptions={subscriptions} stats={stats} />
          </div>
        </div>
      )}
    </>
  );
}

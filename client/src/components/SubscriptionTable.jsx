import { cycleMeta } from '../constants.js';
import { formatCurrency, formatDate, renewalLabel } from '../format.js';
import { IconHistory, IconReset } from './icons.jsx';
import { EmptyState, SkeletonLines } from './ui.jsx';

function Actions({ subscription, busy, onEdit, onDelete, onEnd, compact = false }) {
  return (
    <div className="row-actions">
      {!subscription.isEnded && (
        <button
          type="button"
          className="row-action"
          onClick={() => onEnd(subscription)}
          disabled={busy}
          title="End this subscription from today"
        >
          End
        </button>
      )}
      <button
        type="button"
        className="row-action"
        onClick={() => onEdit(subscription)}
        disabled={busy}
        aria-label={`Edit ${subscription.service}`}
      >
        {compact ? 'Edit' : 'Edit'}
      </button>
      <button
        type="button"
        className="row-action is-danger"
        onClick={() => onDelete(subscription)}
        disabled={busy}
        aria-label={`Delete ${subscription.service}`}
      >
        Delete
      </button>
    </div>
  );
}

function Usage({ subscription, busy, onLogUsage, onViewHistory, onResetUsage }) {
  const recent = subscription.recentUsageCount ?? subscription.usageCount ?? 0;
  return (
    <div className="usage-cell">
      <span
        className={`usage-count${subscription.isLowUsage ? ' is-low' : ''}`}
        title={subscription.isLowUsage ? 'Low usage' : 'Used in the last 30 days'}
      >
        {recent}
      </span>
      <div className="usage-actions">
        <button
          type="button"
          className="usage-btn"
          onClick={() => onLogUsage(subscription.id)}
          disabled={busy}
          title="Record one use"
          aria-label={`Record a use of ${subscription.service}`}
        >
          +1
        </button>
        <button
          type="button"
          className="usage-btn"
          onClick={() => onViewHistory(subscription)}
          disabled={busy}
          title="View usage history"
          aria-label={`View usage history for ${subscription.service}`}
        >
          <IconHistory width={14} height={14} />
        </button>
        <button
          type="button"
          className="usage-btn"
          onClick={() => onResetUsage(subscription.id)}
          disabled={busy || subscription.usageCount === 0}
          title="Reset usage count"
          aria-label={`Reset usage for ${subscription.service}`}
        >
          <IconReset width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

function Renewal({ subscription }) {
  if (subscription.isEnded) {
    return (
      <div className="cell-renewal">
        <span className="cell-muted">{formatDate(subscription.endDate)}</span>
        <span className="tag">Ended</span>
      </div>
    );
  }

  const urgent = subscription.daysUntilRenewal !== null && subscription.daysUntilRenewal <= 3;

  return (
    <div className="cell-renewal">
      <span className="cell-num">{formatDate(subscription.nextRenewalDate)}</span>
      <span className={`tag${urgent ? ' tag--urgent' : ''}`}>
        {renewalLabel(subscription.daysUntilRenewal)}
      </span>
    </div>
  );
}

export default function SubscriptionTable({
  subscriptions,
  onEdit,
  onDelete,
  onEnd,
  onLogUsage,
  onResetUsage,
  onViewHistory,
  busyId,
  loading,
  limit,
  onViewAll,
  toolbar,
  emptyState,
}) {
  const rows = typeof limit === 'number' ? subscriptions.slice(0, limit) : subscriptions;
  const hidden = subscriptions.length - rows.length;

  return (
    <section className="panel panel--flush" aria-labelledby="ledger-title">
      <div className="panel-head">
        <h2 className="panel-title" id="ledger-title">
          Subscription ledger
        </h2>
        {onViewAll && hidden > 0 ? (
          <button type="button" className="btn-link" onClick={onViewAll}>
            View all {subscriptions.length}
          </button>
        ) : (
          <span className="panel-sub">
            {subscriptions.length} {subscriptions.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {toolbar && <div className="ledger-toolbar">{toolbar}</div>}

      {loading && (
        <div style={{ padding: '0 26px 20px' }} role="status" aria-live="polite">
          <span className="sr-only">Loading subscriptions</span>
          <SkeletonLines lines={5} widths={['w90', 'w70', 'w90', 'w40', 'w70']} />
        </div>
      )}

      {!loading && subscriptions.length === 0 && (
        <div style={{ padding: '0 26px' }}>
          {emptyState ?? (
            <EmptyState
              title="The ledger is empty"
              text="Add your first subscription to start tracking monthly commitment, renewals and usage."
            />
          )}
        </div>
      )}

      {!loading && subscriptions.length > 0 && (
        <>
          <div className="ledger-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Category</th>
                  <th scope="col">Cycle</th>
                  <th scope="col">Monthly</th>
                  <th scope="col">Next renewal</th>
                  <th scope="col">Usage · 30d</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((subscription) => {
                  const cycle = cycleMeta(subscription.billingCycle);
                  const busy = busyId === subscription.id;
                  return (
                    <tr key={subscription.id}>
                      <td>
                        <div className="cell-service">
                          <span className="service-name">{subscription.service}</span>
                          <span className="service-plan">
                            {subscription.name} · {formatCurrency(subscription.cost)} {cycle.short}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-muted">{subscription.category}</span>
                      </td>
                      <td>
                        <span className="cell-muted">{cycle.label}</span>
                      </td>
                      <td>
                        <span className="cell-num">{formatCurrency(subscription.monthlyCost)}</span>
                      </td>
                      <td>
                        <Renewal subscription={subscription} />
                      </td>
                      <td>
                        <Usage
                          subscription={subscription}
                          busy={busy}
                          onLogUsage={onLogUsage}
                          onViewHistory={onViewHistory}
                          onResetUsage={onResetUsage}
                        />
                      </td>
                      <td>
                        <Actions
                          subscription={subscription}
                          busy={busy}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onEnd={onEnd}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="ledger-cards">
              {rows.map((subscription) => {
                const cycle = cycleMeta(subscription.billingCycle);
                const busy = busyId === subscription.id;
                const recent = subscription.recentUsageCount ?? subscription.usageCount ?? 0;
                return (
                  <li className="ledger-card" key={subscription.id}>
                    <div className="ledger-card__top">
                      <div className="cell-service">
                        <span className="service-name">{subscription.service}</span>
                        <span className="service-plan">{subscription.name}</span>
                      </div>
                      <span className="ledger-card__cost">
                        {formatCurrency(subscription.monthlyCost)}
                        <span className="cell-muted"> /mo</span>
                      </span>
                    </div>

                    <div className="ledger-card__grid">
                      <div>
                        <span className="ledger-card__label">Category</span>
                        <span className="ledger-card__value">{subscription.category}</span>
                      </div>
                      <div>
                        <span className="ledger-card__label">Cycle</span>
                        <span className="ledger-card__value">{cycle.label}</span>
                      </div>
                      <div>
                        <span className="ledger-card__label">
                          {subscription.isEnded ? 'Ended' : 'Next renewal'}
                        </span>
                        <span className="ledger-card__value">
                          {subscription.isEnded
                            ? formatDate(subscription.endDate)
                            : formatDate(subscription.nextRenewalDate)}
                          {!subscription.isEnded && ` · ${renewalLabel(subscription.daysUntilRenewal)}`}
                        </span>
                      </div>
                      <div>
                        <span className="ledger-card__label">Usage · 30d</span>
                        <span
                          className={`ledger-card__value${subscription.isLowUsage ? ' is-low' : ''}`}
                          style={subscription.isLowUsage ? { color: 'var(--terracotta-ink)' } : undefined}
                        >
                          {recent} {recent === 1 ? 'use' : 'uses'}
                        </span>
                      </div>
                    </div>

                    <div className="ledger-card__actions">
                      <Usage
                        subscription={subscription}
                        busy={busy}
                        onLogUsage={onLogUsage}
                        onViewHistory={onViewHistory}
                        onResetUsage={onResetUsage}
                      />
                      <Actions
                        subscription={subscription}
                        busy={busy}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onEnd={onEnd}
                        compact
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {hidden > 0 && onViewAll && (
            <div style={{ padding: '12px 26px 18px', borderTop: '1px solid var(--stone-soft)' }}>
              <button type="button" className="btn-link" onClick={onViewAll}>
                {hidden} more {hidden === 1 ? 'subscription' : 'subscriptions'} in the ledger
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

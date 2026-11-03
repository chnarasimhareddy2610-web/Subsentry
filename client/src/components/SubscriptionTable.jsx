import { cycleMeta } from '../constants.js';
import { categoryClass, formatCurrency, formatDate, renewalLabel } from '../format.js';

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
}) {
  return (
    <section className="card glass">
      <h2><span className="icon" aria-hidden="true">📊</span> Expenditure Dashboard</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Service</th>
              <th>Cost</th>
              <th>Cycle</th>
              <th>Billing Date</th>
              <th>Next Renewal</th>
              <th>Usage (30d)</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="table-empty">Loading subscriptions…</td>
              </tr>
            )}

            {!loading && subscriptions.length === 0 && (
              <tr>
                <td colSpan={9} className="table-empty">
                  No subscriptions yet — add your first one above to start tracking.
                </td>
              </tr>
            )}

            {!loading && subscriptions.map((subscription, index) => {
              const cycle = cycleMeta(subscription.billingCycle);
              const busy = busyId === subscription.id;
              const recentCount = subscription.recentUsageCount ?? subscription.usageCount;

              return (
                <tr key={subscription.id} style={{ animationDelay: `${index * 0.05}s` }}>
                  <td><strong>{subscription.name}</strong></td>
                  <td>{subscription.service}</td>
                  <td>
                    <strong className="cost-value">{formatCurrency(subscription.cost)}</strong>
                    <span className="cost-cycle">{cycle.short}</span>
                  </td>
                  <td><span className="cycle-pill">{cycle.label}</span></td>
                  <td>{formatDate(subscription.billingDate)}</td>
                  <td>
                    <div className="renewal-cell">
                      <span>{formatDate(subscription.nextRenewalDate)}</span>
                      <span
                        className={`renewal-badge${
                          subscription.isRenewingSoon ? ' urgent' : ''
                        }${subscription.isEnded ? ' ended' : ''}`}
                      >
                        {subscription.isEnded
                          ? 'Ended'
                          : renewalLabel(subscription.daysUntilRenewal)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="usage-cell">
                      <span className={`usage-badge${subscription.isLowUsage ? ' low' : ''}`}>
                        {recentCount} {recentCount === 1 ? 'use' : 'uses'}
                      </span>
                      <div className="usage-actions">
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => onLogUsage(subscription.id)}
                          disabled={busy}
                          title="Record one use"
                          aria-label={`Record a use of ${subscription.service}`}
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => onViewHistory(subscription)}
                          disabled={busy}
                          title="View usage history"
                          aria-label={`View usage history for ${subscription.service}`}
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          className="mini-btn ghost"
                          onClick={() => onResetUsage(subscription.id)}
                          disabled={busy || (subscription.usageCount === 0)}
                          title="Reset usage count"
                          aria-label={`Reset usage for ${subscription.service}`}
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`category-pill ${categoryClass(subscription.category)}`}>
                      {subscription.category}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {!subscription.isEnded && (
                        <button
                          type="button"
                          className="end-btn"
                          onClick={() => onEnd(subscription)}
                          disabled={busy}
                          title="End this subscription from today"
                        >
                          End
                        </button>
                      )}
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => onEdit(subscription)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => onDelete(subscription)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

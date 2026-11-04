import { CURRENCY_SYMBOL, formatAmount, formatCurrency, formatDate } from '../format.js';

export default function CommitmentPanel({ stats, subscriptions = [], ready }) {
  const totals = stats?.totals;
  const windowDays = stats?.settings?.renewalWindowDays ?? 7;

  const active = subscriptions.filter((item) => !item.isEnded);
  const monthly = totals?.monthlyExpenditure ?? 0;
  const annual = monthly * 12;
  const average = active.length > 0 ? monthly / active.length : 0;

  const nextRenewal = active
    .filter((item) => item.nextRenewalDate)
    .sort((a, b) => new Date(a.nextRenewalDate) - new Date(b.nextRenewalDate))[0];

  if (!ready) {
    return (
      <section className="panel commitment" aria-busy="true">
        <div>
          <p className="commitment__label">Monthly commitment</p>
          <div className="skeleton" style={{ height: 56, width: '58%', marginBottom: 14 }} />
          <div className="skeleton sk-line w40" />
        </div>
        <div className="commitment__meta">
          <div className="meta-pair">
            <div className="skeleton sk-line w70" />
            <div className="skeleton sk-line w40" />
          </div>
          <div className="meta-pair">
            <div className="skeleton sk-line w70" />
            <div className="skeleton sk-line w40" />
          </div>
          <div className="meta-pair">
            <div className="skeleton sk-line w70" />
            <div className="skeleton sk-line w40" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel commitment" aria-label="Monthly recurring commitment">
      <div>
        <p className="commitment__label">Monthly commitment</p>
        <p className="commitment__value">
          <span className="currency" aria-hidden="true">
            {CURRENCY_SYMBOL}
          </span>
          {formatAmount(monthly)}
        </p>
        <p className="commitment__annual">
          <span>{formatCurrency(annual)} a year</span>
          <span aria-hidden="true" className="muted">
            ·
          </span>
          <span>
            {active.length} active {active.length === 1 ? 'plan' : 'plans'}
          </span>
        </p>
      </div>

      <div className="commitment__meta">
        <div className="meta-pair">
          <span className="meta-label">Next charge</span>
          <span className="meta-value">
            {nextRenewal ? formatDate(nextRenewal.nextRenewalDate) : '—'}
          </span>
        </div>
        <div className="meta-pair">
          <span className="meta-label">Due in {windowDays} days</span>
          <span className={`meta-value${totals?.upcomingRenewals > 0 ? ' is-brass' : ''}`}>
            {totals?.upcomingRenewals ?? 0}
          </span>
        </div>
        <div className="meta-pair">
          <span className="meta-label">Average plan</span>
          <span className="meta-value">{formatCurrency(average)}</span>
        </div>
      </div>
    </section>
  );
}

import { formatCurrency, formatDate, renewalLabel } from '../format.js';

export default function RenewalTracker({ renewals = [], windowDays = 7, ready }) {
  return (
    <section className="card glass panel-card">
      <h2>
        <span className="icon" aria-hidden="true">⏰</span>
        Renewal Tracker
        <span className="panel-hint">next {windowDays} days</span>
      </h2>

      {!ready && <p className="empty-state">Loading renewals…</p>}

      {ready && renewals.length === 0 && (
        <p className="empty-state">
          Nothing renews in the next {windowDays} days. You&apos;re all clear. ✨
        </p>
      )}

      {ready && renewals.length > 0 && (
        <ul className="tracker-list">
          {renewals.map((renewal) => (
            <li className="tracker-item" key={renewal.id}>
              <div className="tracker-main">
                <strong>{renewal.service}</strong>
                <span className="tracker-meta">
                  {renewal.name} · {formatCurrency(renewal.cost)} · {formatDate(renewal.nextRenewalDate)}
                </span>
              </div>
              <span
                className={`renewal-badge urgent${
                  renewal.daysUntilRenewal === 0 ? ' today' : ''
                }`}
              >
                {renewalLabel(renewal.daysUntilRenewal)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

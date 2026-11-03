import { formatCurrency } from '../format.js';

export default function LowUsagePanel({ items = [], threshold = 3, ready }) {
  return (
    <section className="card glass panel-card">
      <h2>
        <span className="icon" aria-hidden="true">📉</span>
        Low Usage Detection
        <span className="panel-hint">under {threshold} uses / 30 days</span>
      </h2>

      {!ready && <p className="empty-state">Checking usage…</p>}

      {ready && items.length === 0 && (
        <p className="empty-state">
          Every subscription has healthy usage. Nice work keeping the leaks closed. 🎉
        </p>
      )}

      {ready && items.length > 0 && (
        <ul className="tracker-list">
          {items.map((item) => {
            const recentCount = item.recentUsageCount ?? item.usageCount;
            return (
              <li className="tracker-item" key={item.id}>
                <div className="tracker-main">
                  <strong>{item.service}</strong>
                  <span className="tracker-meta">
                    {item.name} · {formatCurrency(item.monthlyCost)}/mo
                  </span>
                </div>
                <span className="usage-badge low">
                  {recentCount} {recentCount === 1 ? 'use' : 'uses'} (30d)
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="panel-footnote">
        Log a use with the <strong>+1</strong> button in the table whenever you open a
        subscription. Plans with fewer than {threshold} uses in 30 days are flagged here.
      </p>
    </section>
  );
}

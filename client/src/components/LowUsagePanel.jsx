import { formatCurrency } from '../format.js';
import { IconCheck, IconWarning } from './icons.jsx';
import { SkeletonLines } from './ui.jsx';

export default function LowUsagePanel({ items = [], threshold = 3, ready, onViewHistory }) {
  if (!ready) {
    return (
      <section className="panel" aria-busy="true">
        <div className="skeleton sk-line w40" style={{ marginBottom: 18 }} />
        <SkeletonLines lines={3} widths={['w90', 'w70', 'w40']} />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="panel" aria-label="Low-usage check">
        <div className="warning-block" style={{ borderLeftColor: 'var(--forest)' }}>
          <span className="warning-block__icon" style={{ color: 'var(--forest)' }}>
            <IconCheck width={20} height={20} />
          </span>
          <div className="warning-block__body">
            <p className="warning-block__title">Usage is healthy</p>
            <p className="warning-block__text">
              Every active plan was used at least {threshold} times in the last 30 days. No quiet
              leaks in this ledger.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const monthlyWaste = items.reduce((sum, item) => sum + (item.monthlyCost ?? 0), 0);

  return (
    <section className="panel" aria-labelledby="low-usage-title">
      <div className="warning-block" style={{ border: 0, padding: 0, background: 'none' }}>
        <span className="warning-block__icon">
          <IconWarning width={20} height={20} />
        </span>
        <div className="warning-block__body">
          <p className="warning-block__title" id="low-usage-title">
            {items.length} {items.length === 1 ? 'plan looks' : 'plans look'} underused
          </p>
          <p className="warning-block__text">
            Under {threshold} uses in 30 days — roughly {formatCurrency(monthlyWaste)} a month still
            going out.
          </p>

          <ul className="warning-list">
            {items.map((item) => {
              const recent = item.recentUsageCount ?? item.usageCount ?? 0;
              return (
                <li className="warning-item" key={item.id}>
                  <span className="warning-item__name">{item.service}</span>
                  <span className="warning-item__meta">
                    {recent} {recent === 1 ? 'use' : 'uses'} · {formatCurrency(item.monthlyCost)}/mo
                  </span>
                  {onViewHistory && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => onViewHistory(item)}
                    >
                      Review
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

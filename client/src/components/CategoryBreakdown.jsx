import { formatCurrency } from '../format.js';
import { EmptyState, PanelHead, SkeletonLines } from './ui.jsx';

export default function CategoryBreakdown({ categories = [], ready, total = 0 }) {
  const monthlyTotal = total || categories.reduce((sum, item) => sum + (item.monthlyCost ?? 0), 0);
  const largest = categories.reduce((max, item) => Math.max(max, item.monthlyCost ?? 0), 0);

  return (
    <section className="panel" aria-labelledby="categories-title">
      <PanelHead
        title={<span id="categories-title">Where it goes</span>}
        sub="Monthly equivalent"
      />

      {!ready && <SkeletonLines lines={5} widths={['w70', 'w90', 'w40', 'w70', 'w90']} />}

      {ready && categories.length === 0 && (
        <EmptyState
          title="No spending to chart"
          text="Add a subscription and the category split will appear here."
        />
      )}

      {ready && categories.length > 0 && (
        <>
          <div className="categories">
            {categories.map((item, index) => {
              const share = monthlyTotal > 0 ? (item.monthlyCost / monthlyTotal) * 100 : 0;
              const width = largest > 0 ? Math.max((item.monthlyCost / largest) * 100, 4) : 0;
              return (
                <div className="cat-row" key={item.category}>
                  <span className="cat-name">
                    {item.category}
                    <span className="cat-pct"> · {share.toFixed(0)}%</span>
                  </span>
                  <span className="cat-amount">{formatCurrency(item.monthlyCost)}</span>
                  <span className="cat-track" aria-hidden="true">
                    <span
                      className={`cat-fill${index === 0 ? '' : ' is-accent'}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </div>

          <p className="panel-note">
            {formatCurrency(monthlyTotal)} committed across {categories.length}{' '}
            {categories.length === 1 ? 'category' : 'categories'} each month.
          </p>
        </>
      )}
    </section>
  );
}

import { formatCurrency, formatDate, formatDayParts, renewalLabel } from '../format.js';
import { EmptyState, PanelHead, SkeletonLines } from './ui.jsx';

export default function RenewalTracker({
  renewals = [],
  windowDays = 7,
  ready,
  onViewCalendar,
}) {
  const total = renewals.reduce((sum, item) => sum + (item.cost ?? 0), 0);

  return (
    <section className="panel" aria-labelledby="renewals-title">
      <PanelHead
        title={
          <span id="renewals-title">
            Upcoming renewals
          </span>
        }
        action={
          onViewCalendar ? (
            <button type="button" className="btn-link" onClick={onViewCalendar}>
              Calendar
            </button>
          ) : null
        }
      />

      {!ready && <SkeletonLines lines={4} widths={['w90', 'w70', 'w90', 'w40']} />}

      {ready && renewals.length === 0 && (
        <EmptyState
          title="Nothing due this week"
          text={`No charges land in the next ${windowDays} days. Your ledger is clear.`}
        />
      )}

      {ready && renewals.length > 0 && (
        <>
          <ul className="timeline">
            {renewals.map((renewal) => {
              const { day, month } = formatDayParts(renewal.nextRenewalDate);
              const urgent = renewal.daysUntilRenewal !== null && renewal.daysUntilRenewal <= 3;
              return (
                <li className="timeline-row" key={renewal.id}>
                  <div className="timeline-date">
                    <span className="timeline-day">{day}</span>
                    <span className="timeline-month">{month}</span>
                  </div>
                  <div className="timeline-body">
                    <p className="timeline-name">{renewal.service}</p>
                    <p className="timeline-meta">
                      {renewal.name} · {formatDate(renewal.nextRenewalDate)}
                    </p>
                  </div>
                  <div className="timeline-cost">
                    <p className="timeline-amount">{formatCurrency(renewal.cost)}</p>
                    <p className={`timeline-when${urgent ? ' is-urgent' : ''}`}>
                      {renewalLabel(renewal.daysUntilRenewal)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="panel-note">
            {formatCurrency(total)} due across {renewals.length}{' '}
            {renewals.length === 1 ? 'subscription' : 'subscriptions'} in the next {windowDays} days.
          </p>
        </>
      )}
    </section>
  );
}

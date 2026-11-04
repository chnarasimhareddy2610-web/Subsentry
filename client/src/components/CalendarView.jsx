import { useMemo, useState } from 'react';
import { formatCurrency } from '../format.js';
import { IconChevronLeft, IconChevronRight } from './icons.jsx';
import { EmptyState, PageHeader } from './ui.jsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthKey = (y, m) => `${y}-${m}`;

export default function CalendarView({
  subscriptions,
  loading,
  onViewHistory,
  onAdd,
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const active = subscriptions.filter((item) => !item.isEnded && item.nextRenewalDate);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const item of active) {
      const date = new Date(item.nextRenewalDate);
      if (Number.isNaN(date.getTime())) continue;
      if (date.getUTCFullYear() !== cursor.y || date.getUTCMonth() !== cursor.m) continue;
      const day = date.getUTCDate();
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return map;
  }, [active, cursor]);

  const monthItems = useMemo(
    () =>
      [...byDay.entries()]
        .sort((a, b) => a[0] - b[0])
        .flatMap(([, items]) =>
          items.map((item) => ({ day: new Date(item.nextRenewalDate).getUTCDate(), item }))
        ),
    [byDay]
  );

  const monthTotal = monthItems.reduce((sum, entry) => sum + (entry.item.cost ?? 0), 0);

  const firstWeekday = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const leading = Array.from({ length: firstWeekday }, (_, index) => `lead-${index}`);
  const trailing = Array.from(
    { length: (7 - ((firstWeekday + daysInMonth) % 7)) % 7 },
    (_, index) => `tail-${index}`
  );
  const isCurrentMonth =
    cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const shift = (delta) => {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.y, current.m + delta, 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Renewals, by date."
        subtitle="Each plan appears on its next charge date. Use it to see which weeks are expensive before the money leaves."
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}
            disabled={isCurrentMonth}
          >
            This month
          </button>
        }
      />

      <section className="panel" aria-labelledby="calendar-title">
        <div className="cal-toolbar">
          <div>
            <h2 className="cal-month" id="calendar-title">
              {MONTHS[cursor.m]} {cursor.y}
            </h2>
            <p className="panel-sub" style={{ marginTop: 4 }}>
              {monthItems.length} {monthItems.length === 1 ? 'charge' : 'charges'} ·{' '}
              {formatCurrency(monthTotal)}
            </p>
          </div>
          <div className="cal-nav">
            <button
              type="button"
              className="btn btn--icon"
              onClick={() => shift(-1)}
              aria-label="Previous month"
            >
              <IconChevronLeft width={16} height={16} />
            </button>
            <button
              type="button"
              className="btn btn--icon"
              onClick={() => shift(1)}
              aria-label="Next month"
            >
              <IconChevronRight width={16} height={16} />
            </button>
          </div>
        </div>

        <div className="cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="cal-grid" role="grid" aria-label={`${MONTHS[cursor.m]} ${cursor.y} renewals`}>
          {leading.map((key) => (
            <div className="cal-cell is-outside" key={key} aria-hidden="true" />
          ))}

          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const items = byDay.get(day) ?? [];
            const dayTotal = items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
            const today =
              isCurrentMonth && day === now.getDate();

            return (
              <div
                className={`cal-cell${today ? ' is-today' : ''}`}
                key={`day-${day}`}
                role="gridcell"
                aria-label={`${day} ${MONTHS[cursor.m]}${items.length ? `, ${items.length} renewals` : ''}`}
              >
                <div className="cal-date">
                  <span>{day}</span>
                  {items.length > 0 && <span className="cal-total">{formatCurrency(dayTotal)}</span>}
                </div>

                {items.slice(0, 3).map((item) => {
                  const urgent = item.daysUntilRenewal !== null && item.daysUntilRenewal <= 3;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`cal-item${urgent ? ' is-urgent' : ''}`}
                      onClick={() => onViewHistory(item)}
                      title={`${item.service} — ${formatCurrency(item.cost)}. Open usage history.`}
                    >
                      {item.service}
                    </button>
                  );
                })}

                {items.length > 3 && (
                  <button
                    type="button"
                    className="cal-more"
                    onClick={() => onViewHistory(items[3])}
                  >
                    +{items.length - 3} more
                  </button>
                )}
              </div>
            );
          })}

          {trailing.map((key) => (
            <div className="cal-cell is-outside" key={key} aria-hidden="true" />
          ))}
        </div>

        <div className="cal-legend">
          <span className="cal-legend__item">
            <span className="cal-legend__swatch" aria-hidden="true" /> Scheduled renewal
          </span>
          <span className="cal-legend__item">
            <span className="cal-legend__swatch is-urgent" aria-hidden="true" /> Within 3 days
          </span>
          <span className="cal-legend__item">
            Ended plans are excluded until their next cycle
          </span>
        </div>
      </section>

      <section className="panel cal-month-list" aria-labelledby="month-list-title">
        <div className="panel-head">
          <h2 className="panel-title" id="month-list-title">
            Charged in {MONTHS[cursor.m]}
          </h2>
          <span className="panel-sub">{formatCurrency(monthTotal)} total</span>
        </div>

        {loading && (
          <div aria-busy="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton sk-line w90" />
            ))}
          </div>
        )}

        {!loading && monthItems.length === 0 && (
          <EmptyState
            title="No renewals this month"
            text={
              active.length === 0
                ? 'Add a subscription to populate the calendar.'
                : 'Nothing is scheduled to renew in the selected month.'
            }
            action={
              active.length === 0 ? (
                <button type="button" className="btn btn--sm" onClick={onAdd}>
                  Add subscription
                </button>
              ) : null
            }
          />
        )}

        {!loading && monthItems.length > 0 && (
          <ul className="timeline">
            {monthItems.map(({ day, item }) => (
              <li className="timeline-row" key={`${item.id}-${monthKey(cursor.y, cursor.m)}`}>
                <div className="timeline-date">
                  <span className="timeline-day">{String(day).padStart(2, '0')}</span>
                  <span className="timeline-month">{MONTHS[cursor.m].slice(0, 3)}</span>
                </div>
                <div className="timeline-body">
                  <p className="timeline-name">{item.service}</p>
                  <p className="timeline-meta">
                    {item.name} · {item.category}
                  </p>
                </div>
                <div className="timeline-cost">
                  <p className="timeline-amount">{formatCurrency(item.cost)}</p>
                  <p className="timeline-when">billed {item.billingCycle}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

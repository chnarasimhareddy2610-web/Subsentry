import { formatCurrency, formatInteger } from '../format.js';

export default function MetricsRow({ stats, subscriptions = [], ready }) {
  const totals = stats?.totals;
  const windowDays = stats?.settings?.renewalWindowDays ?? 7;
  const threshold = stats?.settings?.lowUsageThreshold ?? 3;

  const ended = subscriptions.filter((item) => item.isEnded).length;
  const active = (totals?.subscriptions ?? 0) - ended;

  const metrics = [
    {
      label: 'Active subscriptions',
      value: ready ? formatInteger(active) : '—',
      meta:
        ended > 0
          ? `${ended} archived ${ended === 1 ? 'plan' : 'plans'}`
          : 'All plans running',
    },
    {
      label: `Renewals · ${windowDays} days`,
      value: ready ? formatInteger(totals?.upcomingRenewals ?? 0) : '—',
      meta:
        ready && totals?.upcomingRenewals > 0
          ? 'Review before they charge'
          : 'Nothing due this week',
      tone: ready && totals?.upcomingRenewals > 0 ? 'is-warn' : 'is-good',
    },
    {
      label: 'Low-usage plans',
      value: ready ? formatInteger(totals?.lowUsage ?? 0) : '—',
      meta: `Fewer than ${threshold} uses in 30 days`,
      tone: ready && totals?.lowUsage > 0 ? 'is-warn' : '',
    },
    {
      label: 'Spent this year',
      value: ready ? formatCurrency(totals?.yearlySpend ?? 0) : '—',
      meta: ready
        ? `${formatCurrency(totals?.previousYearSpend ?? 0)} last year`
        : 'Comparing years',
    },
  ];

  return (
    <section className="metrics-strip" aria-label="Summary metrics">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <p className="metric__label">{metric.label}</p>
          <p className="metric__value">{metric.value}</p>
          <p className={`metric__meta${metric.tone ? ` ${metric.tone}` : ''}`}>{metric.meta}</p>
        </div>
      ))}
    </section>
  );
}

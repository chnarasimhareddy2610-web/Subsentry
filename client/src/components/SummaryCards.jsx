import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../format.js';

function useAnimatedValue(target) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  displayRef.current = display;

  useEffect(() => {
    const from = displayRef.current;
    const to = Number(target) || 0;
    if (from === to) return undefined;

    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const progress = Math.min((now - start) / 600, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(from + (to - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return display;
}

function StatValue({ value, money, ready }) {
  const animated = useAnimatedValue(ready ? value : 0);

  if (!ready) return <>—</>;
  return <>{money ? formatCurrency(animated) : Math.round(animated)}</>;
}

export default function SummaryCards({ stats, ready }) {
  const totals = stats?.totals;
  const windowDays = stats?.settings?.renewalWindowDays ?? 7;

  const cards = [
    {
      color: 'blue',
      icon: '💳',
      label: 'Monthly Expenditure',
      value: totals?.monthlyExpenditure ?? 0,
      money: true,
    },
    {
      color: 'purple',
      icon: '📅',
      label: 'Current Year Spend',
      value: totals?.yearlySpend ?? 0,
      money: true,
    },
    {
      color: 'pink',
      icon: '🗓️',
      label: 'Previous Year Spend',
      value: totals?.previousYearSpend ?? 0,
      money: true,
    },
    {
      color: 'green',
      icon: '📦',
      label: 'Total Subscriptions',
      value: totals?.subscriptions ?? 0,
    },
    {
      color: 'amber',
      icon: '⏰',
      label: `Renewing in ${windowDays} Days`,
      value: totals?.upcomingRenewals ?? 0,
    },
    {
      color: 'red',
      icon: '📉',
      label: 'Low Usage Plans',
      value: totals?.lowUsage ?? 0,
    },
  ];

  return (
    <section className="summary">
      {cards.map((card) => (
        <div className="box card-hover" data-color={card.color} key={card.label}>
          <div className="box-icon" aria-hidden="true">{card.icon}</div>
          <h2>
            <StatValue value={card.value} money={card.money} ready={ready} />
          </h2>
          <p>{card.label}</p>
        </div>
      ))}
    </section>
  );
}

import { formatCurrency } from '../format.js';

function buildTips(subscriptions, stats) {
  if (subscriptions.length === 0) {
    return ['No subscriptions added yet. Add one above to get started!'];
  }

  const tips = [];
  const monthly = stats?.totals?.monthlyExpenditure ?? 0;

  if (monthly > 5000) {
    tips.push(
      `You're spending more than ${formatCurrency(5000)} per month. Review high-cost plans and consider consolidating.`
    );
  }

  const entertainment = subscriptions.filter(
    (item) => item.category === 'Entertainment' && !item.isEnded
  ).length;
  if (entertainment >= 3) {
    tips.push(
      `You have ${entertainment} entertainment subscriptions. Consider dropping the streaming services you watch least.`
    );
  }

  const expensive = subscriptions.filter(
    (item) => item.monthlyCost >= 1000 && !item.isEnded
  );
  if (expensive.length > 0) {
    tips.push(
      `${expensive.length} subscription(s) cost ₹1,000 or more per month. Check whether annual billing is cheaper.`
    );
  }

  const lowUsage = stats?.lowUsage ?? [];
  if (lowUsage.length > 0) {
    const names = lowUsage.slice(0, 3).map((item) => item.service).join(', ');
    tips.push(
      `${lowUsage.length} subscription(s) look underused (${names}${lowUsage.length > 3 ? ', …' : ''}). Cancel or downgrade them to stop the leak.`
    );
  }

  const renewals = stats?.upcomingRenewals ?? [];
  if (renewals.length > 0) {
    tips.push(
      `${renewals.length} renewal(s) are due within ${stats?.settings?.renewalWindowDays ?? 7} days. Decide before the charge lands.`
    );
  }

  const ended = subscriptions.filter((item) => item.isEnded);
  if (ended.length > 0) {
    tips.push(
      `${ended.length} subscription(s) are past their end date. Delete them if the plan has lapsed.`
    );
  }

  if (tips.length === 0) {
    tips.push('Your subscriptions look well-optimized! Keep monitoring to stay on track. 🎉');
  }

  return tips;
}

export default function LeakSuggestions({ subscriptions, stats }) {
  const tips = buildTips(subscriptions, stats);

  return (
    <section className="card glass suggestions-card">
      <h2><span className="icon" aria-hidden="true">🔍</span> Leak Detection Suggestions</h2>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}

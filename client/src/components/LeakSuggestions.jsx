import { formatCurrency } from '../format.js';
import { IconArrowUpRight } from './icons.jsx';

function buildTips(subscriptions, stats) {
  if (subscriptions.length === 0) {
    return ['No subscriptions recorded yet. Add one to begin the ledger.'];
  }

  const tips = [];
  const monthly = stats?.totals?.monthlyExpenditure ?? 0;

  if (monthly > 5000) {
    tips.push(
      `Your monthly commitment is ${formatCurrency(monthly)} — above the ${formatCurrency(5000)} review line. Consolidating the highest-cost plans would move it fastest.`
    );
  }

  const entertainment = subscriptions.filter(
    (item) => item.category === 'Entertainment' && !item.isEnded
  ).length;
  if (entertainment >= 3) {
    tips.push(
      `${entertainment} entertainment subscriptions are active at once. Rotating streaming services instead of stacking them is the usual saving.`
    );
  }

  const expensive = subscriptions.filter(
    (item) => item.monthlyCost >= 1000 && !item.isEnded
  );
  if (expensive.length > 0) {
    tips.push(
      `${expensive.length} ${expensive.length === 1 ? 'plan costs' : 'plans cost'} ₹1,000 or more per month. Switching to annual billing is often cheaper for plans you keep.`
    );
  }

  const lowUsage = stats?.lowUsage ?? [];
  if (lowUsage.length > 0) {
    const names = lowUsage.slice(0, 3).map((item) => item.service).join(', ');
    tips.push(
      `${lowUsage.length} ${lowUsage.length === 1 ? 'subscription looks' : 'subscriptions look'} underused (${names}${lowUsage.length > 3 ? ', …' : ''}). Cancelling or downgrading stops the leak.`
    );
  }

  const renewals = stats?.upcomingRenewals ?? [];
  if (renewals.length > 0) {
    tips.push(
      `${renewals.length} ${renewals.length === 1 ? 'renewal falls' : 'renewals fall'} within ${stats?.settings?.renewalWindowDays ?? 7} days. Decide before the charge lands.`
    );
  }

  const ended = subscriptions.filter((item) => item.isEnded);
  if (ended.length > 0) {
    tips.push(
      `${ended.length} ${ended.length === 1 ? 'subscription is' : 'subscriptions are'} past their end date. Delete them once the plan has lapsed.`
    );
  }

  if (tips.length === 0) {
    tips.push('No leaks detected. Your subscriptions are spread sensibly and used regularly.');
  }

  return tips;
}

export default function LeakSuggestions({ subscriptions, stats }) {
  const tips = buildTips(subscriptions, stats);

  return (
    <section className="panel" aria-labelledby="observations-title">
      <div className="panel-head">
        <h2 className="panel-title" id="observations-title">
          Observations
        </h2>
        <span className="panel-sub">From your ledger</span>
      </div>

      <ul className="suggestions">
        {tips.map((tip) => (
          <li className="suggestion" key={tip}>
            <span className="suggestion__bullet" aria-hidden="true">
              <IconArrowUpRight width={15} height={15} />
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

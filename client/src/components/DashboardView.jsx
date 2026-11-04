import CategoryBreakdown from './CategoryBreakdown.jsx';
import CommitmentPanel from './CommitmentPanel.jsx';
import LeakSuggestions from './LeakSuggestions.jsx';
import LowUsagePanel from './LowUsagePanel.jsx';
import MetricsRow from './MetricsRow.jsx';
import RenewalTracker from './RenewalTracker.jsx';
import SubscriptionTable from './SubscriptionTable.jsx';
import { IconPlus } from './icons.jsx';
import { PageHeader } from './ui.jsx';

const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export default function DashboardView({
  stats,
  subscriptions,
  ready,
  loading,
  busyId,
  onAdd,
  onViewAll,
  onViewCalendar,
  onViewHistory,
  onEdit,
  onDelete,
  onEnd,
  onLogUsage,
  onResetUsage,
}) {
  const lowUsage = stats?.lowUsage ?? [];

  return (
    <>
      <PageHeader
        eyebrow={`Ledger · ${monthLabel}`}
        title={
          <>
            Your money, <em>accounted for</em>.
          </>
        }
        subtitle="Every recurring charge in one ledger — what it costs each month, when it renews, and whether it is still earning its place."
        actions={
          <button type="button" className="btn btn--primary add-action" onClick={onAdd}>
            <IconPlus width={15} height={15} />
            Add subscription
          </button>
        }
      />

      <div className="section-stack">
        <CommitmentPanel stats={stats} subscriptions={subscriptions} ready={ready} />

        <MetricsRow stats={stats} subscriptions={subscriptions} ready={ready} />

        <div className="dash-grid">
          <RenewalTracker
            renewals={stats?.upcomingRenewals ?? []}
            windowDays={stats?.settings?.renewalWindowDays ?? 7}
            ready={Boolean(stats)}
            onViewCalendar={onViewCalendar}
          />
          <CategoryBreakdown
            categories={stats?.categoryBreakdown ?? []}
            ready={Boolean(stats)}
            total={stats?.totals?.monthlyExpenditure ?? 0}
          />
        </div>

        <SubscriptionTable
          subscriptions={subscriptions}
          loading={loading}
          limit={7}
          onViewAll={onViewAll}
          busyId={busyId}
          onEdit={onEdit}
          onDelete={onDelete}
          onEnd={onEnd}
          onLogUsage={onLogUsage}
          onResetUsage={onResetUsage}
          onViewHistory={onViewHistory}
        />

        <div className="two-col">
          <LowUsagePanel
            items={lowUsage}
            threshold={stats?.settings?.lowUsageThreshold ?? 3}
            ready={Boolean(stats)}
            onViewHistory={onViewHistory}
          />
          <LeakSuggestions subscriptions={subscriptions} stats={stats} />
        </div>
      </div>
    </>
  );
}

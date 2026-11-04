import { useMemo, useState } from 'react';
import SubscriptionTable from './SubscriptionTable.jsx';
import { IconPlus, IconSearch } from './icons.jsx';
import { EmptyState, PageHeader } from './ui.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'ended', label: 'Ended' },
];

export default function SubscriptionsView({
  subscriptions,
  loading,
  busyId,
  onAdd,
  onEdit,
  onDelete,
  onEnd,
  onLogUsage,
  onResetUsage,
  onViewHistory,
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subscriptions.filter((item) => {
      const matchesFilter =
        filter === 'all' || (filter === 'ended' ? item.isEnded : !item.isEnded);
      if (!matchesFilter) return false;
      if (!needle) return true;
      return (
        item.service.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle)
      );
    });
  }, [subscriptions, query, filter]);

  const isFiltered = query.trim() !== '' || filter !== 'all';

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="The whole ledger."
        subtitle="Every subscription you hold, with its monthly equivalent, next renewal and recent usage. Filter to find a plan quickly."
        actions={
          <button type="button" className="btn btn--primary add-action" onClick={onAdd}>
            <IconPlus width={15} height={15} />
            Add subscription
          </button>
        }
      />

      <SubscriptionTable
        subscriptions={filtered}
        loading={loading}
        busyId={busyId}
        onEdit={onEdit}
        onDelete={onDelete}
        onEnd={onEnd}
        onLogUsage={onLogUsage}
        onResetUsage={onResetUsage}
        onViewHistory={onViewHistory}
        toolbar={
          <div className="filter-row">
            <label className="sr-only" htmlFor="ledger-search">
              Search subscriptions
            </label>
            <span className="search-wrap">
              <span className="search-wrap__icon" aria-hidden="true">
                <IconSearch width={15} height={15} />
              </span>
              <input
                id="ledger-search"
                type="search"
                className="search-input"
                placeholder="Search service, plan or category"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </span>

            <div className="segmented" role="group" aria-label="Filter by status">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? 'is-active' : undefined}
                  onClick={() => setFilter(item.id)}
                  aria-pressed={filter === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <span className="result-count">
              {filtered.length} of {subscriptions.length}
            </span>
          </div>
        }
        emptyState={
          isFiltered ? (
            <EmptyState
              title="No plans match that filter"
              text="Try a different search term, or switch the status filter back to All."
              action={
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No subscriptions yet"
              text="Add your first subscription and SubSentry will track its cost, renewal date and usage."
              action={
                <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
                  <IconPlus width={14} height={14} />
                  Add subscription
                </button>
              }
            />
          )
        }
      />
    </>
  );
}

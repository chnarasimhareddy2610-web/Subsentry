import { useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import CalendarView from './components/CalendarView.jsx';
import DashboardView from './components/DashboardView.jsx';
import InsightsView from './components/InsightsView.jsx';
import Modal from './components/Modal.jsx';
import SubscriptionsView from './components/SubscriptionsView.jsx';
import SubscriptionForm from './components/SubscriptionForm.jsx';
import Toast from './components/Toast.jsx';
import UsageHistoryModal from './components/UsageHistoryModal.jsx';
import { IconWarning } from './components/icons.jsx';
import { api } from './api.js';

const VIEWS = ['dashboard', 'subscriptions', 'calendar', 'insights'];

function readHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.includes(raw) ? raw : 'dashboard';
}

export default function App() {
  const [view, setView] = useState(readHash);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, at: Date.now() });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [list, nextStats] = await Promise.all([api.list(), api.stats()]);
      setSubscriptions(list);
      setStats(nextStats);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      // Retry up to 3 times with a 2s delay to cover a slow first boot of
      // the Express API behind the Vite proxy.
      let attempts = 0;
      const MAX = 3;
      while (active && attempts < MAX) {
        try {
          const [list, nextStats] = await Promise.all([api.list(), api.stats()]);
          if (!active) break;
          setSubscriptions(list);
          setStats(nextStats);
          setLoadError('');
          break;
        } catch (error) {
          attempts += 1;
          if (!active) break;
          if (attempts >= MAX) {
            setLoadError(error.message);
          } else {
            await new Promise((res) => setTimeout(res, 2000));
          }
        }
      }
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  // Keep the active screen in the URL so reload and back/forward behave.
  useEffect(() => {
    const onHashChange = () => setView(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next) => {
    setView(next);
    window.history.replaceState(null, '', `#/${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCreate = async (payload) => {
    await api.create(payload);
    await refresh();
    setAdding(false);
    notify('Subscription added');
  };

  const handleUpdate = async (id, payload) => {
    await api.update(id, payload);
    setEditing(null);
    await refresh();
    notify('Subscription updated');
  };

  const handleDelete = async (subscription) => {
    if (!window.confirm(`Delete your ${subscription.service} subscription?`)) return;

    setBusyId(subscription.id);
    try {
      await api.remove(subscription.id);
      await refresh();
      notify('Subscription deleted');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleEnd = async (subscription) => {
    if (
      !window.confirm(
        `End your ${subscription.service} subscription? It will stop counting toward your monthly spend.`
      )
    ) {
      return;
    }

    setBusyId(subscription.id);
    try {
      await api.cancel(subscription.id);
      await refresh();
      notify('Subscription ended');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleLogUsage = async (id) => {
    setBusyId(id);
    try {
      await api.logUsage(id, 1);
      await refresh();
      notify('Usage recorded');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetUsage = async (id) => {
    if (!window.confirm('Reset the usage count and history for this subscription?')) return;

    setBusyId(id);
    try {
      await api.resetUsage(id);
      await refresh();
      notify('Usage reset');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  };

  const ready = !loading && Boolean(stats);
  const connected = Boolean(stats) && !loadError;
  const activeCount = subscriptions.filter((item) => !item.isEnded).length;

  const sharedTableProps = {
    busyId,
    onEdit: setEditing,
    onDelete: handleDelete,
    onEnd: handleEnd,
    onLogUsage: handleLogUsage,
    onResetUsage: handleResetUsage,
    onViewHistory: (subscription) => setViewingHistory(subscription),
  };

  return (
    <>
      <AppShell
        view={view}
        onNavigate={navigate}
        onAdd={() => setAdding(true)}
        planCount={activeCount}
        connected={connected}
      >
        {loadError && (
          <div className="error-banner" role="alert">
            <span className="error-banner__content">
              <IconWarning width={16} height={16} />
              {loadError}
            </span>
            <button type="button" className="btn btn--sm" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        {loadError && !stats ? (
          <section className="panel">
            <div className="empty empty--center">
              <span className="empty__icon">
                <IconWarning width={22} height={22} />
              </span>
              <p className="empty__title">The ledger could not be loaded</p>
              <p className="empty__text">
                The API did not answer. Confirm the Express server is running, then try again.
              </p>
              <button type="button" className="btn btn--primary btn--sm" onClick={handleRetry}>
                Retry connection
              </button>
            </div>
          </section>
        ) : view === 'dashboard' ? (
          <DashboardView
            stats={stats}
            subscriptions={subscriptions}
            ready={ready}
            loading={loading}
            onAdd={() => setAdding(true)}
            onViewAll={() => navigate('subscriptions')}
            onViewCalendar={() => navigate('calendar')}
            {...sharedTableProps}
          />
        ) : view === 'subscriptions' ? (
          <SubscriptionsView
            subscriptions={subscriptions}
            loading={loading}
            onAdd={() => setAdding(true)}
            {...sharedTableProps}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            subscriptions={subscriptions}
            loading={loading}
            onAdd={() => setAdding(true)}
            onViewHistory={(subscription) => setViewingHistory(subscription)}
          />
        ) : (
          <InsightsView
            stats={stats}
            subscriptions={subscriptions}
            ready={ready}
            loading={loading}
            onAdd={() => setAdding(true)}
            onViewHistory={(subscription) => setViewingHistory(subscription)}
          />
        )}
      </AppShell>

      {adding && (
        <Modal
          title="New subscription"
          subtitle="Add a recurring charge to the ledger. Monthly equivalents are calculated for you."
          onClose={() => setAdding(false)}
        >
          <SubscriptionForm
            mode="add"
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal
          title={`Edit ${editing.service}`}
          subtitle="Changes apply to this plan from now on."
          onClose={() => setEditing(null)}
        >
          <SubscriptionForm
            key={editing.id}
            mode="edit"
            initialValues={editing}
            onSubmit={(payload) => handleUpdate(editing.id, payload)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {viewingHistory && (
        <UsageHistoryModal
          // Read through to the latest record so the totals stay live after logging.
          subscription={
            subscriptions.find((item) => item.id === viewingHistory.id) ?? viewingHistory
          }
          onClose={() => setViewingHistory(null)}
          onRefresh={refresh}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

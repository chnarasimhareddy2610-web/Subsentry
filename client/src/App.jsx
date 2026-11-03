import { useCallback, useEffect, useState } from 'react';
import BackgroundAnimation from './components/BackgroundAnimation.jsx';
import CartoonCharacter from './components/CartoonCharacter.jsx';
import Hero from './components/Hero.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import SubscriptionForm from './components/SubscriptionForm.jsx';
import RenewalTracker from './components/RenewalTracker.jsx';
import LowUsagePanel from './components/LowUsagePanel.jsx';
import SubscriptionTable from './components/SubscriptionTable.jsx';
import LeakSuggestions from './components/LeakSuggestions.jsx';
import Modal from './components/Modal.jsx';
import UsageHistoryModal from './components/UsageHistoryModal.jsx';
import Toast from './components/Toast.jsx';
import { api } from './api.js';

export default function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);
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
            // Wait 2 s before retrying
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

  const handleCreate = async (payload) => {
    await api.create(payload);
    await refresh();
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

  const handleViewHistory = (subscription) => {
    setViewingHistory(subscription);
  };

  const handleRetry = async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  };

  const ready = !loading && Boolean(stats);

  return (
    <>
      <BackgroundAnimation />
      <CartoonCharacter />

      <div className="container">
        <Hero />

        {loadError && (
          <div className="error-banner" role="alert">
            <span>⚠️ {loadError}</span>
            <button type="button" className="btn-secondary" onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}

        <section className="card glass">
          <h2><span className="icon" aria-hidden="true">➕</span> Add Subscription</h2>
          <SubscriptionForm onSubmit={handleCreate} />
        </section>

        <SummaryCards stats={stats} ready={ready} />

        <div className="dashboard-grid">
          <RenewalTracker
            renewals={stats?.upcomingRenewals ?? []}
            windowDays={stats?.settings?.renewalWindowDays ?? 7}
            ready={Boolean(stats)}
          />
          <LowUsagePanel
            items={stats?.lowUsage ?? []}
            threshold={stats?.settings?.lowUsageThreshold ?? 3}
            ready={Boolean(stats)}
          />
        </div>

        <SubscriptionTable
          subscriptions={subscriptions}
          onEdit={setEditing}
          onDelete={handleDelete}
          onEnd={handleEnd}
          onLogUsage={handleLogUsage}
          onResetUsage={handleResetUsage}
          onViewHistory={handleViewHistory}
          busyId={busyId}
          loading={loading}
        />

        <LeakSuggestions subscriptions={subscriptions} stats={stats} />

        <footer className="app-footer">
          SubSentry · React + Vite · Express REST API · MongoDB persistence
        </footer>
      </div>

      {editing && (
        <Modal title={`Edit ${editing.service}`} onClose={() => setEditing(null)}>
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
          subscription={viewingHistory}
          onClose={() => setViewingHistory(null)}
          onRefresh={refresh}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

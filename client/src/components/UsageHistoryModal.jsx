import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate } from '../format.js';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function UsageHistoryModal({ subscription, onClose, onRefresh }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logNote, setLogNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUsageHistory(subscription.id);
      setLogs(data.logs ?? []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [subscription.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Trap Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  const handleLogUsage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.logUsage(subscription.id, 1, logNote.trim());
      setLogNote('');
      await loadHistory();
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Remove this usage record?')) return;
    setDeletingId(logId);
    try {
      await api.deleteUsageLog(subscription.id, logId);
      await loadHistory();
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal glass usage-history-modal" role="dialog" aria-modal="true" aria-label={`Usage history for ${subscription.service}`}>
        <div className="modal-head">
          <h2>
            <span className="icon" aria-hidden="true">📋</span>
            Usage History — {subscription.service}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Quick-log form */}
          <form className="usage-log-form" onSubmit={handleLogUsage}>
            <div className="usage-log-row">
              <input
                type="text"
                className="usage-note-input"
                placeholder="Add a note (optional) — e.g. 'Watched movie'"
                value={logNote}
                maxLength={200}
                onChange={(e) => setLogNote(e.target.value)}
              />
              <button type="submit" className="add-btn usage-log-btn" disabled={saving}>
                {saving ? 'Logging…' : '+ Log Use'}
              </button>
            </div>
          </form>

          {error && (
            <div className="form-error" role="alert" style={{ marginBottom: '14px' }}>
              <span aria-hidden="true">⚠️</span> {error}
            </div>
          )}

          {/* Stats bar */}
          <div className="usage-stats-bar">
            <span className="usage-stat">
              <strong>{subscription.usageCount}</strong> total uses
            </span>
            <span className="usage-stat">
              <strong>{subscription.recentUsageCount ?? 0}</strong> in last 30 days
            </span>
            {subscription.lastUsedAt && (
              <span className="usage-stat muted">
                Last used {formatDate(subscription.lastUsedAt)}
              </span>
            )}
          </div>

          {/* Log list */}
          {loading && <p className="empty-state">Loading history…</p>}

          {!loading && logs.length === 0 && (
            <p className="empty-state">
              No usage recorded yet. Use the <strong>+1</strong> button in the table or log one above.
            </p>
          )}

          {!loading && logs.length > 0 && (
            <ul className="usage-log-list">
              {logs.map((log) => (
                <li className="usage-log-entry" key={log.id}>
                  <div className="usage-log-info">
                    <span className="usage-log-amount">×{log.amount}</span>
                    <div className="usage-log-meta">
                      <span className="usage-log-time">{formatDateTime(log.recordedAt)}</span>
                      {log.note && <span className="usage-log-note">{log.note}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mini-btn ghost usage-log-delete"
                    onClick={() => handleDelete(log.id)}
                    disabled={deletingId === log.id}
                    title="Remove this record"
                    aria-label="Remove this usage record"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

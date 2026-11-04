import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate } from '../format.js';
import { IconClose } from './icons.jsx';
import { SkeletonLines } from './ui.jsx';

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
      // The API returns sub-documents with `_id`; normalise so each row keeps a
      // stable key and deletion targets a real log id.
      setLogs((data.logs ?? []).map((log) => ({ ...log, id: log.id ?? log._id })));
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

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={`Usage history for ${subscription.service}`}
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Usage history</h2>
            <p className="modal-sub">
              {subscription.service} · {subscription.name}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <IconClose width={16} height={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="usage-stats-bar">
            <span className="usage-stat">
              <strong>{subscription.usageCount}</strong> total uses
            </span>
            <span className="usage-stat">
              <strong>{subscription.recentUsageCount ?? 0}</strong> in last 30 days
            </span>
            <span className="usage-stat">
              <strong>{subscription.lastUsedAt ? formatDate(subscription.lastUsedAt) : '—'}</strong>
              last used
            </span>
          </div>

          <form className="usage-log-form" onSubmit={handleLogUsage}>
            <div className="usage-log-row">
              <input
                type="text"
                className="usage-note-input"
                placeholder="Note (optional) — e.g. watched a film"
                value={logNote}
                maxLength={200}
                onChange={(e) => setLogNote(e.target.value)}
                aria-label="Usage note"
              />
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Logging…' : 'Log use'}
              </button>
            </div>
          </form>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          {loading && <SkeletonLines lines={4} widths={['w90', 'w70', 'w90', 'w40']} />}

          {!loading && logs.length === 0 && (
            <p className="empty__text" style={{ padding: '12px 0' }}>
              No usage recorded yet. Log one above, or use the +1 control in the ledger.
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
                    className="usage-btn usage-log-delete"
                    onClick={() => handleDelete(log.id)}
                    disabled={deletingId === log.id}
                    title="Remove this record"
                    aria-label="Remove this usage record"
                  >
                    <IconClose width={13} height={13} />
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

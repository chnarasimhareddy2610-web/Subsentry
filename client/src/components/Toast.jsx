import { useEffect } from 'react';
import { IconCheck, IconWarning } from './icons.jsx';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.type}`} role="status" aria-live="polite">
      <span className="toast__icon" aria-hidden="true">
        {toast.type === 'success' ? (
          <IconCheck width={16} height={16} />
        ) : (
          <IconWarning width={16} height={16} />
        )}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

import { useEffect } from 'react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.type}`} role="status" aria-live="polite">
      <span aria-hidden="true">{toast.type === 'success' ? '✅' : '⚠️'}</span>
      <span>{toast.message}</span>
    </div>
  );
}

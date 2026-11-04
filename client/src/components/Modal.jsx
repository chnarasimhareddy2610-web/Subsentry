import { useEffect, useId } from 'react';
import { IconClose } from './icons.jsx';

export default function Modal({ title, subtitle, onClose, children, wide = false }) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal${wide ? ' modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <IconClose width={16} height={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

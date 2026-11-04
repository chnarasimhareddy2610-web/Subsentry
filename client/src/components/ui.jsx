/* Small shared primitives so screens stay consistent. */

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function PanelHead({ title, sub, action }) {
  return (
    <div className="panel-head">
      <h2 className="panel-title">{title}</h2>
      {action ?? (sub ? <span className="panel-sub">{sub}</span> : null)}
    </div>
  );
}

export function EmptyState({ icon, title, text, action, center = false }) {
  return (
    <div className={`empty${center ? ' empty--center' : ''}`}>
      {icon && <span className="empty__icon">{icon}</span>}
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  );
}

export function SkeletonLines({ lines = 3, widths = ['w90', 'w70', 'w40'] }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className={`skeleton sk-line ${widths[index % widths.length]}`} />
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 4, label = 'Loading' }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton sk-block" style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

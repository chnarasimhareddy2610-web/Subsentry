import {
  IconCalendar,
  IconDatabase,
  IconInsights,
  IconLedger,
  IconList,
  IconPlus,
} from './icons.jsx';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Overview', icon: IconLedger },
  { id: 'subscriptions', label: 'Subscriptions', mobileLabel: 'Plans', icon: IconList },
  { id: 'calendar', label: 'Renewal calendar', mobileLabel: 'Calendar', icon: IconCalendar },
  { id: 'insights', label: 'Usage insights', mobileLabel: 'Insights', icon: IconInsights },
];

function Brand({ compact = false }) {
  return (
    <div className={compact ? 'topbar__brand' : 'sidebar__brand'}>
      <span className="brand-mark" aria-hidden="true">
        <IconLedger width={18} height={18} />
      </span>
      <span className="brand-text">
        <span className="brand-name">SubSentry</span>
        {!compact && <span className="brand-tag">Subscription ledger</span>}
      </span>
    </div>
  );
}

export default function AppShell({ view, onNavigate, onAdd, planCount, connected, children }) {
  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = view === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`nav-item${active ? ' is-active' : ''}`}
        onClick={() => onNavigate(item.id)}
        aria-current={active ? 'page' : undefined}
      >
        <span className="nav-icon">
          <Icon />
        </span>
        <span className="nav-text">{item.label}</span>
        {item.id === 'subscriptions' && planCount > 0 && (
          <span className="nav-count">{planCount}</span>
        )}
      </button>
    );
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className="sidebar">
        <Brand />

        <nav className="sidebar__nav" aria-label="Primary">
          <div className="nav-group">
            <p className="nav-label">Workspace</p>
            {NAV_ITEMS.map(renderNavItem)}
          </div>
        </nav>

        <div className="sidebar__foot">
          <button type="button" className="btn-add" onClick={onAdd}>
            <span>New subscription</span>
            <IconPlus width={16} height={16} />
          </button>
          <p className="sidebar-status">
            <span className={`status-dot${connected ? '' : ' is-off'}`} aria-hidden="true" />
            <IconDatabase width={13} height={13} aria-hidden="true" />
            {connected ? 'Ledger synced' : 'Ledger unavailable'}
          </p>
        </div>
      </aside>

      <div className="app-body">
        <div className="topbar">
          <Brand compact />
          <div className="topbar__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
              <IconPlus width={15} height={15} />
              Add
            </button>
          </div>
        </div>

        <main className="page" id="main">
          {children}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Primary mobile">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav__item${active ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon width={19} height={19} />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

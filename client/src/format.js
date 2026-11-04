const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const amount = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat('en-IN');

export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(value) {
  const parsed = Number(value);
  return currency.format(Number.isFinite(parsed) ? parsed : 0);
}

/** Amount without the currency symbol, for display next to a styled glyph. */
export function formatAmount(value) {
  const parsed = Number(value);
  return amount.format(Number.isFinite(parsed) ? parsed : 0);
}

export function formatInteger(value) {
  const parsed = Number(value);
  return integer.format(Number.isFinite(parsed) ? parsed : 0);
}

/** Dates are stored at UTC midnight, so always format them in UTC. */
export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** { day: '05', month: 'Nov' } for the renewal timeline. */
export function formatDayParts(value) {
  if (!value) return { day: '—', month: '—' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '—', month: '—' };
  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'UTC' }),
    month: date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
  };
}

export function categoryClass(category) {
  const map = {
    Entertainment: 'pill-entertainment',
    Productivity: 'pill-productivity',
    Fitness: 'pill-fitness',
    Education: 'pill-education',
    Music: 'pill-music',
    Other: 'pill-other',
  };
  return map[category] || 'pill-other';
}

export function renewalLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

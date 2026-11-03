const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  const amount = Number(value);
  return currency.format(Number.isFinite(amount) ? amount : 0);
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

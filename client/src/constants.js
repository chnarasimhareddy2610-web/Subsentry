export const CATEGORIES = [
  'Entertainment',
  'Productivity',
  'Fitness',
  'Education',
  'Music',
  'Other',
];

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', short: '/mo' },
  { value: 'quarterly', label: 'Quarterly', short: '/qtr' },
  { value: 'yearly', label: 'Yearly', short: '/yr' },
];

export function cycleMeta(cycle) {
  return (
    BILLING_CYCLES.find((item) => item.value === cycle) ??
    BILLING_CYCLES[0]
  );
}

export function cycleLabel(cycle) {
  return cycleMeta(cycle).label;
}

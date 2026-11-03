import { useState } from 'react';
import DateField from './DateField.jsx';
import { BILLING_CYCLES, CATEGORIES } from '../constants.js';

const EMPTY = {
  name: '',
  service: '',
  cost: '',
  category: 'Entertainment',
  billingCycle: 'monthly',
  billingDate: '',
  endDate: '',
  usageCount: '0',
};

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

function toFormValues(initial) {
  if (!initial) return { ...EMPTY };

  return {
    name: initial.name ?? '',
    service: initial.service ?? '',
    cost: String(initial.cost ?? ''),
    category: initial.category ?? 'Other',
    billingCycle: initial.billingCycle ?? 'monthly',
    billingDate: toInputDate(initial.billingDate),
    endDate: toInputDate(initial.endDate),
    usageCount: String(initial.usageCount ?? 0),
  };
}

function validate(values, mode) {
  const errors = {};

  if (!values.name.trim()) errors.name = 'Name is required';
  if (!values.service.trim()) errors.service = 'Service is required';

  const cost = Number(values.cost);
  if (values.cost === '') errors.cost = 'Cost is required';
  else if (!Number.isFinite(cost) || cost <= 0) {
    errors.cost = 'Cost must be a number greater than 0';
  }

  if (!values.billingDate) errors.billingDate = 'Billing date is required';
  if (
    values.endDate &&
    values.billingDate &&
    values.endDate < values.billingDate
  ) {
    errors.endDate = 'End date cannot be earlier than the billing date';
  }

  if (mode === 'edit') {
    const usage = Number(values.usageCount);
    if (values.usageCount === '' || !Number.isInteger(usage) || usage < 0) {
      errors.usageCount = 'Usage must be a whole number of 0 or more';
    }
  }

  return errors;
}

export default function SubscriptionForm({
  mode = 'add',
  initialValues,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setDate = (field) => (value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const nextErrors = validate(values, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        service: values.service.trim(),
        cost: Number(values.cost),
        category: values.category,
        billingCycle: values.billingCycle,
        billingDate: values.billingDate,
        endDate: values.endDate || null,
        ...(mode === 'edit' ? { usageCount: Number(values.usageCount) } : {}),
      });

      if (mode === 'add') {
        setValues({ ...EMPTY });
        setErrors({});
      }
    } catch (error) {
      setFormError(error.message || 'Something went wrong');
      if (Array.isArray(error.errors) && error.errors.length > 0) {
        setErrors((current) => {
          const merged = { ...current };
          for (const item of error.errors) {
            if (item.field) merged[item.field] = item.message;
          }
          return merged;
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="subscription-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="form-error" role="alert">
          <span aria-hidden="true">⚠️</span> {formError}
        </div>
      )}

      <div className="input-group">
        <div className="input-wrap">
          <label htmlFor={`name-${mode}`}>Name *</label>
          <input
            id={`name-${mode}`}
            type="text"
            value={values.name}
            onChange={update('name')}
            placeholder="e.g. John Doe"
            maxLength={80}
            className={errors.name ? 'input-invalid' : undefined}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="input-wrap">
          <label htmlFor={`service-${mode}`}>Service *</label>
          <input
            id={`service-${mode}`}
            type="text"
            value={values.service}
            onChange={update('service')}
            placeholder="e.g. Netflix"
            maxLength={80}
            className={errors.service ? 'input-invalid' : undefined}
            aria-invalid={Boolean(errors.service)}
          />
          {errors.service && <span className="field-error">{errors.service}</span>}
        </div>

        <div className="input-wrap">
          <label htmlFor={`cost-${mode}`}>Cost (₹) *</label>
          <input
            id={`cost-${mode}`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={values.cost}
            onChange={update('cost')}
            placeholder="e.g. 499"
            className={errors.cost ? 'input-invalid' : undefined}
            aria-invalid={Boolean(errors.cost)}
          />
          {errors.cost && <span className="field-error">{errors.cost}</span>}
        </div>

        <div className="input-wrap">
          <label htmlFor={`category-${mode}`}>Category</label>
          <div className="custom-select-wrapper">
            <select
              id={`category-${mode}`}
              value={values.category}
              onChange={update('category')}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <span className="select-arrow" aria-hidden="true">▾</span>
          </div>
        </div>

        <div className="input-wrap">
          <label htmlFor={`cycle-${mode}`}>Billing Cycle</label>
          <div className="custom-select-wrapper">
            <select
              id={`cycle-${mode}`}
              value={values.billingCycle}
              onChange={update('billingCycle')}
            >
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle.value} value={cycle.value}>{cycle.label}</option>
              ))}
            </select>
            <span className="select-arrow" aria-hidden="true">▾</span>
          </div>
        </div>

        <DateField
          id={`billingDate-${mode}`}
          label="Billing Date"
          value={values.billingDate}
          onChange={setDate('billingDate')}
          placeholder="Select billing date"
          error={errors.billingDate}
          required
        />

        <DateField
          id={`endDate-${mode}`}
          label="End Date (optional)"
          value={values.endDate}
          onChange={setDate('endDate')}
          placeholder="Select end date"
          error={errors.endDate}
        />

        {mode === 'edit' && (
          <div className="input-wrap">
            <label htmlFor={`usage-${mode}`}>Times Used</label>
            <input
              id={`usage-${mode}`}
              type="number"
              min="0"
              step="1"
              value={values.usageCount}
              onChange={update('usageCount')}
              className={errors.usageCount ? 'input-invalid' : undefined}
              aria-invalid={Boolean(errors.usageCount)}
            />
            {errors.usageCount && <span className="field-error">{errors.usageCount}</span>}
          </div>
        )}

        <div className="input-wrap btn-wrap">
          <div className="form-actions">
            {mode === 'edit' && (
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            )}
            <button type="submit" className="add-btn" disabled={saving}>
              <span>{saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Add Subscription'}</span>
              <span className="btn-icon" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

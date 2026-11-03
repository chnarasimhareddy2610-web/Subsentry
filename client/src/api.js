const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, errors = [], status = 0) {
    super(message);
    this.name = 'ApiError';
    this.errors = errors;
    this.status = status;
  }

  fieldError(field) {
    return this.errors.find((error) => error.field === field)?.message;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Cannot reach the API. Make sure the Express server is running.'
    );
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed (${response.status})`,
      Array.isArray(data?.errors) ? data.errors : [],
      response.status
    );
  }

  return data;
}

export const api = {
  list: () => request('/subscriptions'),
  stats: () => request('/subscriptions/stats'),
  get: (id) => request(`/subscriptions/${id}`),
  create: (payload) => request('/subscriptions', { method: 'POST', body: payload }),
  update: (id, payload) =>
    request(`/subscriptions/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' }),
  cancel: (id, endDate) =>
    request(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: endDate ? { endDate } : {},
    }),
  // Usage aggregate
  logUsage: (id, amount = 1, note = '') =>
    request(`/subscriptions/${id}/usage`, { method: 'POST', body: { amount, note } }),
  setUsage: (id, count) =>
    request(`/subscriptions/${id}/usage`, { method: 'PUT', body: { count } }),
  resetUsage: (id) =>
    request(`/subscriptions/${id}/usage`, { method: 'DELETE' }),
  // Usage history
  getUsageHistory: (id) => request(`/subscriptions/${id}/usage/history`),
  deleteUsageLog: (id, logId) =>
    request(`/subscriptions/${id}/usage/${logId}`, { method: 'DELETE' }),
};

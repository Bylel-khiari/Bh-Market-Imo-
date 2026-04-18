const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AUTH_STORAGE_KEY = 'bh_market_auth';

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function authorizedJsonRequest(path, token, options = {}) {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseJsonResponse(response);
}

export async function registerApi(input) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(response);
}

export async function loginApi(input) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(response);
}

export async function meApi(token) {
  return authorizedJsonRequest('/api/auth/me', token);
}

export async function fetchFavoritesApi(token) {
  return authorizedJsonRequest('/api/favorites', token);
}

export async function addFavoriteApi(propertyId, token) {
  return authorizedJsonRequest(`/api/properties/${propertyId}/favorite`, token, {
    method: 'POST',
  });
}

export async function removeFavoriteApi(propertyId, token) {
  return authorizedJsonRequest(`/api/properties/${propertyId}/favorite`, token, {
    method: 'DELETE',
  });
}

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function getAuthSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

const AUTH_STORAGE_KEY = 'bh_market_auth';
export const AUTH_SESSION_CHANGED_EVENT = 'bh-market-auth-session-changed';
const DEV_FRONTEND_PORTS = new Set(['3000', '3001', '3002', '3003', '3004', '3005', '5173']);

function notifyAuthSessionChanged(session) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_CHANGED_EVENT, {
      detail: { session },
    }),
  );
}

export function getApiBaseUrl() {
  const configuredApiUrl = String(process.env.REACT_APP_API_URL || '').trim();

  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDevFrontendPort = DEV_FRONTEND_PORTS.has(port);

    if (isLocalhost || isDevFrontendPort) {
      return `${protocol}//${hostname}:5000`;
    }

    // In deployed environments, prefer same-origin requests unless explicitly configured.
    return '';
  }

  return 'http://localhost:5000';
}

function prepareRequestBody(headers, body) {
  if (body == null || typeof body === 'string' || body instanceof FormData) {
    return body;
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (headers.get('Content-Type')?.includes('application/json')) {
    return JSON.stringify(body);
  }

  return body;
}

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function parseJsonResponse(response) {
  const raw = await response.text().catch(() => '');
  let payload = {};

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}`;
    throw createHttpError(message, response.status);
  }

  return payload;
}

export async function jsonRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const body = prepareRequestBody(headers, options.body);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    body,
    headers,
  });

  return parseJsonResponse(response);
}

export async function authorizedJsonRequest(path, token, options = {}) {
  if (!token) {
    throw createHttpError('Session invalide. Veuillez vous reconnecter.', 401);
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  return jsonRequest(path, { ...options, headers });
}

export async function loginApi(input) {
  return jsonRequest('/api/auth/login', {
    method: 'POST',
    body: input,
  });
}

export async function meApi(token) {
  return authorizedJsonRequest('/api/auth/me', token);
}

export async function fetchAgentDashboardApi(token) {
  return authorizedJsonRequest('/api/agent/dashboard', token);
}

export async function fetchAgentProfileApi(token) {
  return authorizedJsonRequest('/api/agent/profile', token);
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

export async function submitPropertyReportApi(propertyId, input, token) {
  return authorizedJsonRequest(`/api/properties/${propertyId}/reports`, token, {
    method: 'POST',
    body: input,
  });
}

export async function submitCreditApplicationApi(input, token) {
  return authorizedJsonRequest('/api/credit-applications', token, {
    method: 'POST',
    body: input,
  });
}

export function saveAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  notifyAuthSessionChanged(session);
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

export function requireAuthToken() {
  const token = getAuthSession()?.token;

  if (!token) {
    throw createHttpError('Session invalide. Veuillez vous reconnecter.', 401);
  }

  return token;
}

export function isAuthError(error) {
  if (Number(error?.status) === 401) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  if (!message) {
    return false;
  }

  return [
    'invalid or expired token',
    'missing or invalid authorization header',
    'session invalide',
    'veuillez vous reconnecter',
    'unauthorized',
  ].some((item) => message.includes(item));
}

export async function fetchClientCreditApplicationsApi(token, limit = 20) {
  return authorizedJsonRequest(`/api/client/credit-applications?limit=${limit}`, token);
}

export async function fetchAdminUsersApi(token, limit = 100) {
  return authorizedJsonRequest(`/api/admin/users?limit=${limit}`, token);
}

export async function createAdminUserApi(input, token) {
  return authorizedJsonRequest('/api/admin/users', token, {
    method: 'POST',
    body: input,
  });
}

export async function updateAdminUserApi(userId, input, token) {
  return authorizedJsonRequest(`/api/admin/users/${userId}`, token, {
    method: 'PUT',
    body: input,
  });
}

export async function deleteAdminUserApi(userId, token) {
  return authorizedJsonRequest(`/api/admin/users/${userId}`, token, {
    method: 'DELETE',
  });
}

export async function fetchAdminScrapeSitesApi(token, limit = 200) {
  return authorizedJsonRequest(`/api/admin/scrape-sites?limit=${limit}`, token);
}

export async function fetchAdminScraperControlApi(token) {
  return authorizedJsonRequest('/api/admin/scraper-control', token);
}

export async function updateAdminScraperControlApi(input, token) {
  return authorizedJsonRequest('/api/admin/scraper-control', token, {
    method: 'PUT',
    body: input,
  });
}

export async function startAdminScraperApi(input, token) {
  return authorizedJsonRequest('/api/admin/scraper-control/start', token, {
    method: 'POST',
    body: input,
  });
}

export async function stopAdminScraperApi(token) {
  return authorizedJsonRequest('/api/admin/scraper-control/stop', token, {
    method: 'POST',
  });
}

export async function createAdminScrapeSiteApi(input, token) {
  return authorizedJsonRequest('/api/admin/scrape-sites', token, {
    method: 'POST',
    body: input,
  });
}

export async function updateAdminScrapeSiteApi(siteId, input, token) {
  return authorizedJsonRequest(`/api/admin/scrape-sites/${siteId}`, token, {
    method: 'PUT',
    body: input,
  });
}

export async function deleteAdminScrapeSiteApi(siteId, token) {
  return authorizedJsonRequest(`/api/admin/scrape-sites/${siteId}`, token, {
    method: 'DELETE',
  });
}

export async function fetchAdminPropertiesApi(token, limit = 5000) {
  return authorizedJsonRequest(`/api/admin/properties?limit=${limit}`, token);
}

export async function createAdminPropertyApi(input, token) {
  return authorizedJsonRequest('/api/admin/properties', token, {
    method: 'POST',
    body: input,
  });
}

export async function updateAdminPropertyApi(propertyId, input, token) {
  return authorizedJsonRequest(`/api/admin/properties/${propertyId}`, token, {
    method: 'PUT',
    body: input,
  });
}

export async function deleteAdminPropertyApi(propertyId, token) {
  return authorizedJsonRequest(`/api/admin/properties/${propertyId}`, token, {
    method: 'DELETE',
  });
}

export async function fetchAdminPropertyReportsApi(token, { limit = 200, status = 'all' } = {}) {
  const params = new URLSearchParams();

  if (limit != null) {
    params.set('limit', String(limit));
  }

  if (status) {
    params.set('status', status);
  }

  const query = params.toString();
  return authorizedJsonRequest(`/api/admin/property-reports${query ? `?${query}` : ''}`, token);
}

export async function updateAdminPropertyReportStatusApi(reportId, input, token) {
  return authorizedJsonRequest(`/api/admin/property-reports/${reportId}/status`, token, {
    method: 'PATCH',
    body: input,
  });
}

export async function fetchAgentCreditApplicationsApi(
  token,
  { limit = 150, status = 'all', search = '' } = {},
) {
  const params = new URLSearchParams();

  if (limit != null) {
    params.set('limit', String(limit));
  }

  if (status) {
    params.set('status', status);
  }

  if (search) {
    params.set('search', search);
  }

  const query = params.toString();
  return authorizedJsonRequest(`/api/agent/credit-applications${query ? `?${query}` : ''}`, token);
}

export async function updateAgentCreditApplicationApi(applicationId, input, token) {
  return authorizedJsonRequest(`/api/agent/credit-applications/${applicationId}`, token, {
    method: 'PATCH',
    body: input,
  });
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  notifyAuthSessionChanged(null);
}

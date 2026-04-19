export function getApiBaseUrl() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return 'http://localhost:5000';
}

export function extractPropertyRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

export async function fetchPropertyRows({ limit, city, signal } = {}) {
  const params = new URLSearchParams();

  if (limit != null) {
    params.set('limit', String(limit));
  }

  if (city) {
    params.set('city', city);
  }

  const query = params.toString();
  const response = await fetch(`${getApiBaseUrl()}/api/properties${query ? `?${query}` : ''}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  return extractPropertyRows(payload);
}

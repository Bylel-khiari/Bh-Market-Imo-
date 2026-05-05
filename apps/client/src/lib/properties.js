import { jsonRequest } from './auth';

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

export async function fetchPropertyRows({ limit, city, all = false, signal } = {}) {
  const params = new URLSearchParams();

  if (all) {
    params.set('all', '1');
  } else if (limit != null) {
    params.set('limit', String(limit));
  }

  if (city) {
    params.set('city', city);
  }

  const query = params.toString();
  const payload = await jsonRequest(`/api/properties${query ? `?${query}` : ''}`, { signal });
  return extractPropertyRows(payload);
}

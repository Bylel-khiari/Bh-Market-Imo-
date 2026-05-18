import { jsonRequest } from './auth';

export function extractPropertyRows(payload) {
  const normalizeRows = (rows) => rows.map(normalizePropertyRow);

  if (Array.isArray(payload)) {
    return normalizeRows(payload);
  }

  if (Array.isArray(payload?.data)) {
    return normalizeRows(payload.data);
  }

  if (Array.isArray(payload?.items)) {
    return normalizeRows(payload.items);
  }

  return [];
}

function collectImages(...values) {
  const images = [];
  const seen = new Set();

  const add = (value) => {
    if (value == null) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          add(JSON.parse(trimmed));
          return;
        } catch {
          // Treat it as a plain URL below.
        }
      }

      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        images.push(trimmed);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }

    if (typeof value === 'object') {
      add(value.url || value.src || value.contentUrl || value.image || value.images);
    }
  };

  values.forEach(add);
  return images;
}

function normalizePropertyRow(row) {
  const images = collectImages(row?.image, row?.images, row?.images_json);
  return {
    ...row,
    image: row?.image || images[0] || '',
    images,
  };
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

export const PROPERTIES_PER_PAGE = 25;
export const DEFAULT_PROPERTY_SORT = 'recent';
export const PROPERTY_TYPE_ORDER = ['Maison', 'Appartement', 'Villa', 'Terrain', 'Studio', 'Bureau'];
export const PROPERTY_SORT_OPTIONS = [
  { value: DEFAULT_PROPERTY_SORT, label: 'Plus recents' },
  { value: 'price_desc', label: 'Prix decroissant' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'title_asc', label: 'Titre A-Z' },
  { value: 'source_asc', label: 'Source A-Z' },
];
export const REPORT_CATEGORY_OPTIONS = [
  { value: 'cannot_open_site', label: 'Impossible d ouvrir le site source' },
  { value: 'bad_owner_experience', label: 'Mauvaise experience avec le proprietaire' },
  { value: 'bad_agency_experience', label: 'Mauvaise experience avec l agence' },
  { value: 'scam_suspicion', label: 'Suspicion d arnaque' },
  { value: 'incorrect_information', label: 'Informations incorrectes' },
  { value: 'other', label: 'Autre problÃ¨me' },
];

export const inferTypeFromTitle = (title) => {
  const lower = (title || '').toLowerCase();
  if (lower.includes('appartement')) return 'Appartement';
  if (lower.includes('villa')) return 'Villa';
  if (lower.includes('maison')) return 'Maison';
  if (lower.includes('terrain')) return 'Terrain';
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('bureau') || lower.includes('local')) return 'Bureau';
  return 'Maison';
};

export const inferRoomsFromTitle = (title, min, max) => {
  const base = Math.max(1, Number(min || 1));
  const span = Math.max(1, Number(max || min || 1));
  const source = (title || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return base + (source % span);
};

export const buildRating = (id) => {
  const base = Number(String(id || 1).replace(/\D/g, '').slice(-2) || 1);
  const rating = 4 + ((base % 10) / 20);
  return Math.min(4.9, Math.max(4.0, rating)).toFixed(1);
};

export const toPositiveNumberFilter = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export const formatCompactPrice = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '-';
  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toFixed(numeric >= 10000000 ? 0 : 1)}M DT`;
  }
  if (numeric >= 1000) {
    return `${Math.round(numeric / 1000)}k DT`;
  }
  return `${Math.round(numeric)} DT`;
};

export const getPropertyImages = (property) => {
  if (!property) return [];
  if (Array.isArray(property.images) && property.images.length) {
    return property.images.filter(Boolean);
  }
  return property.image ? [property.image] : [];
};

export const formatPropertyPrice = (property) => {
  const numeric = Number(property.price_value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
  }
  return property.price_raw || 'Prix non communiquÃ©';
};

export const formatPropertyDate = (value) => {
  if (!value) return 'Date non disponible';
  return new Date(value).toLocaleDateString('fr-TN');
};

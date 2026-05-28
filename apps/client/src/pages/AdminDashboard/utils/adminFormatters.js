export const ADMIN_PROPERTIES_PER_PAGE = 50;
export const DEFAULT_SOURCE_LISTING_MAX_AGE_DAYS = 365 * 3;
const DASHBOARD_ROLE_KEYS = ['client', 'agent_bancaire', 'admin'];
const DASHBOARD_SUGGESTION_STATUS_KEYS = ['pending', 'accepted', 'rejected', 'ignored'];

export function createEmptyDashboardSummary() {
  return {
    users: {
      total: 0,
      roles: {
        client: 0,
        agent_bancaire: 0,
        admin: 0,
      },
    },
    properties: {
      total: 0,
      active: 0,
      inactive: 0,
      adminCreated: 0,
      manualChanges: 0,
    },
    scrapeSites: {
      total: 0,
      active: 0,
      inactive: 0,
      pendingSpider: 0,
    },
    scrapeSiteSuggestions: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      ignored: 0,
    },
    reports: {
      total: 0,
      unread: 0,
      inReview: 0,
      resolved: 0,
      rejected: 0,
    },
  };
}

function toDashboardNumber(value) {
  return Number(value || 0);
}

export function normalizeDashboardSummary(summary = {}) {
  const empty = createEmptyDashboardSummary();

  return {
    ...empty,
    users: {
      ...empty.users,
      ...summary.users,
      total: toDashboardNumber(summary.users?.total),
      roles: DASHBOARD_ROLE_KEYS.reduce(
        (acc, key) => ({
          ...acc,
          [key]: toDashboardNumber(summary.users?.roles?.[key]),
        }),
        empty.users.roles,
      ),
    },
    properties: {
      ...empty.properties,
      ...summary.properties,
      total: toDashboardNumber(summary.properties?.total),
      active: toDashboardNumber(summary.properties?.active),
      inactive: toDashboardNumber(summary.properties?.inactive),
      adminCreated: toDashboardNumber(summary.properties?.adminCreated),
      manualChanges: toDashboardNumber(summary.properties?.manualChanges),
    },
    scrapeSites: {
      ...empty.scrapeSites,
      ...summary.scrapeSites,
      total: toDashboardNumber(summary.scrapeSites?.total),
      active: toDashboardNumber(summary.scrapeSites?.active),
      inactive: toDashboardNumber(summary.scrapeSites?.inactive),
      pendingSpider: toDashboardNumber(summary.scrapeSites?.pendingSpider),
    },
    scrapeSiteSuggestions: DASHBOARD_SUGGESTION_STATUS_KEYS.reduce(
      (acc, key) => ({
        ...acc,
        [key]: toDashboardNumber(summary.scrapeSiteSuggestions?.[key]),
      }),
      {
        total: toDashboardNumber(summary.scrapeSiteSuggestions?.total),
      },
    ),
    reports: {
      ...empty.reports,
      ...summary.reports,
      total: toDashboardNumber(summary.reports?.total),
      unread: toDashboardNumber(summary.reports?.unread),
      inReview: toDashboardNumber(summary.reports?.inReview),
      resolved: toDashboardNumber(summary.reports?.resolved),
      rejected: toDashboardNumber(summary.reports?.rejected),
    },
  };
}

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
];

export const SITE_SUGGESTION_STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'ignored', label: 'Ignorées' },
  { value: 'rejected', label: 'Rejetées' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'all', label: 'Toutes' },
];

const SITE_SUGGESTION_STATUS_LABELS = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Rejetée',
  ignored: 'Ignorée',
};

export const REPORT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes les réclamations' },
  { value: 'unread', label: 'Non lus' },
  { value: 'in_review', label: 'En revue' },
  { value: 'resolved', label: 'Résolus' },
  { value: 'rejected', label: 'Rejetées' },
];

const REPORT_CATEGORY_LABELS = {
  cannot_open_site: 'Impossible d’ouvrir le site source',
  bad_owner_experience: 'Mauvaise expérience avec le propriétaire',
  bad_agency_experience: 'Mauvaise expérience avec l’agence',
  scam_suspicion: 'Suspicion d’arnaque',
  incorrect_information: 'Informations incorrectes',
  other: 'Autre problème',
};

const REPORT_STATUS_LABELS = {
  unread: 'Non lu',
  in_review: 'En revue',
  resolved: 'Résolu',
  rejected: 'Rejeté',
};

const ROLE_LABELS = {
  client: 'Client',
  agent_bancaire: 'Agent bancaire',
  admin: 'Administrateur',
};

const PASSWORD_CHARSETS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%*-_',
];

function randomIndex(max) {
  const cryptoApi = typeof window !== 'undefined' ? window.crypto : null;
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function shuffleCharacters(characters) {
  const items = [...characters];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items.join('');
}

export function generateSecurePassword(length = 14) {
  const allCharacters = PASSWORD_CHARSETS.join('');
  const characters = PASSWORD_CHARSETS.map((charset) => charset[randomIndex(charset.length)]);

  while (characters.length < length) {
    characters.push(allCharacters[randomIndex(allCharacters.length)]);
  }

  return shuffleCharacters(characters);
}

export function normalizeRibInput(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

export function createEmptyUserForm() {
  return {
    name: '',
    email: '',
    password: '',
    role: 'client',
    rib_bancaire: '',
    generate_rib_bancaire: false,
    address: '',
    phone: '',
    matricule: '',
  };
}

export function createEmptySiteForm() {
  return {
    name: '',
    spider_name: '',
    base_url: '',
    start_url: '',
    description: '',
    is_active: true,
    integration_status: 'ready',
  };
}

export function createEmptyPropertyForm() {
  return {
    title: '',
    price_raw: '',
    price_value: '',
    location_raw: '',
    city: '',
    country: 'Tunisie',
    image: '',
    description: '',
    source: 'admin',
    url: '',
    scraped_at: '',
    is_active: true,
  };
}

export function formatRole(role) {
  return ROLE_LABELS[role] || role || '-';
}

export function formatDate(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR');
}

export function formatDateTime(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('fr-FR');
}

export function formatDateTimeLocalValue(dateLike) {
  if (!dateLike) return '';

  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';

  const pad = (value) => String(value).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function daysToYearsInput(daysLike) {
  const days = Number(daysLike || DEFAULT_SOURCE_LISTING_MAX_AGE_DAYS);
  if (!Number.isFinite(days) || days <= 0) return '3';
  return String(Math.max(1, Math.round(days / 365)));
}

export function yearsToDays(yearsLike) {
  const years = Number(yearsLike);
  return Number.isInteger(years) && years > 0 ? years * 365 : null;
}

export function formatPropertyPrice(property) {
  const numeric = Number(property?.price_value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
  }

  return property?.price_raw || 'Prix non communiqué';
}

export function formatReportCategory(category) {
  return REPORT_CATEGORY_LABELS[category] || category || 'Catégorie inconnue';
}

export function formatReportStatus(status) {
  return REPORT_STATUS_LABELS[status] || status || 'Inconnu';
}

export function getInitials(nameOrEmail) {
  const value = String(nameOrEmail || '').trim();
  if (!value) return 'U';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function formatScraperStatus(control) {
  if (!control) return 'Inconnu';

  switch (control.status) {
    case 'running':
      return 'Cycle en cours';
    case 'stopping':
      return 'Arrêt en cours';
    case 'error':
      return control.is_enabled ? 'Erreur, relance planifiée' : 'Erreur';
    case 'scheduled':
      return 'Automatique active';
    default:
      return control.is_enabled ? 'Automatique active' : 'Arrêté';
  }
}

export function formatScraperRunType(runType) {
  switch (runType) {
    case 'scraper_cycle':
      return 'Scraping + filtrage';
    case 'listing_cleaner':
      return 'Agent de filtrage';
    default:
      return 'Aucun run actif';
  }
}

export function formatSiteSuggestionStatus(status) {
  return SITE_SUGGESTION_STATUS_LABELS[status] || status || 'Inconnu';
}

export function formatEvidenceList(evidence, key) {
  const values = evidence?.[key];
  if (!Array.isArray(values) || values.length === 0) {
    return '-';
  }

  return values.slice(0, 5).join(', ');
}

export function formatDuration(secondsLike) {
  if (secondsLike === null || secondsLike === undefined || secondsLike === '') {
    return 'Calcul en cours';
  }

  const totalSeconds = Number(secondsLike);
  if (!Number.isFinite(totalSeconds)) {
    return 'Calcul en cours';
  }

  if (totalSeconds <= 0) {
    return 'Termine';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  if (minutes > 0) {
    return `${minutes}min ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

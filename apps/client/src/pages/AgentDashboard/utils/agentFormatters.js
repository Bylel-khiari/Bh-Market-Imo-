export const POWER_BI_AGENT_DASHBOARD_URL = String(process.env.REACT_APP_POWERBI_AGENT_DASHBOARD_URL || '').trim();
export const POWER_BI_AGENT_DASHBOARD_TITLE = String(
  process.env.REACT_APP_POWERBI_AGENT_DASHBOARD_TITLE || 'KPI agent bancaire Power BI',
).trim();

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'EN_VERIFICATION', label: 'En vÃ©rification' },
  { value: 'DOCUMENTS_MANQUANTS', label: 'PiÃ¨ces manquantes' },
  { value: 'EN_ETUDE', label: 'En Ã©tude' },
  { value: 'ACCEPTE', label: 'AcceptÃ©s' },
  { value: 'REFUSE', label: 'RefusÃ©s' },
];

export const STATUS_LABELS = {
  SOUMIS: 'Dossier soumis',
  EN_VERIFICATION: 'En vÃ©rification',
  DOCUMENTS_MANQUANTS: 'PiÃ¨ces manquantes',
  EN_ETUDE: 'En Ã©tude',
  ACCEPTE: 'AcceptÃ©',
  REFUSE: 'RefusÃ©',
};

export const STATUS_COLORS = {
  SOUMIS: '#cc0000',
  EN_VERIFICATION: '#0a4d8c',
  DOCUMENTS_MANQUANTS: '#ef7d00',
  EN_ETUDE: '#6d5dfc',
  ACCEPTE: '#2c7a4b',
  REFUSE: '#6b7280',
};

export const ACTIVITY_COLORS = {
  users: '#0d355a',
  properties: '#c21f3a',
  requests: '#d59a27',
  clientEvents: '#2c7a4b',
};

export const PIE_COLORS = ['#0d355a', '#c21f3a', '#d59a27', '#4f7b72', '#7886a0'];

export const SECTION_COPY = {
  overview: {
    title: 'Tableau de bord agent bancaire',
    subtitle: 'Suivi prioritaire des dossiers de crÃ©dit, contrÃ´le de conformitÃ© et retours client.',
  },
  applications: {
    title: 'Traitement des dossiers',
    subtitle: 'Analyse dÃ©taillÃ©e, vÃ©rification des piÃ¨ces et mise Ã  jour du statut client.',
  },
  platform: {
    title: 'KPI plateforme',
    subtitle: 'Lecture des biens, clients, rÃ©clamations dâ€™assistance et sources techniques utiles au traitement.',
  },
  powerbi: {
    title: 'Dashboard Power BI',
    subtitle: 'Espace dedie au dashboard Power BI agent bancaire.',
  },
};

export function createEmptySummary() {
  return {
    total: 0,
    SOUMIS: 0,
    EN_VERIFICATION: 0,
    DOCUMENTS_MANQUANTS: 0,
    EN_ETUDE: 0,
    ACCEPTE: 0,
    REFUSE: 0,
    average_compliance_score: 0,
  };
}

export function createEmptyPlatformDashboard() {
  return {
    summary: {},
    role_distribution: [],
    report_status_distribution: [],
    credit_application_summary: {},
    credit_application_status_distribution: [],
    monthly_activity: [],
    top_cities: [],
    top_sources: [],
    latest_users: [],
    latest_requests: [],
    latest_credit_applications: [],
    client_activity: {
      summary: {},
      event_distribution: [],
      monthly_events: [],
      top_regions: [],
      top_clients: [],
      latest_events: [],
    },
  };
}

export function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Non renseignÃ©';
  }

  return `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(Math.round(amount))} DT`;
}

export function formatPercent(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '-';
  }

  return `${amount.toFixed(1)}%`;
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
}

export function getApplicationDocuments(application) {
  if (!application) return [];

  if (Array.isArray(application.typed_documents) && application.typed_documents.length > 0) {
    return application.typed_documents.map((document, index) => ({
      key: `${document.type || 'document'}-${document.name || index}-${index}`,
      name: document.name || `Document ${index + 1}`,
      type: document.type || 'Document',
      index,
      hasFile: Boolean(document.has_file && document.view_url),
    }));
  }

  return (Array.isArray(application.documents) ? application.documents : []).map((documentName, index) => ({
    key: `${documentName}-${index}`,
    name: documentName,
    type: 'Document',
    index,
    hasFile: false,
  }));
}

export function formatStatus(status) {
  return STATUS_LABELS[status] || status || 'Inconnu';
}

export function formatQueueStatusLabel(option) {
  const labels = {
    all: 'Tous',
    SOUMIS: 'Soumis',
    EN_VERIFICATION: 'Verif.',
    DOCUMENTS_MANQUANTS: 'Pieces',
    EN_ETUDE: 'Etude',
    ACCEPTE: 'Accept.',
    REFUSE: 'Refus.',
  };

  return labels[option.value] || option.label;
}

export function formatMonthLabel(monthKey) {
  if (!monthKey) {
    return '-';
  }

  const [year, month] = String(monthKey).split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    year: '2-digit',
  }).format(date);
}

export function formatTextLabel(value) {
  if (!value) {
    return '-';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeStatusClass(status) {
  return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function escapeCsvCell(value) {
  const normalized = value == null ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getComplianceLabel(level) {
  if (level === 'solid') return 'Conforme';
  if (level === 'watch') return 'A surveiller';
  if (level === 'risk') return 'Risque';
  return 'Score Ã  calculer';
}

export function hasComplianceScore(application) {
  if (!application || application.compliance_score === null || application.compliance_score === undefined) {
    return false;
  }

  return Number.isFinite(Number(application.compliance_score));
}

export function formatComplianceScore(application) {
  if (!hasComplianceScore(application)) {
    return 'Ã€ calculer';
  }

  return `${Math.round(Number(application.compliance_score))}/100`;
}

export function getComplianceLabelForApplication(application) {
  if (!hasComplianceScore(application)) {
    return 'Score Ã  calculer';
  }

  return getComplianceLabel(application.compliance_level);
}

export function getInitials(value) {
  const source = String(value || '').trim();
  if (!source) return 'AG';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBan,
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaDownload,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileSignature,
  FaFolderOpen,
  FaHome,
  FaIdCard,
  FaMapMarkerAlt,
  FaMoneyCheckAlt,
  FaPhone,
  FaSearch,
  FaSignOutAlt,
  FaSyncAlt,
  FaUniversity,
  FaUsers,
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  clearAuthSession,
  fetchAgentDashboardApi,
  fetchAgentCreditApplicationsApi,
  fetchAgentProfileApi,
  isAuthError,
  requireAuthToken,
  updateAgentCreditApplicationApi,
} from '../lib/auth';
import '../styles/AdminDashboard.css';
import '../styles/AgentDashboard.css';

const POWER_BI_AGENT_DASHBOARD_URL = String(process.env.REACT_APP_POWERBI_AGENT_DASHBOARD_URL || '').trim();
const POWER_BI_AGENT_DASHBOARD_TITLE = String(
  process.env.REACT_APP_POWERBI_AGENT_DASHBOARD_TITLE || 'KPI agent bancaire Power BI',
).trim();

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'EN_VERIFICATION', label: 'En verification' },
  { value: 'DOCUMENTS_MANQUANTS', label: 'Pieces manquantes' },
  { value: 'EN_ETUDE', label: 'En etude' },
  { value: 'ACCEPTE', label: 'Acceptes' },
  { value: 'REFUSE', label: 'Refuses' },
];

const STATUS_LABELS = {
  SOUMIS: 'Dossier soumis',
  EN_VERIFICATION: 'En verification',
  DOCUMENTS_MANQUANTS: 'Pieces manquantes',
  EN_ETUDE: 'En etude',
  ACCEPTE: 'Accepte',
  REFUSE: 'Refuse',
};

const STATUS_COLORS = {
  SOUMIS: '#cc0000',
  EN_VERIFICATION: '#0a4d8c',
  DOCUMENTS_MANQUANTS: '#ef7d00',
  EN_ETUDE: '#6d5dfc',
  ACCEPTE: '#2c7a4b',
  REFUSE: '#6b7280',
};

const ACTIVITY_COLORS = {
  users: '#0d355a',
  properties: '#c21f3a',
  requests: '#d59a27',
};

const PIE_COLORS = ['#0d355a', '#c21f3a', '#d59a27', '#4f7b72', '#7886a0'];

const PERIOD_OPTIONS = [
  { value: '3m', label: '3 derniers mois', months: 3 },
  { value: '6m', label: '6 derniers mois', months: 6 },
  { value: '12m', label: '12 derniers mois', months: 12 },
];

const SECTION_COPY = {
  overview: {
    title: 'Dashboard agent bancaire',
    subtitle: 'Suivi prioritaire des dossiers de credit, controle de conformite et retours client.',
  },
  applications: {
    title: 'Traitement des dossiers',
    subtitle: 'Analyse detaillee, verification des pieces et mise a jour du statut client.',
  },
  platform: {
    title: 'KPI plateforme',
    subtitle: 'Lecture des biens, clients, reclamations support et sources techniques utiles au traitement.',
  },
};

function createEmptySummary() {
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

function createEmptyPlatformDashboard() {
  return {
    summary: {},
    role_distribution: [],
    report_status_distribution: [],
    monthly_activity: [],
    top_cities: [],
    top_sources: [],
    latest_users: [],
    latest_requests: [],
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Non renseigne';
  }

  return `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(Math.round(amount))} DT`;
}

function formatPercent(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '-';
  }

  return `${amount.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
}

function formatStatus(status) {
  return STATUS_LABELS[status] || status || 'Inconnu';
}

function formatMonthLabel(monthKey) {
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

function formatTextLabel(value) {
  if (!value) {
    return '-';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStatusClass(status) {
  return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function escapeCsvCell(value) {
  const normalized = value == null ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getComplianceLabel(level) {
  if (level === 'solid') return 'Conforme';
  if (level === 'watch') return 'A surveiller';
  if (level === 'risk') return 'Risque';
  return 'A noter';
}

function getInitials(value) {
  const source = String(value || '').trim();
  if (!source) return 'AG';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(createEmptySummary());
  const [platformDashboard, setPlatformDashboard] = useState(createEmptyPlatformDashboard());
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [draft, setDraft] = useState({
    status: 'SOUMIS',
    compliance_score: '',
    compliance_summary: '',
    agent_note: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectToLogin = useCallback(() => {
    clearAuthSession();
    navigate('/login', { replace: true, state: { from: '/agent/dashboard' } });
  }, [navigate]);

  const handleAuthFailure = useCallback((requestError) => {
    if (!isAuthError(requestError)) {
      return false;
    }

    redirectToLogin();
    return true;
  }, [redirectToLogin]);

  const loadDashboard = useCallback(async ({ status = 'all', searchTerm = '', silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setLoading(true);
      }

      setError('');

      const [profilePayload, queuePayload, platformPayload] = await Promise.all([
        fetchAgentProfileApi(token),
        fetchAgentCreditApplicationsApi(token, {
          limit: 150,
          status,
          search: searchTerm,
        }),
        fetchAgentDashboardApi(token),
      ]);

      setProfile(profilePayload?.profile || null);
      setApplications(Array.isArray(queuePayload?.applications) ? queuePayload.applications : []);
      setSummary(queuePayload?.summary || createEmptySummary());
      setPlatformDashboard(platformPayload || createEmptyPlatformDashboard());
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Erreur de chargement du dashboard agent.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    loadDashboard({ status: 'all', searchTerm: '' });
  }, [loadDashboard]);

  useEffect(() => {
    if (!applications.length) {
      setSelectedApplicationId(null);
      return;
    }

    const exists = applications.some((application) => String(application.id) === String(selectedApplicationId));

    if (!exists) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = useMemo(() => {
    if (!applications.length) return null;
    return (
      applications.find((application) => String(application.id) === String(selectedApplicationId)) ||
      applications[0]
    );
  }, [applications, selectedApplicationId]);

  useEffect(() => {
    if (!selectedApplication) {
      return;
    }

    setDraft({
      status: selectedApplication.status || 'SOUMIS',
      compliance_score:
        selectedApplication.compliance_score === null || selectedApplication.compliance_score === undefined
          ? ''
          : String(selectedApplication.compliance_score),
      compliance_summary: selectedApplication.compliance_summary || '',
      agent_note: selectedApplication.agent_note || '',
    });
    setFormMessage('');
  }, [selectedApplication]);

  const pageCopy = SECTION_COPY[activeSection] || SECTION_COPY.overview;
  const approvalRate = summary.total > 0 ? Math.round((summary.ACCEPTE / summary.total) * 100) : 0;
  const pendingCount =
    summary.SOUMIS + summary.EN_VERIFICATION + summary.DOCUMENTS_MANQUANTS + summary.EN_ETUDE;
  const hasPowerBiEmbed = /^https?:\/\//i.test(POWER_BI_AGENT_DASHBOARD_URL);
  const platformSummary = platformDashboard?.summary || {};
  const periodMonths =
    PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.months || PERIOD_OPTIONS[1].months;

  const overviewApplications = useMemo(() => {
    const ranked = applications.filter((application) =>
      ['SOUMIS', 'DOCUMENTS_MANQUANTS', 'EN_VERIFICATION', 'EN_ETUDE'].includes(application.status),
    );

    return (ranked.length ? ranked : applications).slice(0, 4);
  }, [applications]);

  const monthlyActivity = useMemo(() => {
    const series = Array.isArray(platformDashboard?.monthly_activity)
      ? platformDashboard.monthly_activity
      : [];

    return series.slice(-periodMonths).map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
    }));
  }, [platformDashboard, periodMonths]);

  const roleDistribution = useMemo(() => {
    return Array.isArray(platformDashboard?.role_distribution)
      ? platformDashboard.role_distribution.filter((item) => Number(item.value || 0) > 0)
      : [];
  }, [platformDashboard]);

  const reportStatusDistribution = useMemo(() => {
    return Array.isArray(platformDashboard?.report_status_distribution)
      ? platformDashboard.report_status_distribution.filter((item) => Number(item.value || 0) > 0)
      : [];
  }, [platformDashboard]);

  const topCities = platformDashboard?.top_cities || [];
  const topSources = platformDashboard?.top_sources || [];
  const latestUsers = platformDashboard?.latest_users || [];
  const latestRequests = platformDashboard?.latest_requests || [];
  const latestActivityPoint = monthlyActivity[monthlyActivity.length - 1] || {
    users: 0,
    properties: 0,
    requests: 0,
  };
  const previousActivityPoint = monthlyActivity[monthlyActivity.length - 2] || {
    users: 0,
    properties: 0,
    requests: 0,
  };
  const activityDelta =
    latestActivityPoint.users +
    latestActivityPoint.properties +
    latestActivityPoint.requests -
    (previousActivityPoint.users + previousActivityPoint.properties + previousActivityPoint.requests);

  const pieData = useMemo(() => {
    return STATUS_OPTIONS.slice(1)
      .map((option) => ({
        name: option.label,
        value: Number(summary[option.value] || 0),
        color: STATUS_COLORS[option.value],
      }))
      .filter((item) => item.value > 0);
  }, [summary]);

  const complianceData = useMemo(() => {
    return applications.slice(0, 6).map((application) => ({
      name: `#${application.id}`,
      score: Number(application.compliance_score || 0),
    }));
  }, [applications]);

  const handleLogout = () => {
    redirectToLogin();
  };

  const handleRefresh = () => {
    loadDashboard({ status: statusFilter, searchTerm: search });
  };

  const handleExportPlatformReport = () => {
    const rows = [
      ['Section', 'Indicateur', 'Valeur'],
      ['Synthese', 'Utilisateurs', platformSummary.total_users || 0],
      ['Synthese', 'Clients', platformSummary.total_clients || 0],
      ['Synthese', 'Agents bancaires', platformSummary.total_agents || 0],
      ['Synthese', 'Admins', platformSummary.total_admins || 0],
      ['Synthese', 'Biens immobiliers', platformSummary.total_properties || 0],
      ['Synthese', 'Biens actifs', platformSummary.active_properties || 0],
      ['Synthese', 'Reclamations support', platformSummary.total_reports || 0],
      ['Synthese', 'Reclamations cloturees', platformSummary.closed_reports || 0],
      ['Synthese', 'Taux de traitement support', `${platformSummary.resolution_rate || 0}%`],
      ...monthlyActivity.map((item) => [
        'Activite mensuelle',
        item.label,
        `${item.users}/${item.properties}/${item.requests}`,
      ]),
      ...topCities.map((item) => ['Top villes', item.city, item.total]),
      ...topSources.map((item) => ['Sources', item.source, item.total]),
      ...latestUsers.map((item) => ['Derniers utilisateurs', item.name || '-', `${item.role_label} - ${item.email || '-'}`]),
      ...latestRequests.map((item) => ['Dernieres reclamations', `#${item.id}`, `${item.status_label} - ${item.client_name || '-'}`]),
    ];

    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const filename = `rapport-agent-plateforme-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadDashboard({ status: statusFilter, searchTerm: search });
  };

  const handleFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    loadDashboard({ status: nextStatus, searchTerm: search });
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleReviewSubmit = async (nextStatus = draft.status) => {
    if (!selectedApplication) {
      return;
    }

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setError('');
      setFormMessage('');

      await updateAgentCreditApplicationApi(
        selectedApplication.id,
        {
          status: nextStatus,
          compliance_score: draft.compliance_score === '' ? null : Number(draft.compliance_score),
          compliance_summary: draft.compliance_summary.trim() || null,
          agent_note: draft.agent_note.trim() || null,
        },
        token,
      );

      setFormMessage('Dossier mis a jour avec succes.');
      await loadDashboard({ status: statusFilter, searchTerm: search, silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage('');
      setError(requestError.message || 'Impossible de mettre a jour ce dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--state agent-dashboard">
        <div className="admin-state admin-state--page">
          <FaSyncAlt className="spin" />
          <p>Chargement du dashboard agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard agent-dashboard">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-profile">
            <div className="admin-avatar">{getInitials(profile?.name || profile?.email)}</div>
            <div>
              <h3>{profile?.name || 'Agent bancaire'}</h3>
              <p>{profile?.matricule ? `Matricule ${profile.matricule}` : 'Traitement des dossiers BH Bank'}</p>
            </div>
          </div>

          <div className="admin-sidebar-menu">
            <button
              type="button"
              className={`menu-item ${activeSection === 'overview' ? 'is-active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <FaChartLine />
              <span>Apercu</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === 'applications' ? 'is-active' : ''}`}
              onClick={() => setActiveSection('applications')}
            >
              <FaFolderOpen />
              <span>Dossiers</span>
            </button>
            <button
              type="button"
              className={`menu-item ${activeSection === 'platform' ? 'is-active' : ''}`}
              onClick={() => setActiveSection('platform')}
            >
              <FaChartLine />
              <span>KPI plateforme</span>
            </button>
          </div>

          <div className="agent-sidebar-note">
            <p className="agent-sidebar-kicker">File active</p>
            <strong>{pendingCount} dossiers a suivre</strong>
            <span>{summary.ACCEPTE} accordes et {summary.REFUSE} refuses a date.</span>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <h1>{pageCopy.title}</h1>
              <p className="admin-subtitle">{pageCopy.subtitle}</p>
            </div>

            <div className="admin-topbar-actions">
              <button type="button" className="admin-icon-btn" onClick={handleRefresh} aria-label="Rafraichir">
                <FaSyncAlt />
              </button>
              <button type="button" className="admin-icon-btn" onClick={() => navigate('/')} aria-label="Accueil">
                <FaHome />
              </button>
              <button type="button" className="admin-topbar-btn admin-topbar-btn--logout" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Deconnexion</span>
              </button>
            </div>
          </header>

          {activeSection === 'overview' && (
            <div className="admin-content-grid">
              <div className="admin-analytics-column">
                <section className="admin-kpi-grid">
                  <article className="admin-kpi-card">
                    <div className="icon"><FaFolderOpen /></div>
                    <div>
                      <h3>Dossiers total</h3>
                      <p>{summary.total}</p>
                    </div>
                  </article>
                  <article className="admin-kpi-card">
                    <div className="icon"><FaClock /></div>
                    <div>
                      <h3>A traiter</h3>
                      <p>{pendingCount}</p>
                    </div>
                  </article>
                  <article className="admin-kpi-card">
                    <div className="icon"><FaCheckCircle /></div>
                    <div>
                      <h3>Taux d accord</h3>
                      <p>{approvalRate}%</p>
                    </div>
                  </article>
                  <article className="admin-kpi-card">
                    <div className="icon"><FaFileSignature /></div>
                    <div>
                      <h3>Score moyen</h3>
                      <p>{summary.average_compliance_score || 0}</p>
                    </div>
                  </article>
                </section>

                <div className="admin-row">
                  <section className="admin-card">
                    <h2>Repartition des statuts</h2>
                    <p className="admin-section-help">
                      Vue rapide pour identifier les dossiers a relancer, analyser ou cloturer.
                    </p>
                    {pieData.length ? (
                      <div className="agent-chart-wrap">
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={65}
                              outerRadius={92}
                              paddingAngle={3}
                            >
                              {pieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="admin-state admin-state--inline">
                        <FaExclamationTriangle />
                        <p>Aucun dossier disponible pour le moment.</p>
                      </div>
                    )}
                  </section>

                  <section className="admin-card">
                    <h2>Lecture conformite</h2>
                    <p className="admin-section-help">
                      Les premiers dossiers de la file montrent ici leur score de conformite.
                    </p>
                    {complianceData.length ? (
                      <div className="agent-chart-wrap">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={complianceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="score" radius={[8, 8, 0, 0]} fill="#0a4d8c" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="admin-state admin-state--inline">
                        <FaFileSignature />
                        <p>Le score de conformite apparaetra apres la premiere revue.</p>
                      </div>
                    )}
                  </section>
                </div>

                <section className="admin-card">
                  <div className="agent-section-head">
                    <div>
                      <h2>Dossiers prioritaires</h2>
                      <p className="admin-section-help">
                        Reprises rapides sur les dossiers qui demandent une analyse ou un complement.
                      </p>
                    </div>
                    <button type="button" className="admin-secondary" onClick={() => setActiveSection('applications')}>
                      Ouvrir la file
                    </button>
                  </div>

                  {overviewApplications.length ? (
                    <div className="agent-overview-list">
                      {overviewApplications.map((application) => (
                        <button
                          key={application.id}
                          type="button"
                          className="agent-overview-item"
                          onClick={() => {
                            setSelectedApplicationId(application.id);
                            setActiveSection('applications');
                          }}
                        >
                          <div>
                            <strong>{application.property_title || `Dossier #${application.id}`}</strong>
                            <span>{application.full_name}</span>
                          </div>
                          <div className="agent-overview-meta">
                            <span className={`admin-report-status-pill status-${normalizeStatusClass(application.status)}`}>
                              {formatStatus(application.status)}
                            </span>
                            <small>{formatDate(application.created_at)}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">Aucun dossier prioritaire a afficher.</p>
                  )}
                </section>
              </div>

              <aside className="admin-crud-column">
                <section className="admin-card agent-focus-card">
                  <h2>Dossier a la une</h2>
                  {selectedApplication ? (
                    <>
                      <p className="agent-focus-title">
                        {selectedApplication.property_title || `Demande #${selectedApplication.id}`}
                      </p>
                      <div className="agent-focus-grid">
                        <span>
                          <strong>Client</strong>
                          <small>{selectedApplication.full_name}</small>
                        </span>
                        <span>
                          <strong>Montant</strong>
                          <small>{formatCurrency(selectedApplication.requested_amount)}</small>
                        </span>
                        <span>
                          <strong>Dette</strong>
                          <small>{formatPercent(selectedApplication.debt_ratio)}</small>
                        </span>
                        <span>
                          <strong>Conformite</strong>
                          <small>{getComplianceLabel(selectedApplication.compliance_level)}</small>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-refresh"
                        onClick={() => setActiveSection('applications')}
                      >
                        Traiter ce dossier
                      </button>
                    </>
                  ) : (
                    <p className="admin-section-help">Aucun dossier selectionne.</p>
                  )}
                </section>

                <section className="admin-card agent-guide-card">
                  <h2>Points de controle</h2>
                  <ul className="agent-guide-list">
                    <li>Verifier la capacite de remboursement et le taux d endettement.</li>
                    <li>Controler la coherence des pieces transmises et du CIN.</li>
                    <li>Mettre a jour l etat du dossier pour informer le client.</li>
                    <li>Tracer une note claire avant acceptation ou refus.</li>
                  </ul>
                </section>
              </aside>
            </div>
          )}

          {activeSection === 'applications' && (
            <div className="admin-content-grid">
              <div className="admin-analytics-column">
                <section className="admin-card">
                  <div className="agent-section-head">
                    <div>
                      <h2>File des dossiers de credit</h2>
                      <p className="admin-section-help">
                        Recherchez un client, filtrez la file puis ouvrez un dossier pour analyse detaillee.
                      </p>
                    </div>
                    <span className="admin-users-count">{applications.length}</span>
                  </div>

                  <form className="admin-toolbar-row" onSubmit={handleSearchSubmit}>
                    <div className="agent-search-group">
                      <FaSearch />
                      <input
                        className="admin-search-input"
                        type="search"
                        placeholder="Nom client, email, CIN ou bien immobilier"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                    <button type="submit" className="admin-secondary">
                      Rechercher
                    </button>
                  </form>

                  <div className="admin-filter-chips" aria-label="Filtrer les dossiers par statut">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`admin-filter-chip ${statusFilter === option.value ? 'is-active' : ''}`}
                        onClick={() => handleFilterChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {formMessage && <p className="admin-form-message">{formMessage}</p>}
                  {error && <p className="admin-form-message admin-form-message--error">{error}</p>}

                  {applications.length ? (
                    <div className="agent-case-queue">
                      {applications.map((application) => (
                        <button
                          key={application.id}
                          type="button"
                          className={`agent-case-card ${
                            String(selectedApplicationId) === String(application.id) ? 'is-selected' : ''
                          }`}
                          onClick={() => setSelectedApplicationId(application.id)}
                        >
                          <div className="agent-case-head">
                            <div>
                              <h3>{application.property_title || `Dossier #${application.id}`}</h3>
                              <p>{application.full_name} - {application.email}</p>
                            </div>
                            <span className={`admin-report-status-pill status-${normalizeStatusClass(application.status)}`}>
                              {formatStatus(application.status)}
                            </span>
                          </div>

                          <div className="agent-case-metrics">
                            <span>
                              <strong>Montant</strong>
                              <small>{formatCurrency(application.requested_amount)}</small>
                            </span>
                            <span>
                              <strong>Dette</strong>
                              <small>{formatPercent(application.debt_ratio)}</small>
                            </span>
                            <span>
                              <strong>Score</strong>
                              <small>{application.compliance_score ?? '-'}</small>
                            </span>
                            <span>
                              <strong>Depot</strong>
                              <small>{formatDate(application.created_at)}</small>
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-state admin-state--inline">
                      <FaFolderOpen />
                      <p>Aucun dossier ne correspond aux filtres courants.</p>
                    </div>
                  )}
                </section>
              </div>

              <aside className="admin-crud-column">
                <section className="admin-card agent-review-card">
                  {selectedApplication ? (
                    <>
                      <div className="agent-review-head">
                        <div>
                          <h2>{selectedApplication.property_title || `Dossier #${selectedApplication.id}`}</h2>
                          <p className="admin-section-help">
                            Cree le {formatDate(selectedApplication.created_at)} par {selectedApplication.full_name}
                          </p>
                        </div>
                        <div className="agent-review-statuses">
                          <span className={`admin-report-status-pill status-${normalizeStatusClass(selectedApplication.status)}`}>
                            {formatStatus(selectedApplication.status)}
                          </span>
                          <span className={`agent-score-pill level-${selectedApplication.compliance_level}`}>
                            {getComplianceLabel(selectedApplication.compliance_level)}
                          </span>
                        </div>
                      </div>

                      <div className="agent-info-grid">
                        <span><FaEnvelope /> {selectedApplication.email}</span>
                        <span><FaPhone /> {selectedApplication.phone}</span>
                        <span><FaIdCard /> {selectedApplication.cin}</span>
                        <span><FaUniversity /> {selectedApplication.rib}</span>
                        <span><FaMapMarkerAlt /> {selectedApplication.property_location || 'Localisation non renseignee'}</span>
                        <span><FaMoneyCheckAlt /> {formatCurrency(selectedApplication.requested_amount)}</span>
                      </div>

                      <div className="agent-finance-grid">
                        <div className="agent-finance-card">
                          <strong>Apport</strong>
                          <span>{formatCurrency(selectedApplication.personal_contribution_value)}</span>
                        </div>
                        <div className="agent-finance-card">
                          <strong>Revenus</strong>
                          <span>{formatCurrency(selectedApplication.gross_income_value)}</span>
                        </div>
                        <div className="agent-finance-card">
                          <strong>Duree</strong>
                          <span>
                            {selectedApplication.duration_months ? `${selectedApplication.duration_months} mois` : 'Non renseignee'}
                          </span>
                        </div>
                        <div className="agent-finance-card">
                          <strong>Mensualite</strong>
                          <span>{formatCurrency(selectedApplication.estimated_monthly_payment)}</span>
                        </div>
                      </div>

                      <div className="agent-document-block">
                        <h3>Documents declares</h3>
                        {selectedApplication.documents?.length ? (
                          <div className="agent-document-list">
                            {selectedApplication.documents.map((documentName) => (
                              <span key={documentName} className="agent-document-pill">
                                {documentName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="admin-section-help">Aucun document n a ete declare dans le portail.</p>
                        )}
                      </div>

                      <div className="agent-review-form">
                        <label className="admin-field-block">
                          <span className="admin-field-label">Etat du dossier</span>
                          <select name="status" value={draft.status} onChange={handleDraftChange} disabled={submitting}>
                            {STATUS_OPTIONS.slice(1).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="admin-field-block">
                          <span className="admin-field-label">Score de conformite</span>
                          <input
                            name="compliance_score"
                            type="number"
                            min="0"
                            max="100"
                            value={draft.compliance_score}
                            onChange={handleDraftChange}
                            disabled={submitting}
                            placeholder="Ex: 78"
                          />
                        </label>

                        <label className="admin-field-block">
                          <span className="admin-field-label">Synthese conformite</span>
                          <textarea
                            name="compliance_summary"
                            rows={4}
                            value={draft.compliance_summary}
                            onChange={handleDraftChange}
                            disabled={submitting}
                            placeholder="Resume des controles, anomalies et conformites observees."
                          />
                        </label>

                        <label className="admin-field-block">
                          <span className="admin-field-label">Note agent</span>
                          <textarea
                            name="agent_note"
                            rows={4}
                            value={draft.agent_note}
                            onChange={handleDraftChange}
                            disabled={submitting}
                            placeholder="Elements a transmettre au client ou au back office."
                          />
                        </label>
                      </div>

                      <div className="agent-quick-actions">
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => handleReviewSubmit('EN_VERIFICATION')}
                          disabled={submitting}
                        >
                          Verifier documents
                        </button>
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => handleReviewSubmit('DOCUMENTS_MANQUANTS')}
                          disabled={submitting}
                        >
                          Demander pieces
                        </button>
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => handleReviewSubmit('EN_ETUDE')}
                          disabled={submitting}
                        >
                          Passer en etude
                        </button>
                        <button
                          type="button"
                          className="admin-refresh"
                          onClick={() => handleReviewSubmit('ACCEPTE')}
                          disabled={submitting}
                        >
                          <FaCheckCircle />
                          <span>Accepter</span>
                        </button>
                        <button
                          type="button"
                          className="admin-danger"
                          onClick={() => handleReviewSubmit('REFUSE')}
                          disabled={submitting}
                        >
                          <FaBan />
                          <span>Refuser</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="admin-refresh agent-save-btn"
                        onClick={() => handleReviewSubmit(draft.status)}
                        disabled={submitting}
                      >
                        {submitting ? 'Traitement...' : 'Enregistrer les modifications'}
                      </button>
                    </>
                  ) : (
                    <div className="admin-state admin-state--inline">
                      <FaFileSignature />
                      <p>Saisissez un dossier dans la file pour lancer l analyse.</p>
                    </div>
                  )}
                </section>
              </aside>
            </div>
          )}

          {activeSection === 'platform' && (
            <div className="admin-content-grid agent-platform-grid">
              <section className="admin-card agent-platform-toolbar">
                <div>
                  <h2>Vue plateforme consolidee</h2>
                  <p className="admin-section-help">
                    KPI utiles a l agent bancaire pour croiser dossiers de credit, portefeuille de biens et reclamations support.
                  </p>
                </div>
                <div className="agent-platform-actions">
                  <label className="admin-field-block agent-period-field">
                    <span className="admin-field-label">Periode observee</span>
                    <select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}>
                      {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="admin-secondary" onClick={handleExportPlatformReport}>
                    <FaDownload />
                    <span>Exporter</span>
                  </button>
                </div>
              </section>

              <section className="admin-kpi-grid">
                <article className="admin-kpi-card">
                  <div className="icon"><FaUsers /></div>
                  <div>
                    <h3>Utilisateurs</h3>
                    <p>{formatNumber(platformSummary.total_users)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaBuilding /></div>
                  <div>
                    <h3>Biens actifs</h3>
                    <p>{formatNumber(platformSummary.active_properties)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaClipboardList /></div>
                  <div>
                    <h3>Reclamations</h3>
                    <p>{formatNumber(platformSummary.total_reports)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaCheckCircle /></div>
                  <div>
                    <h3>Support traite</h3>
                    <p>{formatNumber(platformSummary.resolution_rate)}%</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaChartLine /></div>
                  <div>
                    <h3>Activite</h3>
                    <p>{activityDelta >= 0 ? `+${formatNumber(activityDelta)}` : formatNumber(activityDelta)}</p>
                  </div>
                </article>
              </section>

              {hasPowerBiEmbed ? (
                <section className="admin-card agent-platform-card--wide">
                  <h2>KPI Power BI</h2>
                  <p className="admin-section-help">Tableau Power BI integre a l espace agent bancaire.</p>
                  <div className="agent-powerbi-frame-wrap">
                    <iframe
                      src={POWER_BI_AGENT_DASHBOARD_URL}
                      title={POWER_BI_AGENT_DASHBOARD_TITLE}
                      className="agent-powerbi-frame"
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                </section>
              ) : null}

              <div className="admin-row">
                <section className="admin-card agent-platform-card--wide">
                  <h2>Activite plateforme par mois</h2>
                  <p className="admin-section-help">
                    Inscriptions, biens valides et reclamations support sur la periode selectionnee.
                  </p>
                  {monthlyActivity.length ? (
                    <div className="agent-chart-wrap">
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={monthlyActivity}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="users" stroke={ACTIVITY_COLORS.users} strokeWidth={3} name="Utilisateurs" />
                          <Line type="monotone" dataKey="properties" stroke={ACTIVITY_COLORS.properties} strokeWidth={3} name="Biens" />
                          <Line type="monotone" dataKey="requests" stroke={ACTIVITY_COLORS.requests} strokeWidth={3} name="Reclamations" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="admin-state admin-state--inline">
                      <FaChartLine />
                      <p>Aucune activite mensuelle disponible.</p>
                    </div>
                  )}
                </section>

                <section className="admin-card">
                  <h2>Repartition des roles</h2>
                  <p className="admin-section-help">Population active selon les trois roles autorises.</p>
                  {roleDistribution.length ? (
                    <div className="agent-chart-wrap">
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie data={roleDistribution} dataKey="value" nameKey="label" innerRadius={62} outerRadius={104} paddingAngle={4}>
                            {roleDistribution.map((entry, index) => (
                              <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="admin-state admin-state--inline">
                      <FaUsers />
                      <p>Aucune repartition disponible.</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="admin-row">
                <section className="admin-card">
                  <h2>Villes les plus actives</h2>
                  <p className="admin-section-help">Concentration des biens immobiliers valides par bassin geographique.</p>
                  {topCities.length ? (
                    <div className="agent-chart-wrap">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topCities}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="city" tickFormatter={formatTextLabel} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="total" fill="#0d355a" radius={[10, 10, 0, 0]} name="Biens" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="empty">Aucune ville a afficher.</p>
                  )}
                </section>

                <section className="admin-card">
                  <h2>Statut des reclamations</h2>
                  <p className="admin-section-help">Les reclamations restent un module support distinct du flux credit.</p>
                  {reportStatusDistribution.length ? (
                    <div className="agent-chart-wrap">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportStatusDistribution}
                            dataKey="value"
                            nameKey="label"
                            outerRadius={104}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {reportStatusDistribution.map((entry, index) => (
                              <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="empty">Aucune reclamation a afficher.</p>
                  )}
                </section>

                <section className="admin-card">
                  <h2>Sources techniques</h2>
                  <p className="admin-section-help">Origine des biens valides apres import depuis les sources de scraping.</p>
                  <div className="agent-source-list">
                    {topSources.length ? (
                      topSources.map((item, index) => (
                        <div key={`${item.source}-${index}`} className="agent-source-item">
                          <div>
                            <strong>{formatTextLabel(item.source)}</strong>
                            <span>{formatNumber(item.total)} biens</span>
                          </div>
                          <div className="agent-source-bar">
                            <span
                              style={{
                                width: `${Math.max(
                                  12,
                                  Math.round((Number(item.total || 0) / Number(topSources[0]?.total || 1)) * 100),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty">Aucune source a afficher.</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="admin-row">
                <section className="admin-card">
                  <h2>Derniers utilisateurs</h2>
                  <p className="admin-section-help">Consultation rapide des profils clients, agents et admins.</p>
                  <div className="agent-platform-table-wrap">
                    <table className="agent-platform-table">
                      <thead>
                        <tr>
                          <th>Utilisateur</th>
                          <th>Role</th>
                          <th>Creation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestUsers.length ? (
                          latestUsers.map((user) => (
                            <tr key={user.id}>
                              <td>
                                <strong>{user.name || 'Utilisateur'}</strong>
                                <span>{user.email || '-'}</span>
                              </td>
                              <td>{user.role_label || formatTextLabel(user.role)}</td>
                              <td>{formatDate(user.created_at)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3">Aucun utilisateur recent a afficher.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="admin-card">
                  <h2>Dernieres reclamations</h2>
                  <p className="admin-section-help">Vue compacte du support, separee du traitement des dossiers de credit.</p>
                  <div className="agent-platform-table-wrap">
                    <table className="agent-platform-table">
                      <thead>
                        <tr>
                          <th>Reclamation</th>
                          <th>Client</th>
                          <th>Statut</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestRequests.length ? (
                          latestRequests.map((request) => (
                            <tr key={request.id}>
                              <td>
                                <strong>#{request.id}</strong>
                                <span>{formatTextLabel(request.type)}</span>
                              </td>
                              <td>
                                <strong>{request.client_name || 'Client'}</strong>
                                <span>{request.client_email || '-'}</span>
                              </td>
                              <td>{request.status_label || formatTextLabel(request.status)}</td>
                              <td>{formatDate(request.created_at)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4">Aucune reclamation recente a afficher.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

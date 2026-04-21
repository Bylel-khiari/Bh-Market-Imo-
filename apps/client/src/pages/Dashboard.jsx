import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaExternalLinkAlt,
  FaDownload,
  FaExclamationTriangle,
  FaLayerGroup,
  FaMapMarkedAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  clearAuthSession,
  fetchDecisionDashboardApi,
  getAuthSession,
  requireAuthToken,
} from '../lib/auth';
import '../styles/Dashboard.css';

const POWER_BI_DECISION_URL = String(process.env.REACT_APP_POWERBI_DECISION_URL || '').trim();
const POWER_BI_DECISION_TITLE = String(
  process.env.REACT_APP_POWERBI_DECISION_TITLE || 'KPI decisionnels Power BI'
).trim();

const PERIOD_OPTIONS = [
  { value: '3m', label: '3 derniers mois', months: 3 },
  { value: '6m', label: '6 derniers mois', months: 6 },
  { value: '12m', label: '12 derniers mois', months: 12 },
];

const ACTIVITY_COLORS = {
  users: '#0d355a',
  properties: '#c21f3a',
  requests: '#d59a27',
};

const PIE_COLORS = ['#0d355a', '#c21f3a', '#d59a27', '#4f7b72', '#7886a0', '#e07a4f'];

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
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

export default function Dashboard() {
  const navigate = useNavigate();
  const hasPowerBiEmbed = /^https?:\/\//i.test(POWER_BI_DECISION_URL);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    const authSession = getAuthSession();

    if (!authSession?.token || authSession?.user?.role !== 'responsable_decisionnel') {
      navigate('/login', { replace: true, state: { from: '/dashboard' } });
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = requireAuthToken();
      const payload = await fetchDecisionDashboardApi(token);
      setDashboardData(payload);
    } catch (error) {
      const message = error?.message || 'Impossible de charger le dashboard decisionnel.';

      if (
        message.toLowerCase().includes('authorization') ||
        message.toLowerCase().includes('session') ||
        message.toLowerCase().includes('forbidden') ||
        message.toLowerCase().includes('401') ||
        message.toLowerCase().includes('403')
      ) {
        clearAuthSession();
        navigate('/login', { replace: true, state: { from: '/dashboard' } });
        return;
      }

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = dashboardData?.summary || {};
  const periodMonths =
    PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.months || PERIOD_OPTIONS[1].months;

  const monthlyActivity = useMemo(() => {
    const series = Array.isArray(dashboardData?.monthly_activity)
      ? dashboardData.monthly_activity
      : [];

    return series.slice(-periodMonths).map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
    }));
  }, [dashboardData, periodMonths]);

  const roleDistribution = useMemo(() => {
    return Array.isArray(dashboardData?.role_distribution)
      ? dashboardData.role_distribution.filter((item) => Number(item.value || 0) > 0)
      : [];
  }, [dashboardData]);

  const reportStatusDistribution = useMemo(() => {
    return Array.isArray(dashboardData?.report_status_distribution)
      ? dashboardData.report_status_distribution.filter((item) => Number(item.value || 0) > 0)
      : [];
  }, [dashboardData]);

  const topCities = dashboardData?.top_cities || [];
  const topSources = dashboardData?.top_sources || [];
  const latestUsers = dashboardData?.latest_users || [];
  const latestRequests = dashboardData?.latest_requests || [];
  const hasLocalData = Boolean(dashboardData);

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

  const heroInsights = [
    {
      title: 'Consulter les KPI de la plateforme',
      text: hasPowerBiEmbed
        ? 'Les indicateurs strategiques du responsable decisionnel sont affiches directement depuis Power BI.'
        : `${formatNumber(summary.total_users)} utilisateurs, ${formatNumber(summary.total_properties)} biens et ${formatNumber(summary.total_reports)} demandes client consolidees.`,
      icon: FaChartLine,
    },
    {
      title: "Analyser l'evolution du trafic",
      text: `${formatNumber(latestActivityPoint.users)} nouveaux comptes et ${formatNumber(latestActivityPoint.properties)} mouvements immobiliers sur la derniere periode visible.`,
      icon: FaLayerGroup,
    },
    {
      title: 'Consulter les donnees clients et demandes',
      text: `${formatNumber(summary.unread_reports)} demandes restent a traiter et ${formatNumber(summary.closed_reports)} ont deja ete cloturees.`,
      icon: FaClipboardList,
    },
  ];

  const kpiCards = [
    {
      title: 'Utilisateurs suivis',
      value: formatNumber(summary.total_users),
      caption: `${formatNumber(summary.total_clients)} clients et ${formatNumber(summary.total_agents)} agents bancaires`,
      icon: FaUsers,
      accent: 'navy',
    },
    {
      title: 'Responsables et admins',
      value: formatNumber((summary.total_decision_makers || 0) + (summary.total_admins || 0)),
      caption: `${formatNumber(summary.total_decision_makers)} decisionnels et ${formatNumber(summary.total_admins)} admins`,
      icon: FaUserTie,
      accent: 'emerald',
    },
    {
      title: 'Biens immobiliers actifs',
      value: formatNumber(summary.active_properties),
      caption: `${formatNumber(summary.inactive_properties)} biens inactifs dans le portefeuille`,
      icon: FaBuilding,
      accent: 'gold',
    },
    {
      title: 'Demandes clients',
      value: formatNumber(summary.total_reports),
      caption: `${formatNumber(summary.unread_reports)} nouvelles et ${formatNumber(summary.in_review_reports)} en cours`,
      icon: FaClipboardList,
      accent: 'red',
    },
    {
      title: 'Taux de traitement',
      value: `${formatNumber(summary.resolution_rate)}%`,
      caption: `${formatNumber(summary.closed_reports)} demandes cloturees`,
      icon: FaCheckCircle,
      accent: 'teal',
    },
    {
      title: 'Signal d activite',
      value: activityDelta >= 0 ? `+${formatNumber(activityDelta)}` : formatNumber(activityDelta),
      caption: 'Variation entre les deux derniers points de suivi',
      icon: FaMapMarkedAlt,
      accent: 'slate',
    },
  ];

  const handleExport = () => {
    if (!hasLocalData) {
      return;
    }

    const rows = [
      ['Section', 'Indicateur', 'Valeur'],
      ['Synthese', 'Utilisateurs', summary.total_users || 0],
      ['Synthese', 'Clients', summary.total_clients || 0],
      ['Synthese', 'Agents bancaires', summary.total_agents || 0],
      ['Synthese', 'Responsables decisionnels', summary.total_decision_makers || 0],
      ['Synthese', 'Admins', summary.total_admins || 0],
      ['Synthese', 'Biens immobiliers', summary.total_properties || 0],
      ['Synthese', 'Biens actifs', summary.active_properties || 0],
      ['Synthese', 'Demandes clients', summary.total_reports || 0],
      ['Synthese', 'Demandes cloturees', summary.closed_reports || 0],
      ['Synthese', 'Taux de traitement', `${summary.resolution_rate || 0}%`],
      ...monthlyActivity.map((item) => ['Activite mensuelle', item.label, `${item.users}/${item.properties}/${item.requests}`]),
      ...topCities.map((item) => ['Top villes', item.city, item.total]),
      ...topSources.map((item) => ['Sources', item.source, item.total]),
      ...latestUsers.map((item) => ['Derniers utilisateurs', item.name || '-', `${item.role_label} - ${item.email || '-'}`]),
      ...latestRequests.map((item) => ['Dernieres demandes', `#${item.id}`, `${item.status_label} - ${item.client_name || '-'}`]),
    ];

    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const filename = `rapport-decisionnel-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const handleOpenPowerBi = () => {
    if (!hasPowerBiEmbed) {
      return;
    }

    window.open(POWER_BI_DECISION_URL, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="decision-dashboard decision-dashboard--state">
        <div className="decision-state-card">
          <div className="decision-state-spinner" />
          <h2>Chargement du dashboard decisionnel</h2>
          <p>Consolidation des KPI, des demandes clients et des tendances immobiliere en cours.</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !hasPowerBiEmbed) {
    return (
      <div className="decision-dashboard decision-dashboard--state">
        <div className="decision-state-card decision-state-card--error">
          <FaExclamationTriangle />
          <h2>Le dashboard n a pas pu etre charge</h2>
          <p>{errorMessage}</p>
          <button type="button" className="decision-action-btn decision-action-btn--primary" onClick={loadDashboard}>
            <FaSyncAlt />
            <span>Reessayer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="decision-dashboard">
      <div className="decision-shell">
        <section className="decision-hero">
          <div className="decision-hero-copy">
            <span className="decision-kicker">Responsable decisionnel</span>
            <h1>Tableau de bord strategique de la marketplace immobiliere</h1>
            <p>
              {hasPowerBiEmbed
                ? 'Les KPI strategiques sont importes depuis Power BI, avec les donnees locales conservees comme lecture complementaire.'
                : 'Vue consolidee pour consulter les KPI de la plateforme, suivre les demandes client et analyser les signaux de croissance du portefeuille immobilier.'}
            </p>
          </div>

          <div className="decision-hero-actions">
            <label className="decision-filter" htmlFor="decision-period">
              <span>Periode observee</span>
              <select
                id="decision-period"
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="decision-action-group">
              <button type="button" className="decision-action-btn decision-action-btn--ghost" onClick={loadDashboard}>
                <FaSyncAlt />
                <span>Actualiser</span>
              </button>
              {hasPowerBiEmbed ? (
                <button type="button" className="decision-action-btn decision-action-btn--ghost" onClick={handleOpenPowerBi}>
                  <FaExternalLinkAlt />
                  <span>Ouvrir Power BI</span>
                </button>
              ) : null}
              <button type="button" className="decision-action-btn decision-action-btn--logout" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Deconnexion</span>
              </button>
              <button
                type="button"
                className="decision-action-btn decision-action-btn--primary"
                onClick={handleExport}
                disabled={!hasLocalData}
              >
                <FaDownload />
                <span>Exporter le rapport local</span>
              </button>
            </div>
          </div>
        </section>

        {hasPowerBiEmbed ? (
          <section className="decision-panel decision-powerbi-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Power BI</span>
                <h2>KPI decisionnels importes depuis Power BI</h2>
              </div>
              <p>
                Ce bloc devient la source principale des indicateurs lus par le responsable
                decisionnel.
              </p>
            </div>

            <div className="decision-powerbi-frame-wrap">
              <iframe
                src={POWER_BI_DECISION_URL}
                title={POWER_BI_DECISION_TITLE}
                className="decision-powerbi-frame"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </section>
        ) : (
          <>
            <section className="decision-powerbi-note">
              <div className="decision-powerbi-note__icon">
                <FaChartLine />
              </div>
              <div>
                <h2>Power BI n est pas encore configure</h2>
                <p>
                  Ajoute `REACT_APP_POWERBI_DECISION_URL` dans `apps/client/.env` pour afficher
                  les KPI du responsable decisionnel depuis Power BI.
                </p>
              </div>
            </section>

            <section className="decision-focus-grid">
              {heroInsights.map((item) => (
                <article key={item.title} className="decision-focus-card">
                  <div className="decision-focus-icon">
                    <item.icon />
                  </div>
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="decision-kpi-grid">
              {kpiCards.map((card) => (
                <article key={card.title} className={`decision-kpi-card decision-kpi-card--${card.accent}`}>
                  <div className="decision-kpi-head">
                    <span className="decision-kpi-icon">
                      <card.icon />
                    </span>
                    <span className="decision-kpi-title">{card.title}</span>
                  </div>
                  <strong className="decision-kpi-value">{card.value}</strong>
                  <p className="decision-kpi-caption">{card.caption}</p>
                </article>
              ))}
            </section>
          </>
        )}

        {errorMessage && hasPowerBiEmbed ? (
          <section className="decision-inline-warning">
            <FaExclamationTriangle />
            <p>
              Les donnees locales complementaires ne sont pas disponibles pour le moment : {errorMessage}
            </p>
          </section>
        ) : null}

        {hasLocalData ? (
          <>
            {hasPowerBiEmbed ? (
              <section className="decision-section-heading">
                <span className="decision-panel-tag">Donnees locales</span>
                <h2>Lecture operationnelle complementaire</h2>
                <p>
                  Ces vues internes completent Power BI avec les tendances recentes, les utilisateurs
                  et les demandes client.
                </p>
              </section>
            ) : null}

            <section className="decision-grid decision-grid--charts">
          <article className="decision-panel decision-panel--wide">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Evolution du trafic</span>
                <h2>Activite plateforme par mois</h2>
              </div>
              <p>
                Lecture croisee des inscriptions, des mises a jour de biens et des demandes
                client sur la periode selectionnee.
              </p>
            </div>

            <div className="decision-chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13, 53, 90, 0.12)" />
                  <XAxis dataKey="label" stroke="#607089" />
                  <YAxis stroke="#607089" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke={ACTIVITY_COLORS.users}
                    strokeWidth={3}
                    name="Utilisateurs"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="properties"
                    stroke={ACTIVITY_COLORS.properties}
                    strokeWidth={3}
                    name="Biens"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke={ACTIVITY_COLORS.requests}
                    strokeWidth={3}
                    name="Demandes"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="decision-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Population</span>
                <h2>Repartition des roles</h2>
              </div>
              <p>Vision immediate des profils engages sur la plateforme.</p>
            </div>

            <div className="decision-chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={104}
                    paddingAngle={4}
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
            </section>

            <section className="decision-grid">
          <article className="decision-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Portefeuille</span>
                <h2>Villes les plus actives</h2>
              </div>
              <p>Concentration des biens immobiliers visibles par bassin geographique.</p>
            </div>

            <div className="decision-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCities}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13, 53, 90, 0.10)" />
                  <XAxis dataKey="city" tickFormatter={formatTextLabel} stroke="#607089" />
                  <YAxis allowDecimals={false} stroke="#607089" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0d355a" radius={[10, 10, 0, 0]} name="Biens" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="decision-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Demandes</span>
                <h2>Statut des demandes clients</h2>
              </div>
              <p>Mesure rapide des demandes a traiter, en cours ou cloturees.</p>
            </div>

            <div className="decision-chart-wrap">
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
          </article>

          <article className="decision-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Sources</span>
                <h2>Origine des donnees immobilieres</h2>
              </div>
              <p>Lecture de la repartition des sources actuellement exploitees.</p>
            </div>

            <div className="decision-source-list">
              {topSources.length ? (
                topSources.map((item, index) => (
                  <div key={`${item.source}-${index}`} className="decision-source-item">
                    <div>
                      <strong>{formatTextLabel(item.source)}</strong>
                      <span>{formatNumber(item.total)} biens</span>
                    </div>
                    <div className="decision-source-bar">
                      <span
                        style={{
                          width: `${Math.max(
                            12,
                            Math.round((Number(item.total || 0) / Number(topSources[0]?.total || 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="decision-empty-note">Aucune source immobiliere n est disponible pour le moment.</p>
              )}
            </div>
          </article>
            </section>

            <section className="decision-grid">
          <article className="decision-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Clients</span>
                <h2>Derniers utilisateurs observes</h2>
              </div>
              <p>Pour consulter rapidement les nouveaux profils et leurs roles.</p>
            </div>

            <div className="decision-table-wrap">
              <table className="decision-table">
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
                          <div className="decision-table-identity">
                            <strong>{user.name || 'Utilisateur'}</strong>
                            <span>{user.email || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`decision-pill decision-pill--${normalizeStatusClass(user.role)}`}>
                            {user.role_label || formatTextLabel(user.role)}
                          </span>
                        </td>
                        <td>{formatDate(user.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="decision-empty-cell">
                        Aucun utilisateur recent a afficher.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="decision-panel">
            <div className="decision-panel-head">
              <div>
                <span className="decision-panel-tag">Demandes clients</span>
                <h2>Dernieres demandes a suivre</h2>
              </div>
              <p>Vision compacte des signalements et demandes recents.</p>
            </div>

            <div className="decision-table-wrap">
              <table className="decision-table">
                <thead>
                  <tr>
                    <th>Demande</th>
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
                          <div className="decision-table-identity">
                            <strong>#{request.id}</strong>
                            <span>{formatTextLabel(request.type)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="decision-table-identity">
                            <strong>{request.client_name || 'Client'}</strong>
                            <span>{request.client_email || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`decision-pill decision-pill--${normalizeStatusClass(request.status)}`}>
                            {request.status_label || formatTextLabel(request.status)}
                          </span>
                        </td>
                        <td>{formatDate(request.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="decision-empty-cell">
                        Aucune demande client n a ete enregistree.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

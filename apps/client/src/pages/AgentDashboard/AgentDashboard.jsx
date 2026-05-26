import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalculator,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaDownload,
  FaHome,
  FaMapMarkerAlt,
  FaMoneyCheckAlt,
  FaSignInAlt,
  FaSignOutAlt,
  FaSyncAlt,
} from 'react-icons/fa';
import {
  clearAuthSession,
  fetchAgentCreditApplicationDocumentApi,
  isAuthError,
  requireAuthToken,
  scoreAgentCreditApplicationApi,
  updateAgentCreditApplicationApi,
} from '../../lib/auth';
import PowerBiDashboardDock from '../../features/agent/components/PowerBiDashboardDock';
import AgentChartsSection from './components/AgentChartsSection';
import AgentSidebar from './components/AgentSidebar';
import AgentStatsCards from './components/AgentStatsCards';
import ClientJourneySection from './components/ClientJourneySection';
import CreditRequestsTable from './components/CreditRequestsTable';
import MarketplaceActivitySection from './components/MarketplaceActivitySection';
import useAgentDashboardData from './hooks/useAgentDashboardData';
import {
  POWER_BI_AGENT_DASHBOARD_TITLE,
  POWER_BI_AGENT_DASHBOARD_URL,
  SECTION_COPY,
  STATUS_COLORS,
  STATUS_OPTIONS,
  downloadTextFile,
  escapeCsvCell,
  formatDate,
  formatDateTime,
  formatMonthLabel,
  formatNumber,
  formatStatus,
  getApplicationDocuments,
  normalizeStatusClass,
} from './utils/agentFormatters';
import '../../styles/AdminDashboard.css';
import '../../styles/AgentDashboard.css';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [activeApplicationPanel, setActiveApplicationPanel] = useState('summary');
  const [draft, setDraft] = useState({
    status: 'SOUMIS',
    compliance_score: '',
    compliance_summary: '',
    agent_note: '',
  });
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openingDocumentKey, setOpeningDocumentKey] = useState('');

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

  const {
    applications,
    error,
    loadApplicationQueue,
    loadDashboard,
    loading,
    platformDashboard,
    profile,
    setError,
    summary,
  } = useAgentDashboardData(handleAuthFailure);

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

  const selectedApplicationDocuments = useMemo(
    () => getApplicationDocuments(selectedApplication),
    [selectedApplication],
  );

  useEffect(() => {
    setActiveApplicationPanel('summary');
  }, [selectedApplication?.id]);

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
  const platformSummary = platformDashboard?.summary || {};
  const creditApplicationSummary = platformDashboard?.credit_application_summary || {};
  const totalCreditApplications = Number(
    creditApplicationSummary.total ?? platformSummary.total_credit_applications ?? summary.total ?? 0,
  );
  const pendingCount = Number(
    creditApplicationSummary.pending ??
      platformSummary.pending_credit_applications ??
      summary.SOUMIS + summary.EN_VERIFICATION + summary.DOCUMENTS_MANQUANTS + summary.EN_ETUDE,
  );
  const acceptedCreditApplications = Number(
    creditApplicationSummary.accepted ?? platformSummary.accepted_credit_applications ?? summary.ACCEPTE ?? 0,
  );
  const refusedCreditApplications = Number(
    creditApplicationSummary.refused ?? platformSummary.refused_credit_applications ?? summary.REFUSE ?? 0,
  );
  const approvalRate = Number(
    creditApplicationSummary.approval_rate ??
      platformSummary.credit_approval_rate ??
      (totalCreditApplications > 0 ? Math.round((acceptedCreditApplications / totalCreditApplications) * 100) : 0),
  );
  const averageComplianceScore = Number(
    creditApplicationSummary.average_compliance_score ??
      platformSummary.average_compliance_score ??
      summary.average_compliance_score ??
      0,
  );
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
    const filteredSeries = selectedMonth === 'all'
      ? series
      : series.filter((item) => item.month === selectedMonth);

    return filteredSeries.map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
      creditApplications: Number(item.credit_applications || 0),
    }));
  }, [platformDashboard, selectedMonth]);

  const creditStatusDistribution = useMemo(() => {
    return Array.isArray(platformDashboard?.credit_application_status_distribution)
      ? platformDashboard.credit_application_status_distribution
      : [];
  }, [platformDashboard]);

  const topCities = platformDashboard?.top_cities || [];
  const topSources = platformDashboard?.top_sources || [];
  const latestUsers = platformDashboard?.latest_users || [];
  const latestRequests = platformDashboard?.latest_requests || [];
  const latestCreditApplications = useMemo(() => {
    return Array.isArray(platformDashboard?.latest_credit_applications)
      ? platformDashboard.latest_credit_applications
      : [];
  }, [platformDashboard]);
  const clientActivity = platformDashboard?.client_activity || {};
  const clientActivitySummary = clientActivity.summary || {};
  const creditSubmitConversionRate = Number(
    creditApplicationSummary.submit_conversion_rate ?? platformSummary.credit_submit_conversion_rate ?? 0,
  );
  const clientActivityDistribution = Array.isArray(clientActivity.event_distribution)
    ? clientActivity.event_distribution.filter((item) => Number(item.value || 0) > 0)
    : [];
  const latestClientEvents = Array.isArray(clientActivity.latest_events) ? clientActivity.latest_events : [];
  const topClientActivity = Array.isArray(clientActivity.top_clients) ? clientActivity.top_clients : [];
  const topRegionActivity = Array.isArray(clientActivity.top_regions) ? clientActivity.top_regions : [];
  const monthlyClientEvents = Array.isArray(clientActivity.monthly_events)
    ? clientActivity.monthly_events
        .filter((item) => selectedMonth === 'all' || item.month === selectedMonth)
        .map((item) => ({
          ...item,
          label: formatMonthLabel(item.month),
        }))
    : [];
  const dashboardMonthOptions = useMemo(() => {
    const months = new Set();

    if (Array.isArray(platformDashboard?.monthly_activity)) {
      platformDashboard.monthly_activity.forEach((item) => {
        if (item?.month) {
          months.add(item.month);
        }
      });
    }

    if (Array.isArray(clientActivity.monthly_events)) {
      clientActivity.monthly_events.forEach((item) => {
        if (item?.month) {
          months.add(item.month);
        }
      });
    }

    return [
      { value: 'all', label: 'Tous les mois' },
      ...Array.from(months)
        .sort()
        .reverse()
        .map((month) => ({
          value: month,
          label: formatMonthLabel(month),
        })),
    ];
  }, [clientActivity.monthly_events, platformDashboard]);
  const platformActivityTotal =
    monthlyActivity.reduce(
      (total, item) =>
        total +
        Number(item.users || 0) +
        Number(item.properties || 0) +
        Number(item.requests || 0) +
        Number(item.creditApplications || 0),
      0,
    ) +
    monthlyClientEvents.reduce((total, item) => total + Number(item.events || 0), 0);

  const pieData = useMemo(() => {
    const dbStatusData = creditStatusDistribution
      .map((item) => {
        const option = STATUS_OPTIONS.find((candidate) => candidate.value === item.key);

        return {
          name: option?.label || item.label || item.key,
          value: Number(item.value || 0),
          color: STATUS_COLORS[item.key] || '#0d355a',
        };
      })
      .filter((item) => item.value > 0);

    if (dbStatusData.length) {
      return dbStatusData;
    }

    return STATUS_OPTIONS.slice(1)
      .map((option) => ({
        name: option.label,
        value: Number(summary[option.value] || 0),
        color: STATUS_COLORS[option.value],
      }))
      .filter((item) => item.value > 0);
  }, [creditStatusDistribution, summary]);

  const handleLogout = () => {
    redirectToLogin();
  };

  const handleRefresh = () => {
    loadDashboard({ status: statusFilter, searchTerm: search.trim(), month: selectedMonth });
  };

  const handleMonthChange = (event) => {
    const nextMonth = event.target.value;
    setSelectedMonth(nextMonth);
    loadDashboard({ status: statusFilter, searchTerm: search.trim(), month: nextMonth });
  };

  const handleExportPlatformReport = () => {
    const rows = [
      ['Section', 'Indicateur', 'Valeur'],
      ['Filtre', 'Mois observe', selectedMonth === 'all' ? 'Tous les mois' : formatMonthLabel(selectedMonth)],
      ['SynthÃ¨se', 'Utilisateurs', platformSummary.total_users || 0],
      ['SynthÃ¨se', 'Clients', platformSummary.total_clients || 0],
      ['SynthÃ¨se', 'Agents bancaires', platformSummary.total_agents || 0],
      ['SynthÃ¨se', 'Admins', platformSummary.total_admins || 0],
      ['SynthÃ¨se', 'Biens immobiliers', platformSummary.total_properties || 0],
      ['SynthÃ¨se', 'Biens actifs', platformSummary.active_properties || 0],
      ['Parcours client', 'Connexions client', clientActivitySummary.client_logins || 0],
      ['Parcours client', 'Calculs de simulation crÃ©dit', clientActivitySummary.simulation_calculations || 0],
      ['Parcours client', 'Demandes de crÃ©dit dÃ©marrÃ©es', clientActivitySummary.credit_request_starts || 0],
      ['Parcours client', 'Demandes de crÃ©dit dÃ©posÃ©es', totalCreditApplications],
      ['Parcours client', 'RÃ©gions de carte sÃ©lectionnÃ©es', clientActivitySummary.map_region_selects || 0],
      ['SynthÃ¨se', 'RÃ©clamations assistance', platformSummary.total_reports || 0],
      ['SynthÃ¨se', 'RÃ©clamations clÃ´turÃ©es', platformSummary.closed_reports || 0],
      ['SynthÃ¨se', 'Taux de traitement assistance', `${platformSummary.resolution_rate || 0}%`],
      ['SynthÃ¨se', 'Conversion dÃ©pÃ´t crÃ©dit', `${creditSubmitConversionRate}%`],
      ...monthlyActivity.map((item) => [
        'Activite mensuelle',
        item.label,
        `${item.users}/${item.properties}/${item.requests}/${item.creditApplications}`,
      ]),
      ...monthlyClientEvents.map((item) => ['Logs client mensuels', item.label, item.events]),
      ...topCities.map((item) => ['Top villes', item.city, item.total]),
      ...topSources.map((item) => ['Sources', item.source, item.total]),
      ...topRegionActivity.map((item) => [
        'RÃ©gions les plus visitÃ©es',
        item.region || item.key,
        `${item.total} sÃ©lections - ${item.active_clients} clients`,
      ]),
      ...topClientActivity.map((item) => [
        'Clients actifs',
        item.name || item.email || `Client #${item.id}`,
        item.total_events,
      ]),
      ...latestUsers.map((item) => ['Derniers utilisateurs', item.name || '-', `${item.role_label} - ${item.email || '-'}`]),
      ...latestRequests.map((item) => ['DerniÃ¨res rÃ©clamations', `#${item.id}`, `${item.status_label} - ${item.client_name || '-'}`]),
      ...latestCreditApplications.map((item) => [
        'Derniers dossiers crÃ©dit',
        `#${item.id}`,
        `${item.status_label} - ${item.full_name || item.email || '-'}`,
      ]),
      ...latestClientEvents.map((item) => [
        'Derniers logs client',
        item.client_name || item.client_email || `Client #${item.client_user_id}`,
        `${item.event_label} - ${formatDateTime(item.created_at)}`,
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const filename = `rapport-agent-plateforme-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadApplicationQueue({ status: statusFilter, searchTerm: search.trim() });
  };

  const handleFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    loadApplicationQueue({ status: nextStatus, searchTerm: search.trim() });
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

      setFormMessage('Dossier mis Ã  jour avec succÃ¨s.');
      await loadApplicationQueue({ status: statusFilter, searchTerm: search.trim(), silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage('');
      setError(requestError.message || 'Impossible de mettre Ã  jour ce dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScoringSubmit = async () => {
    if (!selectedApplication) {
      return;
    }

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setError('');
      setFormMessage('');

      await scoreAgentCreditApplicationApi(selectedApplication.id, token);

      setFormMessage("Score calculÃ©. L'agent bancaire garde la dÃ©cision finale.");
      await loadApplicationQueue({ status: statusFilter, searchTerm: search.trim(), silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage('');
      setError(requestError.message || "Impossible de calculer le score de ce dossier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenApplicationDocument = async (document) => {
    if (!selectedApplication || !document?.hasFile) {
      return;
    }

    const documentWindow = window.open('about:blank', '_blank');
    if (documentWindow) {
      documentWindow.opener = null;
      documentWindow.document.title = 'Chargement du document';
      documentWindow.document.body.innerHTML = '<p style="font-family: sans-serif;">Chargement du document...</p>';
    }
    const documentKey = `${selectedApplication.id}-${document.index}`;

    try {
      const token = requireAuthToken();
      setOpeningDocumentKey(documentKey);
      setError('');

      const { blob } = await fetchAgentCreditApplicationDocumentApi(
        selectedApplication.id,
        document.index,
        token,
      );
      const objectUrl = URL.createObjectURL(blob);

      if (documentWindow) {
        documentWindow.location.href = objectUrl;
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (requestError) {
      if (documentWindow) {
        documentWindow.close();
      }

      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Impossible d ouvrir ce document.');
    } finally {
      setOpeningDocumentKey('');
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--state agent-dashboard">
        <div className="admin-state admin-state--page">
          <FaSyncAlt className="spin" />
          <p>Chargement du tableau de bord agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard agent-dashboard">
      <div className="admin-shell">
        <AgentSidebar
          acceptedCreditApplications={acceptedCreditApplications}
          activeSection={activeSection}
          pendingCount={pendingCount}
          profile={profile}
          refusedCreditApplications={refusedCreditApplications}
          setActiveSection={setActiveSection}
        />

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
                <span>DÃ©connexion</span>
              </button>
            </div>
          </header>

          {activeSection === 'overview' && (
            <div className="admin-content-grid admin-content-single">
              <div className="admin-analytics-column">
                <AgentStatsCards
                  approvalRate={approvalRate}
                  averageComplianceScore={averageComplianceScore}
                  pendingCount={pendingCount}
                  totalCreditApplications={totalCreditApplications}
                />

                <AgentChartsSection pieData={pieData} />

                <section className="admin-card">
                  <div className="agent-section-head">
                    <div>
                      <h2>Dossiers prioritaires</h2>
                      <p className="admin-section-help">
                        Reprises rapides sur les dossiers qui demandent une analyse ou un complÃ©ment.
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
                    <p className="empty">Aucun dossier prioritaire Ã  afficher.</p>
                  )}
                </section>
              </div>
            </div>
          )}

          {activeSection === 'applications' && (
            <CreditRequestsTable
              activeApplicationPanel={activeApplicationPanel}
              applications={applications}
              draft={draft}
              error={error}
              formMessage={formMessage}
              handleDraftChange={handleDraftChange}
              handleFilterChange={handleFilterChange}
              handleOpenApplicationDocument={handleOpenApplicationDocument}
              handleReviewSubmit={handleReviewSubmit}
              handleScoringSubmit={handleScoringSubmit}
              handleSearchSubmit={handleSearchSubmit}
              openingDocumentKey={openingDocumentKey}
              search={search}
              selectedApplication={selectedApplication}
              selectedApplicationDocuments={selectedApplicationDocuments}
              selectedApplicationId={selectedApplicationId}
              setActiveApplicationPanel={setActiveApplicationPanel}
              setSearch={setSearch}
              setSelectedApplicationId={setSelectedApplicationId}
              statusFilter={statusFilter}
              submitting={submitting}
            />
          )}

          {activeSection === 'platform' && (
            <div className="admin-content-grid agent-platform-grid">
              <section className="admin-card agent-platform-toolbar">
                <div>
                  <h2>Vue plateforme consolidÃ©e</h2>
                  <p className="admin-section-help">
                    KPI utiles Ã  lâ€™agent bancaire pour croiser dossiers de crÃ©dit, portefeuille de biens et rÃ©clamations dâ€™assistance.
                  </p>
                </div>
                <div className="agent-platform-actions">
                  <label className="admin-field-block agent-period-field">
                    <span className="admin-field-label">Mois observe</span>
                    <select value={selectedMonth} onChange={handleMonthChange}>
                      {dashboardMonthOptions.map((option) => (
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

              <section className="admin-kpi-grid agent-platform-kpi-grid">
                <article className="admin-kpi-card">
                  <div className="icon"><FaClipboardList /></div>
                  <div>
                    <h3>RÃ©clamations</h3>
                    <p>{formatNumber(platformSummary.total_reports)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaCheckCircle /></div>
                  <div>
                    <h3>Assistance traitÃ©e</h3>
                    <p>{formatNumber(platformSummary.resolution_rate)}%</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaChartLine /></div>
                  <div>
                    <h3>Activite</h3>
                    <p>{formatNumber(platformActivityTotal)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaCalculator /></div>
                  <div>
                    <h3>Calculs credit</h3>
                    <p>{formatNumber(clientActivitySummary.simulation_calculations)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaMoneyCheckAlt /></div>
                  <div>
                    <h3>Intentions credit</h3>
                    <p>{formatNumber(clientActivitySummary.credit_request_starts)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaClipboardList /></div>
                  <div>
                    <h3>Dossiers deposes</h3>
                    <p>{formatNumber(totalCreditApplications)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaCheckCircle /></div>
                  <div>
                    <h3>Conversion depot</h3>
                    <p>{formatNumber(creditSubmitConversionRate)}%</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaSignInAlt /></div>
                  <div>
                    <h3>Connexions client</h3>
                    <p>{formatNumber(clientActivitySummary.client_logins)}</p>
                  </div>
                </article>
                <article className="admin-kpi-card">
                  <div className="icon"><FaMapMarkerAlt /></div>
                  <div>
                    <h3>Regions map</h3>
                    <p>{formatNumber(clientActivitySummary.map_region_selects)}</p>
                  </div>
                </article>
              </section>

              <ClientJourneySection
                clientActivityDistribution={clientActivityDistribution}
                monthlyActivity={monthlyActivity}
                monthlyClientEvents={monthlyClientEvents}
              />

              <MarketplaceActivitySection topCities={topCities} />
            </div>
          )}

          {activeSection === 'powerbi' && (
            <div className="admin-content-grid agent-platform-grid agent-powerbi-grid">
              <PowerBiDashboardDock
                defaultEmbedUrl={POWER_BI_AGENT_DASHBOARD_URL}
                defaultTitle={POWER_BI_AGENT_DASHBOARD_TITLE}
                onExportPlatformReport={handleExportPlatformReport}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

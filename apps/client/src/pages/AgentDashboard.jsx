import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBan,
  FaChartLine,
  FaCheckCircle,
  FaClock,
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
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  clearAuthSession,
  fetchAgentCreditApplicationsApi,
  fetchAgentProfileApi,
  requireAuthToken,
  updateAgentCreditApplicationApi,
} from '../lib/auth';
import '../styles/AdminDashboard.css';
import '../styles/AgentDashboard.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'submitted', label: 'Nouveaux' },
  { value: 'under_review', label: 'En analyse' },
  { value: 'documents_pending', label: 'Pieces manquantes' },
  { value: 'approved', label: 'Acceptes' },
  { value: 'rejected', label: 'Refuses' },
];

const STATUS_LABELS = {
  submitted: 'Nouveau dossier',
  under_review: 'En analyse',
  documents_pending: 'Pieces manquantes',
  approved: 'Accepte',
  rejected: 'Refuse',
};

const STATUS_COLORS = {
  submitted: '#cc0000',
  under_review: '#ef7d00',
  documents_pending: '#0a4d8c',
  approved: '#2c7a4b',
  rejected: '#6b7280',
};

const SECTION_COPY = {
  overview: {
    title: 'Dashboard agent bancaire',
    subtitle: 'Suivi prioritaire des dossiers de credit, controle de conformite et decisions client.',
  },
  applications: {
    title: 'Traitement des dossiers',
    subtitle: 'Analyse detaillee, mise a jour de l etat du dossier et decision finale.',
  },
};

function createEmptySummary() {
  return {
    total: 0,
    submitted: 0,
    under_review: 0,
    documents_pending: 0,
    approved: 0,
    rejected: 0,
    average_compliance_score: 0,
  };
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [draft, setDraft] = useState({
    status: 'submitted',
    compliance_score: '',
    compliance_summary: '',
    agent_note: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = useCallback(async ({ status = 'all', searchTerm = '', silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setLoading(true);
      }

      setError('');

      const [profilePayload, queuePayload] = await Promise.all([
        fetchAgentProfileApi(token),
        fetchAgentCreditApplicationsApi(token, {
          limit: 150,
          status,
          search: searchTerm,
        }),
      ]);

      setProfile(profilePayload?.profile || null);
      setApplications(Array.isArray(queuePayload?.applications) ? queuePayload.applications : []);
      setSummary(queuePayload?.summary || createEmptySummary());
    } catch (requestError) {
      setError(requestError.message || 'Erreur de chargement du dashboard agent.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

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
      status: selectedApplication.status || 'submitted',
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
  const approvalRate = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;
  const pendingCount = summary.submitted + summary.under_review + summary.documents_pending;

  const overviewApplications = useMemo(() => {
    const ranked = applications.filter((application) =>
      ['submitted', 'documents_pending', 'under_review'].includes(application.status),
    );

    return (ranked.length ? ranked : applications).slice(0, 4);
  }, [applications]);

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
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const handleRefresh = () => {
    loadDashboard({ status: statusFilter, searchTerm: search });
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
          </div>

          <div className="agent-sidebar-note">
            <p className="agent-sidebar-kicker">File active</p>
            <strong>{pendingCount} dossiers a suivre</strong>
            <span>{summary.approved} accordes et {summary.rejected} refuses a date.</span>
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
                            <span className={`admin-report-status-pill status-${application.status}`}>
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
                            <span className={`admin-report-status-pill status-${application.status}`}>
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
                          <span className={`admin-report-status-pill status-${selectedApplication.status}`}>
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
                          onClick={() => handleReviewSubmit('under_review')}
                          disabled={submitting}
                        >
                          Passer en analyse
                        </button>
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => handleReviewSubmit('documents_pending')}
                          disabled={submitting}
                        >
                          Demander pieces
                        </button>
                        <button
                          type="button"
                          className="admin-refresh"
                          onClick={() => handleReviewSubmit('approved')}
                          disabled={submitting}
                        >
                          <FaCheckCircle />
                          <span>Accepter</span>
                        </button>
                        <button
                          type="button"
                          className="admin-danger"
                          onClick={() => handleReviewSubmit('rejected')}
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
        </div>
      </div>
    </div>
  );
}

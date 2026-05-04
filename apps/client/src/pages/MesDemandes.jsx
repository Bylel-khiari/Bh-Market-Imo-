import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaClipboardList,
  FaExclamationTriangle,
  FaFileAlt,
  FaHome,
  FaLock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaTimesCircle,
  FaUniversity,
  FaUser,
} from 'react-icons/fa';
import {
  clearAuthSession,
  fetchClientCreditApplicationsApi,
  getAuthSession,
  isAuthError,
} from '../lib/auth';
import '../styles/MesDemandes.css';

const FINAL_STATUSES = new Set(['ACCEPTE', 'REFUSE']);

const STATUS_META = {
  SOUMIS: {
    label: 'Soumis',
    tone: 'submitted',
    icon: FaClock,
  },
  EN_VERIFICATION: {
    label: 'En vérification',
    tone: 'review',
    icon: FaClipboardList,
  },
  DOCUMENTS_MANQUANTS: {
    label: 'Pièces manquantes',
    tone: 'warning',
    icon: FaExclamationTriangle,
  },
  EN_ETUDE: {
    label: 'En étude',
    tone: 'study',
    icon: FaClipboardList,
  },
  ACCEPTE: {
    label: 'Accepté',
    tone: 'accepted',
    icon: FaCheckCircle,
  },
  REFUSE: {
    label: 'Refusé',
    tone: 'refused',
    icon: FaTimesCircle,
  },
};

function getStatusMeta(status) {
  return STATUS_META[status] || {
    label: status || 'Inconnu',
    tone: 'unknown',
    icon: FaClipboardList,
  };
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(value) {
  if (!value) return 'Non renseigné';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Non renseigné';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatMoney(value, fallback = 'Non renseigné') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
}

function formatPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : 'Non renseigné';
}

function displayValue(value, fallback = 'Non renseigné') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function getDecisionMotif(application) {
  if (!application) return null;

  return (
    application.decision_motif ||
    application.agent_note ||
    application.compliance_summary ||
    (application.status === 'ACCEPTE'
      ? 'Demande acceptée après analyse bancaire.'
      : application.status === 'REFUSE'
        ? 'Demande refusée après analyse bancaire.'
        : null)
  );
}

function getApplicationTitle(application) {
  if (!application) return 'Demande de crédit';
  return application.property_title || 'Demande de crédit immobilier';
}

function getClientDisplayName(application) {
  return (
    application?.full_name ||
    application?.client_name ||
    application?.client_account_email ||
    'Client'
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="mes-demandes-info-item">
      <span className="mes-demandes-info-icon">
        <Icon />
      </span>
      <span>
        <strong>{label}</strong>
        <small>{value}</small>
      </span>
    </div>
  );
}

const MesDemandes = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadApplications() {
      const session = getAuthSession();

      if (!session?.token) {
        navigate('/login');
        return;
      }

      if (session?.user?.role && session.user.role !== 'client') {
        navigate('/');
        return;
      }

      try {
        const payload = await fetchClientCreditApplicationsApi(session.token, 100);
        const rows = Array.isArray(payload.applications) ? payload.applications : [];

        if (!ignore) {
          setApplications(rows);
          setSelectedId((currentSelectedId) => currentSelectedId || rows[0]?.id || null);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          if (isAuthError(err)) {
            clearAuthSession();
            navigate('/login');
            return;
          }

          setError(err.message || 'Impossible de charger vos demandes de crédit.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const stats = useMemo(() => {
    const total = applications.length;
    const accepted = applications.filter((app) => app.status === 'ACCEPTE').length;
    const refused = applications.filter((app) => app.status === 'REFUSE').length;
    const pending = applications.filter((app) => !FINAL_STATUSES.has(app.status)).length;
    const notifications = applications.filter(
      (app) => FINAL_STATUSES.has(app.status) && app.client_notified_at,
    ).length;

    return { total, accepted, refused, pending, notifications };
  }, [applications]);

  const selectedApplication =
    applications.find((application) => application.id === selectedId) || applications[0] || null;

  const latestNotification = useMemo(() => {
    return applications
      .filter((application) => FINAL_STATUSES.has(application.status))
      .slice()
      .sort((a, b) => {
        const aDate = toTimestamp(a.client_notified_at || a.reviewed_at || a.updated_at);
        const bDate = toTimestamp(b.client_notified_at || b.reviewed_at || b.updated_at);
        return bDate - aDate;
      })[0] || null;
  }, [applications]);

  const selectedStatus = getStatusMeta(selectedApplication?.status);
  const SelectedStatusIcon = selectedStatus.icon;
  const decisionMotif = getDecisionMotif(selectedApplication);
  const selectedDocuments = selectedApplication?.typed_documents?.length
    ? selectedApplication.typed_documents
    : (selectedApplication?.documents || []).map((name) => ({ name, type: 'Document' }));

  return (
    <div className="mes-demandes-page">
      <div className="container mes-demandes-container">
        <header className="mes-demandes-header">
          <div>
            <span className="mes-demandes-eyebrow">Espace client</span>
            <h1>Mes demandes</h1>
            <p>Suivi bancaire des demandes de crédit déposées sur BH Market Imo.</p>
          </div>
          <div className="mes-demandes-header-actions">
            <span className="mes-demandes-readonly-pill">
              <FaLock /> Dossiers non modifiables
            </span>
            <Link to="/credit-immobilier-bh" className="mes-demandes-new-link">
              Nouvelle demande
            </Link>
          </div>
        </header>

        <section className="mes-demandes-stats" aria-label="Synthèse des demandes">
          <article>
            <strong>{stats.total}</strong>
            <span>Total demandes</span>
          </article>
          <article>
            <strong>{stats.pending}</strong>
            <span>En traitement</span>
          </article>
          <article>
            <strong>{stats.accepted}</strong>
            <span>Acceptées</span>
          </article>
          <article>
            <strong>{stats.refused}</strong>
            <span>Refusées</span>
          </article>
        </section>

        {latestNotification ? (
          <section
            className={`mes-demandes-notification notification-${getStatusMeta(latestNotification.status).tone}`}
          >
            <div className="mes-demandes-notification-icon">
              <FaBell />
            </div>
            <div>
              <span>Notification bancaire</span>
              <h2>
                {getApplicationTitle(latestNotification)} -
                {getClientDisplayName(latestNotification)} -
                {' '}
                {getStatusMeta(latestNotification.status).label}
              </h2>
              <p>{getDecisionMotif(latestNotification)}</p>
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className="mes-demandes-empty">
            <FaClock />
            <h2>Chargement des demandes...</h2>
          </section>
        ) : error ? (
          <section className="mes-demandes-empty mes-demandes-empty--error">
            <FaExclamationTriangle />
            <h2>{error}</h2>
          </section>
        ) : applications.length === 0 ? (
          <section className="mes-demandes-empty">
            <FaClipboardList />
            <h2>Aucune demande déposée</h2>
            <p>Votre prochaine demande apparaîtra ici après dépôt.</p>
            <Link to="/credit-immobilier-bh" className="mes-demandes-new-link">
              Déposer une demande
            </Link>
          </section>
        ) : (
          <div className="mes-demandes-workspace">
            <aside className="mes-demandes-list-panel" aria-label="Liste des demandes">
              <div className="mes-demandes-list-head">
                <div>
                  <h2>File client</h2>
                  <p>{applications.length} dossier{applications.length > 1 ? 's' : ''}</p>
                </div>
                {stats.notifications > 0 ? (
                  <span className="mes-demandes-list-badge">{stats.notifications}</span>
                ) : null}
              </div>

              <div className="mes-demandes-list">
                {applications.map((application) => {
                  const meta = getStatusMeta(application.status);
                  const StatusIcon = meta.icon;
                  const isSelected = selectedApplication?.id === application.id;

                  return (
                    <button
                      type="button"
                      key={application.id}
                      className={`mes-demandes-list-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(application.id)}
                    >
                      <span className={`mes-demandes-mini-status status-${meta.tone}`}>
                        <StatusIcon /> {meta.label}
                      </span>
                      <strong>{getApplicationTitle(application)}</strong>
                      <small>{getClientDisplayName(application)}</small>
                      <span className="mes-demandes-list-meta">
                        Déposé le {formatDate(application.created_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="mes-demandes-detail-panel" aria-label="Détail de la demande">
              <div className="mes-demandes-detail-head">
                <div>
                  <span className="mes-demandes-eyebrow">Dossier client</span>
                  <h2>{getApplicationTitle(selectedApplication)}</h2>
                  <p>Déposé le {formatDate(selectedApplication.created_at)}</p>
                </div>
                <span className={`mes-demandes-status status-${selectedStatus.tone}`}>
                  <SelectedStatusIcon /> {selectedStatus.label}
                </span>
              </div>

              <div className="mes-demandes-decision-row">
                <div>
                  <span>Score bancaire</span>
                  <strong>
                    {selectedApplication.compliance_score === null ||
                    selectedApplication.compliance_score === undefined
                      ? 'À calculer'
                      : `${selectedApplication.compliance_score}/100`}
                  </strong>
                </div>
                <div>
                  <span>Décision</span>
                  <strong>{selectedStatus.label}</strong>
                </div>
                <div>
                  <span>Date décision</span>
                  <strong>{formatDate(selectedApplication.reviewed_at || selectedApplication.updated_at)}</strong>
                </div>
              </div>

              <article className="mes-demandes-motif-card">
                <div className="mes-demandes-card-title">
                  <FaUniversity />
                  <h3>Motif bancaire</h3>
                </div>
                <p>
                  {decisionMotif ||
                    'Le motif sera affiché après la décision finale de la banque.'}
                </p>
              </article>

              <div className="mes-demandes-detail-grid">
                <article>
                  <div className="mes-demandes-card-title">
                    <FaUser />
                    <h3>Client</h3>
                  </div>
                  <DetailItem icon={FaUser} label="Nom" value={displayValue(selectedApplication.full_name || selectedApplication.client_name)} />
                  <DetailItem icon={FaFileAlt} label="CIN" value={displayValue(selectedApplication.cin)} />
                  <DetailItem icon={FaUniversity} label="RIB" value={displayValue(selectedApplication.rib)} />
                </article>

                <article>
                  <div className="mes-demandes-card-title">
                    <FaHome />
                    <h3>Bien immobilier</h3>
                  </div>
                  <DetailItem icon={FaHome} label="Bien" value={displayValue(selectedApplication.property_title)} />
                  <DetailItem icon={FaMapMarkerAlt} label="Localisation" value={displayValue(selectedApplication.property_location)} />
                  <DetailItem icon={FaMoneyBillWave} label="Prix" value={formatMoney(selectedApplication.property_price_value, selectedApplication.property_price_raw || 'Non renseigné')} />
                </article>

                <article>
                  <div className="mes-demandes-card-title">
                    <FaMoneyBillWave />
                    <h3>Financement</h3>
                  </div>
                  <DetailItem icon={FaMoneyBillWave} label="Montant demandé" value={formatMoney(selectedApplication.requested_amount)} />
                  <DetailItem icon={FaMoneyBillWave} label="Apport" value={formatMoney(selectedApplication.personal_contribution_value)} />
                  <DetailItem icon={FaCalendarAlt} label="Durée" value={selectedApplication.duration_months ? `${selectedApplication.duration_months} mois` : 'Non renseigné'} />
                </article>

                <article>
                  <div className="mes-demandes-card-title">
                    <FaClipboardList />
                    <h3>Scoring</h3>
                  </div>
                  <DetailItem icon={FaMoneyBillWave} label="Revenu annuel" value={formatMoney(selectedApplication.revenu_annuel)} />
                  <DetailItem icon={FaMoneyBillWave} label="Charges annuelles" value={formatMoney(selectedApplication.charges_impayees)} />
                  <DetailItem icon={FaClipboardList} label="Endettement" value={formatPercent(selectedApplication.debt_ratio)} />
                </article>
              </div>

              <article className="mes-demandes-documents-card">
                <div className="mes-demandes-card-title">
                  <FaFileAlt />
                  <h3>Pièces déposées</h3>
                </div>
                {selectedDocuments.length ? (
                  <div className="mes-demandes-documents-grid">
                    {selectedDocuments.map((document, index) => (
                      <span key={`${document.type}-${document.name}-${index}`}>
                        <FaFileAlt />
                        <strong>{displayValue(document.type, 'Document')}</strong>
                        <small>{displayValue(document.name, 'Pièce fournie')}</small>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>Aucune pièce rattachée à ce dossier.</p>
                )}
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default MesDemandes;

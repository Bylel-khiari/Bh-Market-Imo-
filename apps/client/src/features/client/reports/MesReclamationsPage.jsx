import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaCommentDots,
  FaExclamationTriangle,
  FaHome,
  FaInfoCircle,
  FaTimesCircle,
  FaUserShield,
} from 'react-icons/fa';
import {
  clearAuthSession,
  fetchClientPropertyReportsApi,
  getAuthSession,
  isAuthError,
} from '../api/clientApi';
import '../../../styles/MesReclamations.css';

const STATUS_META = {
  unread: {
    label: 'Non lu',
    tone: 'submitted',
    icon: FaClock,
    clientMessage: "Votre reclamation est bien envoyee. L'equipe admin va la consulter.",
  },
  in_review: {
    label: 'En revue',
    tone: 'review',
    icon: FaClipboardList,
    clientMessage: "Votre reclamation est en cours d'analyse par l'administration.",
  },
  resolved: {
    label: 'Resolu',
    tone: 'accepted',
    icon: FaCheckCircle,
    clientMessage: "Votre reclamation a ete traitee par l'administration.",
  },
  rejected: {
    label: 'Rejete',
    tone: 'refused',
    icon: FaTimesCircle,
    clientMessage: "Votre reclamation a ete rejetee apres verification.",
  },
};

const CATEGORY_LABELS = {
  cannot_open_site: 'Impossible d ouvrir le site source',
  bad_owner_experience: 'Mauvaise experience avec le proprietaire',
  bad_agency_experience: 'Mauvaise experience avec l agence',
  scam_suspicion: 'Suspicion d arnaque',
  incorrect_information: 'Informations incorrectes',
  other: 'Autre probleme',
};

function getStatusMeta(status) {
  return STATUS_META[status] || {
    label: status || 'Inconnu',
    tone: 'unknown',
    icon: FaInfoCircle,
    clientMessage: 'Votre reclamation est en cours de suivi.',
  };
}

function formatCategory(category) {
  return CATEGORY_LABELS[category] || category || 'Non renseigne';
}

function formatDate(value) {
  if (!value) return 'Non renseigne';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Non renseigne';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getReportTitle(report) {
  return report?.property_title || `Bien #${report?.property_id || '-'}`;
}

function getAdminResponse(report) {
  if (report?.admin_note) {
    return report.admin_note;
  }

  if (report?.status === 'resolved') {
    return 'Votre reclamation a ete resolue. Aucune note complementaire n a encore ete ajoutee.';
  }

  if (report?.status === 'rejected') {
    return 'Votre reclamation a ete rejetee. Aucune note complementaire n a encore ete ajoutee.';
  }

  return "L'administration n'a pas encore ajoute de reponse.";
}

export default function MesReclamationsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReports = async () => {
      const session = getAuthSession();

      if (!session?.token || session?.user?.role !== 'client') {
        navigate('/login', { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError('');
        const payload = await fetchClientPropertyReportsApi(session.token, 500);
        const nextReports = Array.isArray(payload?.reports) ? payload.reports : [];
        setReports(nextReports);
        setSelectedId((currentId) => {
          if (nextReports.some((report) => String(report.id) === String(currentId))) {
            return currentId;
          }
          return nextReports[0]?.id || null;
        });
      } catch (requestError) {
        if (isAuthError(requestError)) {
          clearAuthSession();
          navigate('/login', { replace: true });
          return;
        }

        setError(requestError.message || 'Erreur de chargement des reclamations.');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [navigate]);

  const selectedReport = useMemo(() => {
    return reports.find((report) => String(report.id) === String(selectedId)) || reports[0] || null;
  }, [reports, selectedId]);

  const stats = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'unread' || report.status === 'in_review').length;
    const answered = reports.filter((report) => report.admin_note || report.status === 'resolved' || report.status === 'rejected').length;
    const resolved = reports.filter((report) => report.status === 'resolved').length;

    return {
      total: reports.length,
      pending,
      answered,
      resolved,
    };
  }, [reports]);

  const selectedStatus = getStatusMeta(selectedReport?.status);
  const SelectedStatusIcon = selectedStatus.icon;

  return (
    <div className="mes-reclamations-page">
      <div className="container mes-reclamations-container">
        <header className="mes-reclamations-header">
          <div>
            <span className="mes-reclamations-eyebrow">Espace client</span>
            <h1>Mes reclamations</h1>
          </div>
          <Link to="/properties" className="mes-reclamations-new-link">
            <FaHome /> Signaler un bien
          </Link>
        </header>

        <section className="mes-reclamations-stats" aria-label="Synthese des reclamations">
          <article>
            <strong>{stats.total}</strong>
            <span>Total reclamations</span>
          </article>
          <article>
            <strong>{stats.pending}</strong>
            <span>En traitement</span>
          </article>
          <article>
            <strong>{stats.answered}</strong>
            <span>Avec reponse</span>
          </article>
          <article>
            <strong>{stats.resolved}</strong>
            <span>Resolues</span>
          </article>
        </section>

        {loading ? (
          <section className="mes-reclamations-empty">
            <FaClock />
            <h2>Chargement des reclamations...</h2>
          </section>
        ) : error ? (
          <section className="mes-reclamations-empty mes-reclamations-empty--error">
            <FaExclamationTriangle />
            <h2>{error}</h2>
          </section>
        ) : reports.length === 0 ? (
          <section className="mes-reclamations-empty">
            <FaCommentDots />
            <h2>Aucune reclamation envoyee</h2>
            <p>Les signalements envoyes depuis une annonce apparaitront ici.</p>
            <Link to="/properties" className="mes-reclamations-new-link">
              Voir les biens
            </Link>
          </section>
        ) : (
          <div className="mes-reclamations-workspace">
            <aside className="mes-reclamations-list-panel" aria-label="Liste des reclamations">
              <div className="mes-reclamations-list-head">
                <div>
                  <h2>Historique</h2>
                  <p>{reports.length} reclamation{reports.length > 1 ? 's' : ''}</p>
                </div>
                {stats.answered > 0 ? (
                  <span className="mes-reclamations-list-badge">{stats.answered}</span>
                ) : null}
              </div>

              <div className="mes-reclamations-list">
                {reports.map((report) => {
                  const meta = getStatusMeta(report.status);
                  const StatusIcon = meta.icon;
                  const isSelected = selectedReport?.id === report.id;

                  return (
                    <button
                      type="button"
                      key={report.id}
                      className={`mes-reclamations-list-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(report.id)}
                    >
                      <span className={`mes-reclamations-mini-status status-${meta.tone}`}>
                        <StatusIcon /> {meta.label}
                      </span>
                      <strong>{getReportTitle(report)}</strong>
                      <small>{formatCategory(report.category)}</small>
                      <span className="mes-reclamations-list-meta">
                        Envoyee le {formatDate(report.created_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="mes-reclamations-detail-panel" aria-label="Detail de la reclamation">
              <div className="mes-reclamations-detail-head">
                <div>
                  <span className="mes-reclamations-eyebrow">Reclamation #{selectedReport.id}</span>
                  <h2>{getReportTitle(selectedReport)}</h2>
                  <p>Envoyee le {formatDate(selectedReport.created_at)}</p>
                </div>
                <span className={`mes-reclamations-status status-${selectedStatus.tone}`}>
                  <SelectedStatusIcon /> {selectedStatus.label}
                </span>
              </div>

              <div className="mes-reclamations-decision-row">
                <div>
                  <span>Suivi admin</span>
                  <strong>{selectedStatus.label}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{formatCategory(selectedReport.category)}</strong>
                </div>
                <div>
                  <span>Date reponse</span>
                  <strong>{formatDate(selectedReport.reviewed_at || selectedReport.updated_at)}</strong>
                </div>
              </div>

              <article className="mes-reclamations-card mes-reclamations-message-card">
                <div className="mes-reclamations-card-title">
                  <FaCommentDots />
                  <h3>Votre reclamation</h3>
                </div>
                <p>{selectedReport.message}</p>
              </article>

              <article className="mes-reclamations-card mes-reclamations-response-card">
                <div className="mes-reclamations-card-title">
                  <FaUserShield />
                  <h3>Reponse</h3>
                </div>
                <p>{getAdminResponse(selectedReport)}</p>
                {selectedReport.reviewed_by_admin_name ? (
                  <small>Traitee par {selectedReport.reviewed_by_admin_name}</small>
                ) : null}
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

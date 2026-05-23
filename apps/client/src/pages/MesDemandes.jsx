import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCloudUploadAlt,
  FaClipboardList,
  FaEdit,
  FaExclamationTriangle,
  FaFileAlt,
  FaHome,
  FaLock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaSave,
  FaTimesCircle,
  FaUniversity,
  FaUser,
} from 'react-icons/fa';
import {
  clearAuthSession,
  fetchClientCreditApplicationsApi,
  getAuthSession,
  isAuthError,
  updateClientCreditApplicationApi,
} from '../lib/auth';
import '../styles/MesDemandes.css';

const FINAL_STATUSES = new Set(['ACCEPTE', 'REFUSE']);
const CLIENT_EDIT_WINDOW_MS = 30 * 60 * 1000;
const ACCEPTED_UPLOAD_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_UPLOAD_DOCUMENT_BYTES = 8 * 1024 * 1024;

const DOCUMENT_TYPES = {
  BH_FORM: {
    key: 'BH_FORM',
    label: 'Formulaire BH Habitat',
    description: 'Demande de Credit Habitat',
    fileInputId: 'edit-doc-bh-form',
  },
  ID_COPY: {
    key: 'ID_COPY',
    label: "Piece d'identite",
    description: 'Copie CIN ou passeport',
    fileInputId: 'edit-doc-id-copy',
  },
  INCOME_PROOF: {
    key: 'INCOME_PROOF',
    label: 'Justificatifs de revenus',
    description: 'Fiches de paie, declaration fiscale ou attestation',
    fileInputId: 'edit-doc-income-proof',
  },
  PROPERTY_DOCS: {
    key: 'PROPERTY_DOCS',
    label: 'Documents du bien',
    description: 'Promesse de vente, titre ou documents immobiliers',
    fileInputId: 'edit-doc-property-docs',
  },
  BANK_STATEMENTS: {
    key: 'BANK_STATEMENTS',
    label: 'Releves bancaires',
    description: 'Releves des 3 a 6 derniers mois',
    fileInputId: 'edit-doc-bank-statements',
  },
  EMPLOYMENT_CONTRACT: {
    key: 'EMPLOYMENT_CONTRACT',
    label: 'Situation professionnelle',
    description: "Contrat de travail ou justificatif d'activite",
    fileInputId: 'edit-doc-employment-contract',
  },
};

const REQUIRED_DOCUMENTS = Object.values(DOCUMENT_TYPES);

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

function getClientEditDeadline(application) {
  const serverDeadline = toTimestamp(application?.client_edit_deadline_at);
  if (serverDeadline) return serverDeadline;

  const createdAt = toTimestamp(application?.created_at);
  return createdAt ? createdAt + CLIENT_EDIT_WINDOW_MS : 0;
}

function getClientEditRemainingMs(application, now) {
  const deadline = getClientEditDeadline(application);
  return Math.max(deadline - now, 0);
}

function canEditApplication(application, now) {
  if (!application || FINAL_STATUSES.has(application.status)) return false;
  if (application.can_client_edit === false) return false;
  return getClientEditRemainingMs(application, now) > 0;
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

function displayValue(value, fallback = 'Non renseigné') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function toInputValue(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

function toPositiveNumberOrNull(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function toPositiveIntegerOrNull(value) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

function normalizeIncomePeriod(value) {
  return value === 'monthly' || value === 'annual' ? value : null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isAcceptedDocumentFile(file) {
  if (!file) return false;
  const lowerName = String(file.name || '').toLowerCase();
  return ACCEPTED_UPLOAD_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

function getDocumentContentType(file) {
  if (file?.type) return file.type;
  const lowerName = String(file?.name || '').toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Impossible de lire le fichier.'));
    reader.readAsDataURL(file);
  });
}

function buildEditForm(application) {
  return {
    full_name: application?.full_name || application?.client_name || '',
    email: application?.email || application?.client_account_email || '',
    phone: application?.phone || '',
    cin: application?.cin || '',
    funding_type: application?.funding_type || '',
    socio_category: application?.socio_category || '',
    property_title: application?.property_title || '',
    property_location: application?.property_location || '',
    property_price_value: toInputValue(application?.property_price_value),
    property_price_raw: application?.property_price_raw || '',
    requested_amount: toInputValue(application?.requested_amount),
    personal_contribution: toInputValue(application?.personal_contribution_value),
    gross_income: toInputValue(application?.gross_income_value),
    income_period: application?.income_period || '',
    revenu_annuel: toInputValue(application?.revenu_annuel),
    charges_impayees: toInputValue(application?.charges_impayees),
    situation_familiale: application?.situation_familiale || '',
    situation_contractuelle: application?.situation_contractuelle || '',
    other_monthly_charges: toInputValue(application?.other_monthly_charges),
    duration_months: toInputValue(application?.duration_months),
    estimated_monthly_payment: toInputValue(application?.estimated_monthly_payment),
    estimated_rate: toInputValue(application?.estimated_rate),
    debt_ratio: toInputValue(application?.debt_ratio),
  };
}

function getDocumentByType(documents, type) {
  return (Array.isArray(documents) ? documents : []).find((document) => document?.type === type) || null;
}

function validateEditForm(data) {
  const issues = [];

  if (String(data.full_name || '').trim().length < 2) {
    issues.push('Nom complet: minimum 2 caracteres');
  }

  if (!isValidEmail(data.email)) {
    issues.push('Adresse e-mail: format invalide');
  }

  if (String(data.phone || '').trim().length < 8) {
    issues.push('Numero de telephone: minimum 8 caracteres');
  }

  if (String(data.cin || '').trim().length < 4) {
    issues.push('Numero de CIN: minimum 4 caracteres');
  }

  return issues;
}

function getClientBankMessage(application) {
  if (!application) return null;

  if (application.client_decision_message) {
    return application.client_decision_message;
  }

  if (application.status === 'ACCEPTE') {
    return 'Votre demande a été acceptée après analyse bancaire. Un conseiller BH vous contactera pour les prochaines étapes.';
  }

  if (application.status === 'REFUSE') {
    return "Votre demande n'a pas été retenue après analyse bancaire. Vous pouvez contacter votre agence pour plus d'informations.";
  }

  return application.statusMessage || 'Votre dossier est en cours de traitement par la banque.';
}

function getBankReviewState(application) {
  if (!application?.status) return 'En cours';
  return FINAL_STATUSES.has(application.status) ? 'Finalisée' : 'En cours';
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
  const [now, setNow] = useState(() => Date.now());
  const [editingApplication, setEditingApplication] = useState(null);
  const [editForm, setEditForm] = useState(() => buildEditForm(null));
  const [editDocuments, setEditDocuments] = useState({});
  const [editError, setEditError] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
  const selectedDocuments = selectedApplication?.typed_documents?.length
    ? selectedApplication.typed_documents
    : (selectedApplication?.documents || []).map((name) => ({ name, type: 'Document' }));
  const selectedEditRemainingMs = getClientEditRemainingMs(selectedApplication, now);
  const selectedCanEdit = canEditApplication(selectedApplication, now);
  const selectedEditCountdown = formatCountdown(selectedEditRemainingMs);
  const selectedEditStateLabel = selectedCanEdit
    ? `Modification possible: ${selectedEditCountdown}`
    : 'Dossier verrouille';
  const editingExistingDocuments = editingApplication?.typed_documents?.length
    ? editingApplication.typed_documents
    : (editingApplication?.documents || []).map((name) => ({ name, type: 'Document' }));
  const editingCountdown = formatCountdown(getClientEditRemainingMs(editingApplication, now));

  const openEditModal = (application) => {
    if (!canEditApplication(application, now)) {
      return;
    }

    setEditingApplication(application);
    setEditForm(buildEditForm(application));
    setEditDocuments({});
    setEditError('');
  };

  const closeEditModal = () => {
    if (submittingEdit) return;
    setEditingApplication(null);
    setEditDocuments({});
    setEditError('');
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditDocumentChange = (documentType, event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;

    if (file && !isAcceptedDocumentFile(file)) {
      setEditError('Format non accepte. Utilisez PDF, JPG, PNG ou JPEG.');
      event.target.value = '';
      setEditDocuments((prev) => ({ ...prev, [documentType]: null }));
      return;
    }

    if (file && file.size > MAX_UPLOAD_DOCUMENT_BYTES) {
      setEditError('Chaque document doit faire moins de 8 Mo.');
      event.target.value = '';
      setEditDocuments((prev) => ({ ...prev, [documentType]: null }));
      return;
    }

    setEditError('');
    setEditDocuments((prev) => ({
      ...prev,
      [documentType]: file ? { name: file.name, file } : null,
    }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError('');

    if (!editingApplication) return;

    if (!canEditApplication(editingApplication, Date.now())) {
      setEditError('Le delai de modification de 30 minutes est expire.');
      return;
    }

    const fieldIssues = validateEditForm(editForm);
    if (fieldIssues.length > 0) {
      setEditError(`Veuillez verifier: ${fieldIssues.join('; ')}.`);
      return;
    }

    const session = getAuthSession();
    if (!session?.token) {
      navigate('/login');
      return;
    }

    let documents = [];

    try {
      documents = await Promise.all(
        Object.entries(editDocuments)
          .filter(([, document]) => document?.file)
          .map(async ([docType, document]) => ({
            type: docType,
            name: document.name,
            content_type: getDocumentContentType(document.file),
            size: document.file.size,
            data: await readFileAsDataUrl(document.file),
          })),
      );
    } catch (fileError) {
      setEditError(fileError.message || 'Impossible de lire les documents selectionnes.');
      return;
    }

    const payload = {
      full_name: editForm.full_name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      cin: editForm.cin.trim(),
      funding_type: editForm.funding_type || null,
      socio_category: editForm.socio_category || null,
      property_title: editForm.property_title || null,
      property_location: editForm.property_location || null,
      property_price_value: toPositiveNumberOrNull(editForm.property_price_value),
      property_price_raw: editForm.property_price_raw || null,
      requested_amount: toPositiveNumberOrNull(editForm.requested_amount),
      personal_contribution: toPositiveNumberOrNull(editForm.personal_contribution),
      gross_income: toPositiveNumberOrNull(editForm.gross_income),
      income_period: normalizeIncomePeriod(editForm.income_period),
      revenu_annuel: toPositiveNumberOrNull(editForm.revenu_annuel),
      charges_impayees: toPositiveNumberOrNull(editForm.charges_impayees),
      situation_familiale: editForm.situation_familiale || null,
      situation_contractuelle: editForm.situation_contractuelle || null,
      other_monthly_charges: toPositiveNumberOrNull(editForm.other_monthly_charges),
      duration_months: toPositiveIntegerOrNull(Number(editForm.duration_months)),
      estimated_monthly_payment: toPositiveNumberOrNull(editForm.estimated_monthly_payment),
      estimated_rate: toPositiveNumberOrNull(editForm.estimated_rate),
      debt_ratio: toPositiveNumberOrNull(editForm.debt_ratio),
      ...(documents.length ? { documents } : {}),
    };

    try {
      setSubmittingEdit(true);
      const response = await updateClientCreditApplicationApi(editingApplication.id, payload, session.token);
      const updatedApplication = response?.application;

      if (updatedApplication) {
        setApplications((prev) =>
          prev.map((application) =>
            application.id === updatedApplication.id ? updatedApplication : application,
          ),
        );
        setSelectedId(updatedApplication.id);
      }

      setEditingApplication(null);
      setEditDocuments({});
      setEditError('');
    } catch (requestError) {
      if (isAuthError(requestError)) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      setEditError(requestError.message || 'Impossible de modifier cette demande.');
    } finally {
      setSubmittingEdit(false);
    }
  };

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
            <span className={`mes-demandes-readonly-pill${selectedCanEdit ? ' is-editable' : ''}`}>
              {selectedCanEdit ? <FaClock /> : <FaLock />}
              {selectedApplication ? selectedEditStateLabel : 'Modification 30 min apres depot'}
            </span>
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
              <p>{getClientBankMessage(latestNotification)}</p>
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
                  const applicationCanEdit = canEditApplication(application, now);
                  const applicationCountdown = formatCountdown(getClientEditRemainingMs(application, now));

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
                      <span className={`mes-demandes-list-timer${applicationCanEdit ? ' is-open' : ''}`}>
                        {applicationCanEdit ? `Modifiable ${applicationCountdown}` : 'Verrouille'}
                      </span>
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
                <div className="mes-demandes-detail-actions">
                  <span className={`mes-demandes-status status-${selectedStatus.tone}`}>
                    <SelectedStatusIcon /> {selectedStatus.label}
                  </span>
                  <button
                    type="button"
                    className="mes-demandes-edit-button"
                    onClick={() => openEditModal(selectedApplication)}
                    disabled={!selectedCanEdit}
                  >
                    <FaEdit /> Modifier
                  </button>
                </div>
              </div>

              <div className="mes-demandes-decision-row">
                <div>
                  <span>Analyse bancaire</span>
                  <strong>{getBankReviewState(selectedApplication)}</strong>
                </div>
                <div>
                  <span>Décision</span>
                  <strong>{selectedStatus.label}</strong>
                </div>
                <div>
                  <span>Date décision</span>
                  <strong>{formatDate(selectedApplication.reviewed_at || selectedApplication.updated_at)}</strong>
                </div>
                <div className={selectedCanEdit ? 'is-edit-window-open' : ''}>
                  <span>Modification</span>
                  <strong>{selectedCanEdit ? selectedEditCountdown : 'Verrouille'}</strong>
                </div>
              </div>

              <article className="mes-demandes-motif-card">
                <div className="mes-demandes-card-title">
                  <FaUniversity />
                  <h3>Suivi bancaire</h3>
                </div>
                <p>
                  {getClientBankMessage(selectedApplication) ||
                    'Votre dossier est en cours de traitement par la banque.'}
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

        {editingApplication ? (
          <div className="mes-demandes-edit-backdrop" role="dialog" aria-modal="true" onClick={closeEditModal}>
            <section className="mes-demandes-edit-modal" onClick={(event) => event.stopPropagation()}>
              <div className="mes-demandes-edit-head">
                <div>
                  <span className="mes-demandes-eyebrow">Modification client</span>
                  <h2>{getApplicationTitle(editingApplication)}</h2>
                  <p>Temps restant avant verrouillage: {editingCountdown}</p>
                </div>
                <button type="button" className="mes-demandes-edit-close" onClick={closeEditModal} disabled={submittingEdit}>
                  X
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="mes-demandes-edit-form" noValidate>
                <div className="mes-demandes-edit-section">
                  <h3>Identite client</h3>
                  <div className="mes-demandes-edit-grid">
                    <label>
                      <span>Nom complet</span>
                      <input name="full_name" value={editForm.full_name} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Adresse e-mail</span>
                      <input name="email" type="email" value={editForm.email} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Telephone</span>
                      <input name="phone" value={editForm.phone} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>CIN</span>
                      <input name="cin" value={editForm.cin} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                  </div>
                </div>

                <div className="mes-demandes-edit-section">
                  <h3>Projet et financement</h3>
                  <div className="mes-demandes-edit-grid">
                    <label>
                      <span>Bien immobilier</span>
                      <input name="property_title" value={editForm.property_title} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Localisation</span>
                      <input name="property_location" value={editForm.property_location} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Prix du bien</span>
                      <input name="property_price_value" type="number" min="0" value={editForm.property_price_value} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Montant demande</span>
                      <input name="requested_amount" type="number" min="0" value={editForm.requested_amount} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Apport</span>
                      <input name="personal_contribution" type="number" min="0" value={editForm.personal_contribution} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Duree (mois)</span>
                      <input name="duration_months" type="number" min="12" max="360" value={editForm.duration_months} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                  </div>
                </div>

                <div className="mes-demandes-edit-section">
                  <h3>Donnees de scoring</h3>
                  <div className="mes-demandes-edit-grid">
                    <label>
                      <span>Revenu declare</span>
                      <input name="gross_income" type="number" min="0" value={editForm.gross_income} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Periode revenu</span>
                      <select name="income_period" value={editForm.income_period} onChange={handleEditInputChange} disabled={submittingEdit}>
                        <option value="">Non renseigne</option>
                        <option value="monthly">Mensuel</option>
                        <option value="annual">Annuel</option>
                      </select>
                    </label>
                    <label>
                      <span>Revenu annuel</span>
                      <input name="revenu_annuel" type="number" min="0" value={editForm.revenu_annuel} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Charges annuelles</span>
                      <input name="charges_impayees" type="number" min="0" value={editForm.charges_impayees} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Autres mensualites</span>
                      <input name="other_monthly_charges" type="number" min="0" value={editForm.other_monthly_charges} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Mensualite estimee</span>
                      <input name="estimated_monthly_payment" type="number" min="0" value={editForm.estimated_monthly_payment} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Taux estime</span>
                      <input name="estimated_rate" type="number" min="0" max="100" value={editForm.estimated_rate} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Taux endettement</span>
                      <input name="debt_ratio" type="number" min="0" value={editForm.debt_ratio} onChange={handleEditInputChange} disabled={submittingEdit} />
                    </label>
                    <label>
                      <span>Situation familiale</span>
                      <select name="situation_familiale" value={editForm.situation_familiale} onChange={handleEditInputChange} disabled={submittingEdit}>
                        <option value="">Non renseignee</option>
                        <option value="celibataire">Celibataire</option>
                        <option value="marie sans enfant">Marie sans enfant</option>
                        <option value="marie avec enfant">Marie avec enfant</option>
                        <option value="divorce">Divorce</option>
                        <option value="veuf">Veuf</option>
                      </select>
                    </label>
                    <label>
                      <span>Situation contractuelle</span>
                      <select name="situation_contractuelle" value={editForm.situation_contractuelle} onChange={handleEditInputChange} disabled={submittingEdit}>
                        <option value="">Non renseignee</option>
                        <option value="fonctionnaire">Fonctionnaire</option>
                        <option value="CDI">CDI</option>
                        <option value="CDD">CDD</option>
                        <option value="profession liberale">Profession liberale</option>
                        <option value="independant">Independant</option>
                        <option value="retraite">Retraite</option>
                        <option value="stage">Stage</option>
                        <option value="sans contrat">Sans contrat</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mes-demandes-edit-section">
                  <h3>Pieces justificatives</h3>
                  <div className="mes-demandes-edit-doc-grid">
                    {REQUIRED_DOCUMENTS.map((documentType) => {
                      const currentDocument = getDocumentByType(editingExistingDocuments, documentType.key);
                      const replacementName = editDocuments[documentType.key]?.name;

                      return (
                        <article className={replacementName ? 'is-uploaded' : ''} key={documentType.key}>
                          <div>
                            <strong>{documentType.label}</strong>
                            <small>{documentType.description}</small>
                            <small>Actuel: {currentDocument?.name || 'Aucun document'}</small>
                          </div>
                          <label htmlFor={documentType.fileInputId}>
                            <FaCloudUploadAlt />
                            Remplacer
                          </label>
                          <input
                            id={documentType.fileInputId}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(event) => handleEditDocumentChange(documentType.key, event)}
                            disabled={submittingEdit}
                          />
                          <span>{replacementName || 'Aucun nouveau fichier'}</span>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {editError ? (
                  <div className="mes-demandes-edit-error" role="alert">
                    <FaExclamationTriangle /> {editError}
                  </div>
                ) : null}

                <div className="mes-demandes-edit-footer">
                  <button type="button" className="mes-demandes-edit-secondary" onClick={closeEditModal} disabled={submittingEdit}>
                    Annuler
                  </button>
                  <button type="submit" className="mes-demandes-edit-submit" disabled={submittingEdit || !canEditApplication(editingApplication, now)}>
                    <FaSave /> {submittingEdit ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MesDemandes;

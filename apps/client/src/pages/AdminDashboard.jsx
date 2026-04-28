import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBan,
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaCog,
  FaEnvelope,
  FaExclamationTriangle,
  FaGlobe,
  FaHome,
  FaListAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaPlay,
  FaSignOutAlt,
  FaStop,
  FaSyncAlt,
  FaTerminal,
  FaTimes,
  FaUser,
  FaUserTie,
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
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  clearAuthSession,
  createAdminPropertyApi,
  createAdminScrapeSiteApi,
  createAdminUserApi,
  deleteAdminPropertyApi,
  deleteAdminScrapeSiteApi,
  deleteAdminUserApi,
  fetchAdminScraperControlApi,
  fetchAdminPropertyReportsApi,
  fetchAdminPropertiesApi,
  fetchAdminScrapeSitesApi,
  fetchAdminUsersApi,
  getApiBaseUrl,
  isAuthError,
  requireAuthToken,
  startAdminListingCleanerApi,
  startAdminScraperApi,
  stopAdminScraperApi,
  updateAdminPropertyReportStatusApi,
  updateAdminPropertyApi,
  updateAdminScraperControlApi,
  updateAdminScrapeSiteApi,
  updateAdminUserApi,
} from '../lib/auth';
import '../styles/AdminDashboard.css';

const ADMIN_PROPERTIES_PER_PAGE = 50;
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
];

const REPORT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes les reclamations' },
  { value: 'unread', label: 'Non lus' },
  { value: 'in_review', label: 'En revue' },
  { value: 'resolved', label: 'Resolus' },
  { value: 'rejected', label: 'Rejetes' },
];

const REPORT_CATEGORY_LABELS = {
  cannot_open_site: 'Impossible d ouvrir le site source',
  bad_owner_experience: 'Mauvaise experience avec le proprietaire',
  bad_agency_experience: 'Mauvaise experience avec l agence',
  scam_suspicion: 'Suspicion d arnaque',
  incorrect_information: 'Informations incorrectes',
  other: 'Autre probleme',
};

const REPORT_STATUS_LABELS = {
  unread: 'Non lu',
  in_review: 'En revue',
  resolved: 'Resolu',
  rejected: 'Rejete',
};

const ROLE_LABELS = {
  client: 'Client',
  agent_bancaire: 'Agent bancaire',
  admin: 'Admin',
};

const ROLE_COLORS = {
  client: '#0a4d8c',
  agent_bancaire: '#ef7d00',
  admin: '#cc0000',
};

function createEmptyUserForm() {
  return {
    name: '',
    email: '',
    password: '',
    role: 'client',
    address: '',
    phone: '',
    matricule: '',
  };
}

function createEmptySiteForm() {
  return {
    name: '',
    spider_name: '',
    base_url: '',
    start_url: '',
    description: '',
    is_active: true,
  };
}

function createEmptyPropertyForm() {
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

function formatRole(role) {
  return ROLE_LABELS[role] || role || '-';
}

function formatDate(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR');
}

function formatDateTime(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('fr-FR');
}

function formatDateTimeLocalValue(dateLike) {
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

function formatPropertyPrice(property) {
  const numeric = Number(property?.price_value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
  }

  return property?.price_raw || 'Prix non communique';
}

function formatReportCategory(category) {
  return REPORT_CATEGORY_LABELS[category] || category || 'Categorie inconnue';
}

function formatReportStatus(status) {
  return REPORT_STATUS_LABELS[status] || status || 'Inconnu';
}

function getInitials(nameOrEmail) {
  const value = String(nameOrEmail || '').trim();
  if (!value) return 'U';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function formatScraperStatus(control) {
  if (!control) return 'Inconnu';

  switch (control.status) {
    case 'running':
      return 'Cycle en cours';
    case 'stopping':
      return 'Arret en cours';
    case 'error':
      return control.is_enabled ? 'Erreur, relance planifiee' : 'Erreur';
    case 'scheduled':
      return 'Automatique active';
    default:
      return control.is_enabled ? 'Automatique active' : 'Arrete';
  }
}

function formatScraperRunType(runType) {
  switch (runType) {
    case 'scraper_cycle':
      return 'Scraping + filtrage';
    case 'listing_cleaner':
      return 'Agent de filtrage';
    default:
      return 'Aucun run actif';
  }
}

function formatDuration(secondsLike) {
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [scrapeSites, setScrapeSites] = useState([]);
  const [adminProperties, setAdminProperties] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [userSearch, setUserSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [siteStatusFilter, setSiteStatusFilter] = useState('all');
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all');
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [editingUserId, setEditingUserId] = useState(null);
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(createEmptyUserForm());
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState('');
  const [isSitePanelOpen, setIsSitePanelOpen] = useState(false);
  const [siteDeleteCandidate, setSiteDeleteCandidate] = useState(null);
  const [siteFormMode, setSiteFormMode] = useState('create');
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [siteFormMessage, setSiteFormMessage] = useState('');
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const [siteFormData, setSiteFormData] = useState(createEmptySiteForm());
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [propertyError, setPropertyError] = useState('');
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [propertyDeleteCandidate, setPropertyDeleteCandidate] = useState(null);
  const [propertyFormMode, setPropertyFormMode] = useState('create');
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [currentPropertyPage, setCurrentPropertyPage] = useState(1);
  const [propertyFormMessage, setPropertyFormMessage] = useState('');
  const [propertySubmitting, setPropertySubmitting] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState(createEmptyPropertyForm());
  const [adminReports, setAdminReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [reportFormMessage, setReportFormMessage] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportSubmittingId, setReportSubmittingId] = useState(null);
  const [unreadReportCount, setUnreadReportCount] = useState(0);
  const [scraperControl, setScraperControl] = useState(null);
  const [scraperControlLoading, setScraperControlLoading] = useState(true);
  const [scraperControlError, setScraperControlError] = useState('');
  const [scraperControlMessage, setScraperControlMessage] = useState('');
  const [scraperSubmitting, setScraperSubmitting] = useState(false);
  const [scraperIntervalDays, setScraperIntervalDays] = useState('7');
  const [scraperIntervalDirty, setScraperIntervalDirty] = useState(false);
  const scraperIntervalDirtyRef = useRef(false);
  const apiBaseUrl = getApiBaseUrl();

  const goToHomePage = () => {
    navigate('/');
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const redirectToLogin = useCallback(() => {
    clearAuthSession();
    navigate('/login', { replace: true, state: { from: '/admin/dashboard' } });
  }, [navigate]);

  const handleAuthFailure = useCallback((requestError) => {
    if (!isAuthError(requestError)) {
      return false;
    }

    redirectToLogin();
    return true;
  }, [redirectToLogin]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = requireAuthToken();
      setLoading(true);
      setError('');
      const payload = await fetchAdminUsersApi(token, 100);
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

  const fetchScrapeSites = useCallback(async () => {
    try {
      const token = requireAuthToken();
      setSiteLoading(true);
      setSiteError('');
      const payload = await fetchAdminScrapeSitesApi(token, 200);
      setScrapeSites(Array.isArray(payload?.sites) ? payload.sites : []);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteError(requestError.message || 'Erreur de chargement des sites.');
    } finally {
      setSiteLoading(false);
    }
  }, [handleAuthFailure]);

  const fetchScraperControl = useCallback(async ({ silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setScraperControlLoading(true);
      }

      setScraperControlError('');
      const payload = await fetchAdminScraperControlApi(token);
      const nextControl = payload?.control || null;

      setScraperControl(nextControl);

      if (nextControl?.interval_days && !scraperIntervalDirtyRef.current) {
        setScraperIntervalDays(String(nextControl.interval_days));
      }
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur de chargement du controle du scraper.');
    } finally {
      if (!silent) {
        setScraperControlLoading(false);
      }
    }
  }, [handleAuthFailure]);

  const fetchAdminProperties = useCallback(async () => {
    try {
      const token = requireAuthToken();
      setPropertyLoading(true);
      setPropertyError('');
      const payload = await fetchAdminPropertiesApi(token, 5000);
      setAdminProperties(Array.isArray(payload?.properties) ? payload.properties : []);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyError(requestError.message || 'Erreur de chargement des biens.');
    } finally {
      setPropertyLoading(false);
    }
  }, [handleAuthFailure]);

  const fetchAdminReports = useCallback(async ({ status = 'all', silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setReportLoading(true);
      }

      setReportError('');

      const payload = await fetchAdminPropertyReportsApi(token, {
        limit: 500,
        status,
      });

      setAdminReports(Array.isArray(payload?.reports) ? payload.reports : []);
      setUnreadReportCount(Number(payload?.unreadCount || 0));
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setReportError(requestError.message || 'Erreur de chargement des reclamations.');
    } finally {
      if (!silent) {
        setReportLoading(false);
      }
    }
  }, [handleAuthFailure]);

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      fetchUsers(),
      fetchScrapeSites(),
      fetchScraperControl(),
      fetchAdminProperties(),
      fetchAdminReports({ status: reportStatusFilter }),
    ]);
  }, [
    fetchAdminProperties,
    fetchAdminReports,
    fetchScrapeSites,
    fetchScraperControl,
    fetchUsers,
    reportStatusFilter,
  ]);

  const handleReportStatusUpdate = async (report, nextStatus) => {
    try {
      const token = requireAuthToken();
      setReportSubmittingId(report.id);
      setReportFormMessage('');
      setReportError('');

      await updateAdminPropertyReportStatusApi(
        report.id,
        {
          status: nextStatus,
        },
        token,
      );

      setReportFormMessage('Reclamation mise a jour.');

      if (report.status === 'unread' && nextStatus !== 'unread') {
        setUnreadReportCount((prev) => Math.max(0, prev - 1));
      }

      await fetchAdminReports({ status: reportStatusFilter, silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setReportFormMessage('');
      setReportError(requestError.message || 'Erreur pendant la mise a jour de la reclamation.');
    } finally {
      setReportSubmittingId(null);
    }
  };

  const resetForm = () => {
    setFormMode('create');
    setEditingUserId(null);
    setFormData(createEmptyUserForm());
    setIsEditPanelOpen(false);
  };

  const openCreatePanel = () => {
    setFormMode('create');
    setEditingUserId(null);
    setFormMessage('');
    setFormData(createEmptyUserForm());
    setIsEditPanelOpen(true);
  };

  const startEdit = (user) => {
    setFormMode('edit');
    setEditingUserId(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'client',
      address: '',
      phone: '',
      matricule: '',
    });
    setFormMessage('');
    setIsEditPanelOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    if (formData.password) payload.password = formData.password;
    if (formData.role === 'client') {
      payload.address = formData.address.trim() || null;
      payload.phone = formData.phone.trim() || null;
    }
    if (formData.role === 'agent_bancaire') {
      payload.matricule = formData.matricule.trim() || null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormMessage('Nom et email sont obligatoires.');
      return;
    }

    if (formMode === 'create' && formData.password.length < 6) {
      setFormMessage('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setFormMessage('');

      if (formMode === 'create') {
        await createAdminUserApi(buildPayload(), token);
      } else {
        await updateAdminUserApi(editingUserId, buildPayload(), token);
      }

      setFormMessage(formMode === 'create' ? 'Utilisateur cree.' : 'Utilisateur mis a jour.');
      resetForm();
      await fetchUsers();
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage(requestError.message || 'Erreur pendant la sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (user) => {
    setDeleteCandidate(user);
  };

  const closeDeleteConfirm = () => {
    setDeleteCandidate(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteCandidate) return;
    const user = deleteCandidate;

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setFormMessage('');
      await deleteAdminUserApi(user.id, token);

      if (editingUserId === user.id) {
        resetForm();
      }

      setFormMessage('Utilisateur supprime.');
      closeDeleteConfirm();
      await fetchUsers();
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage(requestError.message || 'Erreur pendant la suppression.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSiteForm = () => {
    setSiteFormMode('create');
    setEditingSiteId(null);
    setSiteFormData(createEmptySiteForm());
    setIsSitePanelOpen(false);
  };

  const openCreateSitePanel = () => {
    setSiteFormMode('create');
    setEditingSiteId(null);
    setSiteFormMessage('');
    setSiteFormData(createEmptySiteForm());
    setIsSitePanelOpen(true);
  };

  const startEditSite = (site) => {
    setSiteFormMode('edit');
    setEditingSiteId(site.id);
    setSiteFormData({
      name: site.name || '',
      spider_name: site.spider_name || '',
      base_url: site.base_url || '',
      start_url: site.start_url || '',
      description: site.description || '',
      is_active: Boolean(site.is_active),
    });
    setSiteFormMessage('');
    setIsSitePanelOpen(true);
  };

  const handleSiteFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSiteFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildSitePayload = () => ({
    name: siteFormData.name.trim(),
    spider_name: siteFormData.spider_name.trim(),
    base_url: siteFormData.base_url.trim() || null,
    start_url: siteFormData.start_url.trim() || null,
    description: siteFormData.description.trim() || null,
    is_active: Boolean(siteFormData.is_active),
  });

  const handleSiteSubmit = async (event) => {
    event.preventDefault();

    if (!siteFormData.name.trim() || !siteFormData.spider_name.trim()) {
      setSiteFormMessage('Le nom du site et l identifiant du spider sont obligatoires.');
      return;
    }

    try {
      const token = requireAuthToken();
      setSiteSubmitting(true);
      setSiteFormMessage('');

      if (siteFormMode === 'create') {
        await createAdminScrapeSiteApi(buildSitePayload(), token);
      } else {
        await updateAdminScrapeSiteApi(editingSiteId, buildSitePayload(), token);
      }

      setSiteFormMessage(siteFormMode === 'create' ? 'Site ajoute.' : 'Site mis a jour.');
      resetSiteForm();
      await fetchScrapeSites();
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteFormMessage(requestError.message || 'Erreur pendant la sauvegarde du site.');
    } finally {
      setSiteSubmitting(false);
    }
  };

  const requestDeleteSite = (site) => {
    setSiteDeleteCandidate(site);
  };

  const closeDeleteSiteConfirm = () => {
    setSiteDeleteCandidate(null);
  };

  const handleDeleteSiteConfirmed = async () => {
    if (!siteDeleteCandidate) return;

    try {
      const token = requireAuthToken();
      setSiteSubmitting(true);
      setSiteFormMessage('');
      await deleteAdminScrapeSiteApi(siteDeleteCandidate.id, token);

      if (editingSiteId === siteDeleteCandidate.id) {
        resetSiteForm();
      }

      setSiteFormMessage('Site supprime.');
      closeDeleteSiteConfirm();
      await fetchScrapeSites();
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteFormMessage(requestError.message || 'Erreur pendant la suppression du site.');
    } finally {
      setSiteSubmitting(false);
    }
  };

  const handleToggleSiteStatus = async (site) => {
    try {
      const token = requireAuthToken();
      setSiteSubmitting(true);
      setSiteFormMessage('');
      const payload = await updateAdminScrapeSiteApi(site.id, { is_active: !site.is_active }, token);
      const updatedSite = payload?.site
        ? { ...site, ...payload.site }
        : { ...site, is_active: !site.is_active };

      setScrapeSites((prev) =>
        prev.map((item) => (String(item.id) === String(site.id) ? updatedSite : item)),
      );

      if (editingSiteId === site.id) {
        setSiteFormData((prev) => ({
          ...prev,
          is_active: Boolean(updatedSite.is_active),
        }));
      }

      setSiteFormMessage(
        site.is_active
          ? 'Site desactive pour les prochains lancements.'
          : 'Site reactive pour les prochains lancements.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteFormMessage(requestError.message || 'Erreur pendant la mise a jour du statut.');
    } finally {
      setSiteSubmitting(false);
    }
  };

  const syncScraperControlState = (control, message = '') => {
    setScraperControl(control || null);

    if (control?.interval_days) {
      setScraperIntervalDays(String(control.interval_days));
    }

    scraperIntervalDirtyRef.current = false;
    setScraperIntervalDirty(false);
    setScraperControlMessage(message);
  };

  const readScraperIntervalDays = () => {
    const value = Number(scraperIntervalDays);

    if (!Number.isInteger(value) || value < 1 || value > 365) {
      setScraperControlMessage('');
      setScraperControlError('Choisissez un intervalle valide entre 1 et 365 jours.');
      return null;
    }

    return value;
  };

  const handleScraperIntervalChange = (event) => {
    setScraperIntervalDays(event.target.value);
    setScraperControlError('');
    scraperIntervalDirtyRef.current = true;
    setScraperIntervalDirty(true);
  };

  const handleSaveScraperConfig = async () => {
    const intervalDays = readScraperIntervalDays();
    if (!intervalDays) return;

    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await updateAdminScraperControlApi(
        {
          interval_days: intervalDays,
        },
        token,
      );

      syncScraperControlState(
        payload?.control || scraperControl,
        'Intervalle de rescrape mis a jour.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant la mise a jour du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStartScraper = async () => {
    const intervalDays = readScraperIntervalDays();
    if (!intervalDays) return;

    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await startAdminScraperApi(
        {
          interval_days: intervalDays,
        },
        token,
      );

      syncScraperControlState(
        payload?.control || scraperControl,
        'Cycle de scraping demarre. Les prochains rescrapes suivront cet intervalle.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le demarrage du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStartListingCleaner = async () => {
    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await startAdminListingCleanerApi(token);

      syncScraperControlState(
        payload?.control || scraperControl,
        'Agent de filtrage demarre. Les annonces nettoyees seront synchronisees apres le filtrage.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le demarrage de l agent.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStopScraper = async () => {
    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await stopAdminScraperApi(token);

      syncScraperControlState(
        payload?.control || scraperControl,
        'Le scraping automatique a ete arrete.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant l arret du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const resetPropertyForm = () => {
    setPropertyFormMode('create');
    setEditingPropertyId(null);
    setPropertyFormData(createEmptyPropertyForm());
    setIsPropertyPanelOpen(false);
  };

  const openCreatePropertyPanel = () => {
    setPropertyFormMode('create');
    setEditingPropertyId(null);
    setPropertyFormMessage('');
    setPropertyFormData(createEmptyPropertyForm());
    setIsPropertyPanelOpen(true);
  };

  const startEditProperty = (property) => {
    setPropertyFormMode('edit');
    setEditingPropertyId(property.id);
    setPropertyFormData({
      title: property.title || '',
      price_raw: property.price_raw || '',
      price_value:
        property.price_value === null || property.price_value === undefined
          ? ''
          : String(property.price_value),
      location_raw: property.location_raw || '',
      city: property.city || '',
      country: property.country || '',
      image: property.image || '',
      description: property.description || '',
      source: property.source || '',
      url: property.url || '',
      scraped_at: formatDateTimeLocalValue(property.scraped_at),
      is_active: Boolean(property.is_active),
    });
    setPropertyFormMessage('');
    setIsPropertyPanelOpen(true);
  };

  const handlePropertyFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPropertyFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const buildPropertyPayload = () => {
    const rawPriceValue = String(propertyFormData.price_value || '').trim();

    return {
      title: propertyFormData.title.trim(),
      price_raw: propertyFormData.price_raw.trim() || null,
      price_value: rawPriceValue ? Number(rawPriceValue) : null,
      location_raw: propertyFormData.location_raw.trim() || null,
      city: propertyFormData.city.trim() || null,
      country: propertyFormData.country.trim() || null,
      image: propertyFormData.image.trim() || null,
      description: propertyFormData.description.trim() || null,
      source: propertyFormData.source.trim() || null,
      url: propertyFormData.url.trim() || null,
      scraped_at: propertyFormData.scraped_at || null,
      is_active: Boolean(propertyFormData.is_active),
    };
  };

  const handlePropertySubmit = async (event) => {
    event.preventDefault();

    if (!propertyFormData.title.trim()) {
      setPropertyFormMessage('Le titre du bien est obligatoire.');
      return;
    }

    const rawPriceValue = String(propertyFormData.price_value || '').trim();
    if (rawPriceValue && Number.isNaN(Number(rawPriceValue))) {
      setPropertyFormMessage('Le prix numerique doit etre un nombre valide.');
      return;
    }

    try {
      const token = requireAuthToken();
      setPropertySubmitting(true);
      setPropertyFormMessage('');

      if (propertyFormMode === 'create') {
        await createAdminPropertyApi(buildPropertyPayload(), token);
      } else {
        await updateAdminPropertyApi(editingPropertyId, buildPropertyPayload(), token);
      }

      setPropertyFormMessage(
        propertyFormMode === 'create' ? 'Bien ajoute.' : 'Bien mis a jour.',
      );
      resetPropertyForm();
      await fetchAdminProperties();
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyFormMessage(requestError.message || 'Erreur pendant la sauvegarde du bien.');
    } finally {
      setPropertySubmitting(false);
    }
  };

  const requestDeleteProperty = (property) => {
    setPropertyDeleteCandidate(property);
  };

  const closeDeletePropertyConfirm = () => {
    setPropertyDeleteCandidate(null);
  };

  const handleDeletePropertyConfirmed = async () => {
    if (!propertyDeleteCandidate) return;

    try {
      const token = requireAuthToken();
      setPropertySubmitting(true);
      setPropertyFormMessage('');
      await deleteAdminPropertyApi(propertyDeleteCandidate.id, token);

      if (editingPropertyId === propertyDeleteCandidate.id) {
        resetPropertyForm();
      }

      setPropertyFormMessage('Bien supprime.');
      closeDeletePropertyConfirm();
      await fetchAdminProperties();
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyFormMessage(requestError.message || 'Erreur pendant la suppression du bien.');
    } finally {
      setPropertySubmitting(false);
    }
  };

  const handleTogglePropertyStatus = async (property) => {
    try {
      const token = requireAuthToken();
      setPropertySubmitting(true);
      setPropertyFormMessage('');
      const payload = await updateAdminPropertyApi(property.id, { is_active: !property.is_active }, token);
      const updatedProperty = payload?.property
        ? { ...property, ...payload.property }
        : { ...property, is_active: !property.is_active };

      setAdminProperties((prev) =>
        prev.map((item) =>
          String(item.id) === String(property.id) ? updatedProperty : item,
        ),
      );

      if (editingPropertyId === property.id) {
        setPropertyFormData((prev) => ({
          ...prev,
          is_active: Boolean(updatedProperty.is_active),
        }));
      }

      setPropertyFormMessage(
        property.is_active
          ? 'Bien desactive pour l espace client.'
          : 'Bien reactive pour l espace client.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyFormMessage(requestError.message || 'Erreur pendant la mise a jour du statut.');
    } finally {
      setPropertySubmitting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchScrapeSites();
    fetchScraperControl();
    fetchAdminProperties();
  }, [fetchAdminProperties, fetchScrapeSites, fetchScraperControl, fetchUsers]);

  useEffect(() => {
    fetchAdminReports({ status: reportStatusFilter });
  }, [fetchAdminReports, reportStatusFilter]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAdminReports({ status: reportStatusFilter, silent: true });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAdminReports, reportStatusFilter]);

  useEffect(() => {
    const shouldPollScraper =
      activeSection === 'sites' || Boolean(scraperControl?.is_enabled) || Boolean(scraperControl?.is_running);

    if (!shouldPollScraper) {
      return undefined;
    }

    const pollDelayMs =
      scraperControl?.status === 'running' || scraperControl?.status === 'stopping' || scraperControl?.is_running
        ? 3000
        : activeSection === 'sites'
          ? 10000
          : 15000;

    const intervalId = setInterval(() => {
      fetchScraperControl({ silent: true });
    }, pollDelayMs);

    return () => clearInterval(intervalId);
  }, [activeSection, fetchScraperControl, scraperControl?.is_enabled, scraperControl?.is_running, scraperControl?.status]);

  const roleTotals = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const role = user?.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { client: 0, agent_bancaire: 0, admin: 0 },
    );
  }, [users]);

  const siteTotals = useMemo(() => {
    return scrapeSites.reduce(
      (acc, site) => {
        acc.total += 1;
        if (site?.is_active) {
          acc.active += 1;
        } else {
          acc.inactive += 1;
        }
        return acc;
      },
      { total: 0, active: 0, inactive: 0 },
    );
  }, [scrapeSites]);

  const scraperIsRunning = Boolean(scraperControl?.is_running) || scraperControl?.status === 'running';
  const scraperIsEnabled = Boolean(scraperControl?.is_enabled);
  const scraperStatusLabel = formatScraperStatus(scraperControl);
  const scraperCurrentCommandLabel =
    scraperControl?.current_command ||
    (scraperControl?.current_spider_name
      ? `Execution du spider ${scraperControl.current_spider_name}`
      : scraperIsRunning
        ? 'Execution en cours.'
        : 'Aucune commande en cours.');
  const scraperStatusClassName =
    scraperControl?.status === 'running'
      ? 'is-running'
      : scraperControl?.status === 'stopping'
        ? 'is-stopping'
        : scraperControl?.status === 'error'
          ? 'is-error'
          : scraperIsEnabled
            ? 'is-scheduled'
            : 'is-idle';
  const scraperProgressPercent = Math.min(100, Math.max(0, Number(scraperControl?.progress_percent || 0)));
  const scraperProgressSteps =
    Number(scraperControl?.progress_total || 0) > 0
      ? `${Number(scraperControl?.progress_current || 0)} / ${Number(scraperControl?.progress_total || 0)} etapes`
      : 'En attente';
  const scraperEtaLabel = scraperIsRunning
    ? formatDuration(scraperControl?.estimated_remaining_seconds)
    : scraperControl?.last_finished_at
      ? 'Termine'
      : 'Aucun cycle';
  const scraperRunTypeLabel = formatScraperRunType(scraperControl?.run_type);
  const scraperRecentLog = String(scraperControl?.recent_log || '').trim();

  const propertyTotals = useMemo(() => {
    return adminProperties.reduce(
      (acc, property) => {
        acc.total += 1;
        if (property?.is_active) {
          acc.active += 1;
        } else {
          acc.inactive += 1;
        }
        if (property?.created_by_admin) {
          acc.adminCreated += 1;
        }
        return acc;
      },
      { total: 0, active: 0, inactive: 0, adminCreated: 0 },
    );
  }, [adminProperties]);

  const pieData = useMemo(
    () =>
      [
        { key: 'client', name: 'Clients', value: roleTotals.client || 0 },
        { key: 'agent_bancaire', name: 'Agents bancaires', value: roleTotals.agent_bancaire || 0 },
        { key: 'admin', name: 'Admins', value: roleTotals.admin || 0 },
      ].filter((item) => item.value > 0),
    [roleTotals],
  );

  const barData = useMemo(
    () => [
      { role: 'Clients', total: roleTotals.client || 0 },
      { role: 'Agents', total: roleTotals.agent_bancaire || 0 },
      { role: 'Admins', total: roleTotals.admin || 0 },
    ],
    [roleTotals],
  );

  const usersSorted = useMemo(() => {
    return [...users].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [users]);

  const scrapeSitesSorted = useMemo(() => {
    return [...scrapeSites].sort((a, b) => {
      const nameComparison = String(a?.name || '').localeCompare(String(b?.name || ''), 'fr');
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return Number(a?.id || 0) - Number(b?.id || 0);
    });
  }, [scrapeSites]);

  const adminPropertiesSorted = useMemo(() => {
    return [...adminProperties].sort((a, b) => {
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [adminProperties]);

  const recentUsers = useMemo(() => usersSorted.slice(0, 8), [usersSorted]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return usersSorted;
    return usersSorted.filter((user) => {
      const haystack = `${user?.name || ''} ${user?.email || ''} ${user?.role || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [userSearch, usersSorted]);

  const filteredSites = useMemo(() => {
    const query = siteSearch.trim().toLowerCase();
    return scrapeSitesSorted.filter((site) => {
      const haystack = `${site?.name || ''} ${site?.spider_name || ''} ${site?.base_url || ''} ${site?.start_url || ''}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus =
        siteStatusFilter === 'all' ||
        (siteStatusFilter === 'active' && Boolean(site?.is_active)) ||
        (siteStatusFilter === 'inactive' && !site?.is_active);

      return matchesQuery && matchesStatus;
    });
  }, [scrapeSitesSorted, siteSearch, siteStatusFilter]);

  const filteredAdminProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase();
    return adminPropertiesSorted.filter((property) => {
      const haystack = `${property?.title || ''} ${property?.city || ''} ${property?.location_raw || ''} ${property?.source || ''} ${property?.url || ''} ${property?.description || ''}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus =
        propertyStatusFilter === 'all' ||
        (propertyStatusFilter === 'active' && Boolean(property?.is_active)) ||
        (propertyStatusFilter === 'inactive' && !property?.is_active);

      return matchesQuery && matchesStatus;
    });
  }, [adminPropertiesSorted, propertySearch, propertyStatusFilter]);

  const propertyTotalPages = useMemo(() => {
    if (!filteredAdminProperties.length) return 1;
    return Math.ceil(filteredAdminProperties.length / ADMIN_PROPERTIES_PER_PAGE);
  }, [filteredAdminProperties.length]);

  const paginatedAdminProperties = useMemo(() => {
    const start = (currentPropertyPage - 1) * ADMIN_PROPERTIES_PER_PAGE;
    return filteredAdminProperties.slice(start, start + ADMIN_PROPERTIES_PER_PAGE);
  }, [currentPropertyPage, filteredAdminProperties]);

  const propertyVisiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    if (propertyTotalPages <= maxVisiblePages) {
      return Array.from({ length: propertyTotalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPropertyPage - halfWindow);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > propertyTotalPages) {
      endPage = propertyTotalPages;
      startPage = endPage - maxVisiblePages + 1;
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [currentPropertyPage, propertyTotalPages]);

  const propertyVisibleRangeStart =
    filteredAdminProperties.length === 0
      ? 0
      : (currentPropertyPage - 1) * ADMIN_PROPERTIES_PER_PAGE + 1;

  const propertyVisibleRangeEnd = Math.min(
    currentPropertyPage * ADMIN_PROPERTIES_PER_PAGE,
    filteredAdminProperties.length,
  );

  useEffect(() => {
    setCurrentPropertyPage(1);
  }, [propertySearch, propertyStatusFilter]);

  useEffect(() => {
    if (currentPropertyPage > propertyTotalPages) {
      setCurrentPropertyPage(propertyTotalPages);
    }
  }, [currentPropertyPage, propertyTotalPages]);

  const menuItems = [
    { key: 'dashboard', label: 'Tableau de bord', icon: FaHome },
    { key: 'users', label: 'Utilisateurs', icon: FaUsers },
    { key: 'properties', label: 'Biens', icon: FaBuilding },
    { key: 'mail', label: 'Mail', icon: FaEnvelope },
    { key: 'sites', label: 'Sites scrapes', icon: FaGlobe },
    { key: 'activities', label: 'Activites', icon: FaListAlt },
    { key: 'stats', label: 'Statistiques', icon: FaChartLine },
    { key: 'settings', label: 'Parametres', icon: FaCog },
  ];

  const sectionTitles = {
    dashboard: 'Tableau de bord',
    users: 'Gestion des utilisateurs',
    properties: 'Gestion des biens immobiliers',
    mail: 'Boite mail reclamations',
    sites: 'Gestion des sites scrapes',
    activities: 'Activites recentes',
    stats: 'Statistiques',
    settings: 'Parametres',
  };

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--state">
        <div className="admin-state admin-state--page">
          <FaSyncAlt className="spin" />
          <p>Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard admin-dashboard--state">
        <div className="admin-state admin-state--page error">
          <FaExclamationTriangle />
          <p>{error}</p>
          <button type="button" className="admin-refresh" onClick={refreshDashboardData}>
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-profile">
            <div className="admin-avatar">A</div>
            <div>
              <h3>Admin BH Bank</h3>
              <p>En ligne</p>
            </div>
          </div>
          <nav className="admin-sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`menu-item ${activeSection === item.key ? 'is-active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  <Icon /> {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1>{sectionTitles[activeSection]}</h1>
              <p className="admin-subtitle">
                Pilotage des utilisateurs, des biens immobiliers et des sites de collecte
              </p>
            </div>
            <div className="admin-topbar-actions">
              <button
                type="button"
                className="admin-icon-btn admin-icon-btn--notification"
                aria-label="Mail reclamations"
                onClick={() => setActiveSection('mail')}
              >
                <FaEnvelope />
                {unreadReportCount > 0 && (
                  <span className="admin-notification-badge">
                    {unreadReportCount > 99 ? '99+' : unreadReportCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="admin-secondary admin-topbar-btn admin-topbar-btn--home"
                onClick={goToHomePage}
              >
                <FaHome />
                <span>Accueil</span>
              </button>
              <button
                type="button"
                className="admin-refresh admin-topbar-btn admin-topbar-btn--primary"
                onClick={refreshDashboardData}
                disabled={submitting || siteSubmitting || propertySubmitting}
              >
                Actualiser
              </button>
              <button
                type="button"
                className="admin-topbar-btn admin-topbar-btn--logout"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                <span>Deconnexion</span>
              </button>
            </div>
          </div>

          {activeSection === 'dashboard' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaUsers />
                    </div>
                    <div>
                      <h3>Utilisateurs</h3>
                      <p>{users.length}</p>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaUser />
                    </div>
                    <div>
                      <h3>Clients</h3>
                      <p>{roleTotals.client || 0}</p>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaUserTie />
                    </div>
                    <div>
                      <h3>Agents bancaires</h3>
                      <p>{roleTotals.agent_bancaire || 0}</p>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaBuilding />
                    </div>
                    <div>
                      <h3>Biens actifs</h3>
                      <p>{propertyTotals.active || 0}</p>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaListAlt />
                    </div>
                    <div>
                      <h3>Biens admin</h3>
                      <p>{propertyTotals.adminCreated || 0}</p>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaGlobe />
                    </div>
                    <div>
                      <h3>Sites actifs</h3>
                      <p>{siteTotals.active || 0}</p>
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon">
                      <FaEnvelope />
                    </div>
                    <div>
                      <h3>Reclamations non lues</h3>
                      <p>{unreadReportCount}</p>
                    </div>
                  </div>
                </div>

                <div className="admin-row">
                  <div className="admin-card">
                    <h2>Bienvenue</h2>
                    <p className="admin-section-help">
                      Utilisez le menu gauche pour gerer les comptes, les biens et les sites
                      scrapes depuis un seul dashboard admin en francais.
                    </p>
                  </div>
                  <div className="admin-card">
                    <h2>Etat des biens immobiliers</h2>
                    <ul className="admin-settings-list">
                      <li>Total des biens visibles en admin: {propertyTotals.total}</li>
                      <li>Biens actifs cote client: {propertyTotals.active}</li>
                      <li>Biens desactives: {propertyTotals.inactive}</li>
                      <li>Biens ajoutes par admin: {propertyTotals.adminCreated}</li>
                      <li>Sites de collecte actifs: {siteTotals.active}</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card admin-users-card">
                  <div className="admin-users-header">
                    <h2>Liste des utilisateurs</h2>
                    <div className="admin-users-header-actions">
                      <span className="admin-users-count">{filteredUsers.length}</span>
                      <button type="button" className="admin-refresh" onClick={openCreatePanel}>
                        Nouveau
                      </button>
                    </div>
                  </div>

                  <div className="admin-users-toolbar">
                    <input
                      className="admin-search-input"
                      placeholder="Rechercher par nom, email ou role"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                  </div>

                  <div className="admin-users-table">
                    <div className="admin-user-row admin-user-row-head">
                      <span>Utilisateur</span>
                      <span>Role</span>
                      <span>Date</span>
                      <span>Actions</span>
                    </div>

                    {filteredUsers.length === 0 && <p className="empty">Aucun utilisateur trouve.</p>}

                    {filteredUsers.map((user) => (
                      <article
                        key={user.id}
                        className={`admin-user-row ${editingUserId === user.id ? 'is-editing' : ''}`}
                      >
                        <div className="admin-user-cell user-cell-main">
                          <div className="admin-user-avatar">
                            {getInitials(user.name || user.email)}
                          </div>
                          <div>
                            <p className="admin-user-name">{user.name || '-'}</p>
                            <p className="admin-user-email">{user.email || '-'}</p>
                            <p className="admin-user-id">ID #{user.id}</p>
                          </div>
                        </div>

                        <div className="admin-user-cell">
                          <span className={`role-pill role-${user.role || 'unknown'}`}>
                            {formatRole(user.role)}
                          </span>
                        </div>

                        <div className="admin-user-cell admin-user-date">
                          {formatDate(user.created_at)}
                        </div>

                        <div className="admin-user-cell">
                          <div className="admin-table-actions">
                            <button
                              type="button"
                              className="admin-secondary"
                              onClick={() => startEdit(user)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="admin-danger"
                              onClick={() => requestDelete(user)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'properties' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card admin-properties-card">
                  <div className="admin-users-header">
                    <h2>Biens immobiliers</h2>
                    <div className="admin-users-header-actions">
                      <span className="admin-users-count">{filteredAdminProperties.length}</span>
                      <button
                        type="button"
                        className="admin-refresh"
                        onClick={openCreatePropertyPanel}
                      >
                        <FaPlus /> Nouveau bien
                      </button>
                    </div>
                  </div>

                  <p className="admin-section-help">
                    Ajoutez, modifiez, supprimez ou activez/desactivez les biens immobiliers.
                    Les changements admin restent prioritaires sur les donnees importees.
                  </p>

                  {!propertyLoading && filteredAdminProperties.length > 0 && (
                    <p className="admin-section-help">
                      Affichage de {propertyVisibleRangeStart} a {propertyVisibleRangeEnd} sur{' '}
                      {filteredAdminProperties.length} biens.
                    </p>
                  )}

                  <div className="admin-users-toolbar admin-toolbar-row">
                    <input
                      className="admin-search-input"
                      placeholder="Rechercher par titre, ville, source ou URL"
                      value={propertySearch}
                      onChange={(event) => setPropertySearch(event.target.value)}
                    />
                    <div className="admin-filter-chips" aria-label="Filtrer les biens par statut">
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`admin-filter-chip ${propertyStatusFilter === option.value ? 'is-active' : ''}`}
                          onClick={() => setPropertyStatusFilter(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {propertyFormMessage && (
                    <p
                      className={`admin-form-message ${propertyFormMessage.toLowerCase().includes('erreur') ? 'admin-form-message--error' : ''}`}
                    >
                      {propertyFormMessage}
                    </p>
                  )}
                  {propertyError && (
                    <p className="admin-form-message admin-form-message--error">{propertyError}</p>
                  )}

                  {propertyLoading ? (
                    <div className="admin-state admin-state--inline">
                      <FaSyncAlt className="spin" />
                      <p>Chargement des biens...</p>
                    </div>
                  ) : filteredAdminProperties.length === 0 ? (
                    <p className="empty">Aucun bien trouve.</p>
                  ) : (
                    <>
                      <div className="admin-properties-grid">
                        {paginatedAdminProperties.map((property) => (
                          <article
                            key={property.id}
                            className={`admin-property-card ${property.is_active ? 'is-active' : 'is-inactive'} ${editingPropertyId === property.id ? 'is-editing' : ''}`}
                          >
                          <div className="admin-property-media">
                            {property.image ? (
                              <img
                                src={property.image}
                                alt={property.title || 'Bien immobilier'}
                                className="admin-property-image"
                                loading="lazy"
                              />
                            ) : (
                              <div className="admin-property-image-placeholder">
                                Image non disponible
                              </div>
                            )}
                            <div className="admin-property-badges">
                              <span
                                className={`admin-site-status ${property.is_active ? 'is-active' : 'is-inactive'}`}
                              >
                                {property.is_active ? <FaCheckCircle /> : <FaBan />}
                                {property.is_active ? 'Active' : 'Desactivee'}
                              </span>
                              {property.created_by_admin && (
                                <span className="admin-property-origin admin-property-origin--created">
                                  Ajoutee par admin
                                </span>
                              )}
                              {property.has_manual_changes && !property.created_by_admin && (
                                <span className="admin-property-origin">Modifiee</span>
                              )}
                            </div>
                            <span className="admin-property-source-badge">
                              {property.source || 'source inconnue'}
                            </span>
                          </div>

                          <div className="admin-property-card-body">
                            <p className="admin-property-location">
                              <FaMapMarkerAlt />
                              <span>{property.location_raw || property.city || 'Localisation non disponible'}</span>
                            </p>
                            <h3>{property.title || 'Titre non disponible'}</h3>
                            <p className="admin-property-description">
                              {property.description || 'Aucune description renseignee pour ce bien.'}
                            </p>
                            <div className="admin-property-footer-row">
                              <p className="admin-property-price">{formatPropertyPrice(property)}</p>
                              <span className="admin-property-id-badge">ID #{property.id}</span>
                            </div>
                            <div className="admin-property-meta">
                              <span>
                                <strong>Ville:</strong> {property.city || '-'}
                              </span>
                              <span>
                                <strong>Mise a jour:</strong>{' '}
                                {formatDate(property.admin_updated_at || property.scraped_at)}
                              </span>
                            </div>

                            <div className="admin-table-actions admin-property-actions">
                              <button
                                type="button"
                                className={`admin-toggle-btn ${property.is_active ? 'is-active' : 'is-inactive'}`}
                                onClick={() => handleTogglePropertyStatus(property)}
                                disabled={propertySubmitting}
                                aria-pressed={property.is_active}
                                aria-label={
                                  property.is_active
                                    ? 'Desactiver ce bien'
                                    : 'Activer ce bien'
                                }
                              >
                                <span className="admin-toggle-track">
                                  <span className="admin-toggle-thumb" />
                                </span>
                                <span className="admin-toggle-copy">
                                  <strong>{property.is_active ? 'Active' : 'Inactive'}</strong>
                                  <small>
                                    {property.is_active
                                      ? 'Cliquer pour desactiver'
                                      : 'Cliquer pour activer'}
                                  </small>
                                </span>
                              </button>
                              <button
                                type="button"
                                className="admin-secondary"
                                onClick={() => startEditProperty(property)}
                                disabled={propertySubmitting}
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="admin-danger"
                                onClick={() => requestDeleteProperty(property)}
                                disabled={propertySubmitting}
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </article>
                        ))}
                      </div>

                      {propertyTotalPages > 1 && (
                        <nav className="admin-pagination" aria-label="Pagination des biens admin">
                          <button
                            type="button"
                            className="admin-pagination-btn admin-pagination-btn--nav"
                            onClick={() => setCurrentPropertyPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPropertyPage === 1}
                          >
                            Precedent
                          </button>

                          <div className="admin-pagination-pages">
                            {propertyVisiblePageNumbers.map((pageNumber) => (
                              <button
                                key={pageNumber}
                                type="button"
                                className={`admin-pagination-btn ${pageNumber === currentPropertyPage ? 'is-active' : ''}`}
                                onClick={() => setCurrentPropertyPage(pageNumber)}
                              >
                                {pageNumber}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="admin-pagination-btn admin-pagination-btn--nav"
                            onClick={() =>
                              setCurrentPropertyPage((prev) => Math.min(propertyTotalPages, prev + 1))
                            }
                            disabled={currentPropertyPage === propertyTotalPages}
                          >
                            Suivant
                          </button>
                        </nav>
                      )}
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'mail' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card admin-reports-card">
                  <div className="admin-users-header">
                    <h2>Mail reclamations</h2>
                    <div className="admin-users-header-actions">
                      <span className="admin-users-count">{adminReports.length}</span>
                    </div>
                  </div>

                  <p className="admin-section-help">
                    Cette boite regroupe les reclamations envoyees par les clients depuis les biens.
                    Traitez chaque message pour suivre l incident et garder un historique clair.
                  </p>

                  <div className="admin-users-toolbar admin-toolbar-row">
                    <div className="admin-filter-chips" aria-label="Filtrer les reclamations par statut">
                      {REPORT_STATUS_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`admin-filter-chip ${reportStatusFilter === option.value ? 'is-active' : ''}`}
                          onClick={() => setReportStatusFilter(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reportFormMessage && <p className="admin-form-message">{reportFormMessage}</p>}
                  {reportError && <p className="admin-form-message admin-form-message--error">{reportError}</p>}

                  {reportLoading ? (
                    <div className="admin-state admin-state--inline">
                      <FaSyncAlt className="spin" />
                      <p>Chargement des reclamations...</p>
                    </div>
                  ) : adminReports.length === 0 ? (
                    <p className="empty">Aucune reclamation trouvee.</p>
                  ) : (
                    <div className="admin-reports-list">
                      {adminReports.map((report) => {
                        const canMoveToInReview = report.status === 'unread';
                        const canMoveToResolved = report.status === 'unread' || report.status === 'in_review';
                        const canMoveToRejected = report.status === 'unread' || report.status === 'in_review';
                        const isSubmitting = String(reportSubmittingId) === String(report.id);

                        return (
                          <article key={report.id} className={`admin-report-card status-${report.status}`}>
                            <div className="admin-report-card-head">
                              <div>
                                <h3>{report.property_title || `Bien #${report.property_id}`}</h3>
                                <p className="admin-report-meta">
                                  Reclamation #{report.id} - Bien #{report.property_id}
                                </p>
                              </div>
                              <span className={`admin-report-status-pill status-${report.status}`}>
                                {formatReportStatus(report.status)}
                              </span>
                            </div>

                            <p className="admin-report-category">{formatReportCategory(report.category)}</p>
                            <p className="admin-report-message">{report.message}</p>

                            <div className="admin-report-footnote">
                              <span>
                                <strong>Client:</strong>{' '}
                                {report.reporter_name || report.reporter_email || `#${report.reporter_user_id}`}
                              </span>
                              <span>
                                <strong>Date:</strong> {formatDate(report.created_at)}
                              </span>
                            </div>

                            {report.property_url && (
                              <div className="admin-property-link-row">
                                <span className="admin-property-link-label">Source:</span>
                                <a
                                  href={report.property_url}
                                  className="admin-property-link"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Ouvrir le bien
                                </a>
                              </div>
                            )}

                            {report.admin_note && (
                              <p className="admin-report-note">
                                <strong>Note admin:</strong> {report.admin_note}
                              </p>
                            )}

                            <div className="admin-table-actions admin-report-actions">
                              <button
                                type="button"
                                className="admin-secondary"
                                onClick={() => handleReportStatusUpdate(report, 'in_review')}
                                disabled={!canMoveToInReview || isSubmitting}
                              >
                                En revue
                              </button>
                              <button
                                type="button"
                                className="admin-refresh"
                                onClick={() => handleReportStatusUpdate(report, 'resolved')}
                                disabled={!canMoveToResolved || isSubmitting}
                              >
                                Resolu
                              </button>
                              <button
                                type="button"
                                className="admin-danger"
                                onClick={() => handleReportStatusUpdate(report, 'rejected')}
                                disabled={!canMoveToRejected || isSubmitting}
                              >
                                Rejete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'sites' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column admin-sites-column">
                <div className="admin-card admin-scraper-control-card">
                  <div className="admin-scraper-control-head">
                    <div className="admin-scraper-title-block">
                      <span className="admin-scraper-kicker">Mission controle</span>
                      <h2>Automatisation du scraping</h2>
                      <p className="admin-section-help">
                        Demarrer lance un cycle de collecte complet. Agent de filtrage execute
                        uniquement le nettoyage des annonces deja collectees puis synchronise les
                        biens visibles.
                      </p>
                    </div>
                    <div className="admin-scraper-top-meta">
                      <span className={`admin-scraper-badge ${scraperStatusClassName}`}>
                        {scraperStatusLabel}
                      </span>
                      <span className="admin-scraper-sites-pill">
                        Sites actifs {siteTotals.active} / {siteTotals.total}
                      </span>
                    </div>
                  </div>

                  {scraperControlMessage && (
                    <p
                      className={`admin-form-message ${scraperControlMessage.toLowerCase().includes('erreur') ? 'admin-form-message--error' : ''}`}
                    >
                      {scraperControlMessage}
                    </p>
                  )}
                  {scraperControlError && (
                    <p className="admin-form-message admin-form-message--error">{scraperControlError}</p>
                  )}

                  {scraperControlLoading ? (
                    <div className="admin-state admin-state--inline">
                      <FaSyncAlt className="spin" />
                      <p>Chargement du controle du scraper...</p>
                    </div>
                  ) : (
                    <>
                      <div className="admin-scraper-control-grid">
                        <div className="admin-scraper-main">
                          <div className="admin-scraper-main-panel">
                            <div className="admin-scraper-mini-grid">
                              <div className="admin-scraper-mini-card">
                                <span>Cadence actuelle</span>
                                <strong>
                                  {(scraperControl?.interval_days || Number(scraperIntervalDays) || 0)} jours
                                </strong>
                              </div>
                              <div className="admin-scraper-mini-card">
                                <span>Mode</span>
                                <strong>
                                  {scraperIsRunning
                                    ? 'Cycle en direct'
                                    : scraperIsEnabled
                                      ? 'Planifie'
                                      : 'Arrete'}
                                </strong>
                              </div>
                              <div className="admin-scraper-mini-card">
                                <span>Run courant</span>
                                <strong>{scraperRunTypeLabel}</strong>
                              </div>
                              <div className="admin-scraper-mini-card">
                                <span>Temps restant</span>
                                <strong>{scraperEtaLabel}</strong>
                              </div>
                            </div>

                            <div className="admin-scraper-progress-panel">
                              <div className="admin-scraper-progress-head">
                                <span>Progression</span>
                                <strong>{Math.round(scraperProgressPercent)}%</strong>
                              </div>
                              <div
                                className="admin-scraper-progress-track"
                                role="progressbar"
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-valuenow={Math.round(scraperProgressPercent)}
                              >
                                <span style={{ width: `${scraperProgressPercent}%` }} />
                              </div>
                              <small>{scraperProgressSteps}</small>
                            </div>

                            <div className="admin-scraper-form-shell">
                              <div className="admin-field-block">
                                <label className="admin-field-label" htmlFor="scraper-interval-days">
                                  Intervalle de rescrape automatique
                                </label>
                                <p className="admin-scraper-field-help">
                                  Definissez dans combien de jours le prochain cycle doit etre relance
                                  automatiquement.
                                </p>
                                <div className="admin-inline-control">
                                  <input
                                    id="scraper-interval-days"
                                    type="number"
                                    min="1"
                                    max="365"
                                    step="1"
                                    value={scraperIntervalDays}
                                    onChange={handleScraperIntervalChange}
                                    disabled={scraperSubmitting}
                                  />
                                  <span className="admin-inline-suffix">jours</span>
                                  <button
                                    type="button"
                                    className="admin-secondary admin-scraper-btn admin-scraper-btn--save"
                                    onClick={handleSaveScraperConfig}
                                    disabled={scraperSubmitting || !scraperIntervalDirty}
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </div>

                              <div className="admin-form-actions admin-scraper-actions">
                                <button
                                  type="button"
                                  className="admin-refresh admin-scraper-btn admin-scraper-btn--start"
                                  onClick={handleStartScraper}
                                  disabled={scraperSubmitting || scraperIsRunning}
                                >
                                  <FaPlay />
                                  {scraperIsEnabled ? 'Relancer maintenant' : 'Demarrer'}
                                </button>
                                <button
                                  type="button"
                                  className="admin-secondary admin-scraper-btn admin-scraper-btn--agent"
                                  onClick={handleStartListingCleaner}
                                  disabled={scraperSubmitting || scraperIsRunning}
                                >
                                  <FaUserTie />
                                  Agent de filtrage
                                </button>
                                <button
                                  type="button"
                                  className="admin-danger admin-scraper-btn admin-scraper-btn--stop"
                                  onClick={handleStopScraper}
                                  disabled={scraperSubmitting || (!scraperIsEnabled && !scraperIsRunning)}
                                >
                                  <FaStop />
                                  Arreter
                                </button>
                                <button
                                  type="button"
                                  className="admin-secondary admin-scraper-btn admin-scraper-btn--refresh"
                                  onClick={() => fetchScraperControl()}
                                  disabled={scraperSubmitting || scraperControlLoading}
                                >
                                  <FaSyncAlt />
                                  Actualiser
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="admin-scraper-stats">
                          <div className="admin-scraper-stat">
                            <div className="admin-scraper-stat-head">
                              <span className="admin-scraper-stat-icon">
                                <FaCog />
                              </span>
                              <span>Etat courant</span>
                            </div>
                            <strong>{scraperStatusLabel}</strong>
                            <small>{scraperControl?.current_step || 'Aucun cycle actif.'}</small>
                          </div>
                          <div className="admin-scraper-stat">
                            <div className="admin-scraper-stat-head">
                              <span className="admin-scraper-stat-icon">
                                <FaGlobe />
                              </span>
                              <span>Spider courant</span>
                            </div>
                            <strong>{scraperControl?.current_spider_name || '-'}</strong>
                            <small>{scraperCurrentCommandLabel}</small>
                          </div>
                          <div className="admin-scraper-stat">
                            <div className="admin-scraper-stat-head">
                              <span className="admin-scraper-stat-icon">
                                <FaClock />
                              </span>
                              <span>Temps estime</span>
                            </div>
                            <strong>{scraperEtaLabel}</strong>
                            <small>
                              Progression: {Math.round(scraperProgressPercent)}% ({scraperProgressSteps})
                            </small>
                          </div>
                          <div className="admin-scraper-stat">
                            <div className="admin-scraper-stat-head">
                              <span className="admin-scraper-stat-icon">
                                <FaCheckCircle />
                              </span>
                              <span>Dernier succes</span>
                            </div>
                            <strong>{formatDateTime(scraperControl?.last_success_at)}</strong>
                            <small>
                              Dernier lancement: {formatDateTime(scraperControl?.last_started_at)}
                            </small>
                          </div>
                          <div className="admin-scraper-stat">
                            <div className="admin-scraper-stat-head">
                              <span className="admin-scraper-stat-icon">
                                <FaSyncAlt />
                              </span>
                              <span>Prochain rescrape</span>
                            </div>
                            <strong>
                              {scraperIsEnabled
                                ? formatDateTime(scraperControl?.next_run_at)
                                : 'Desactive'}
                            </strong>
                            <small>
                              Sites actifs: {siteTotals.active} / {siteTotals.total}
                            </small>
                          </div>
                        </div>
                      </div>

                      {scraperControl?.last_error && (
                        <div className="admin-scraper-alert">
                          <div className="admin-scraper-alert-icon">
                            <FaExclamationTriangle />
                          </div>
                          <div>
                            <strong>Derniere erreur detectee</strong>
                            <p>{scraperControl.last_error}</p>
                          </div>
                        </div>
                      )}

                      <div className="admin-scraper-log-panel">
                        <div className="admin-scraper-log-head">
                          <h3>
                            <FaTerminal /> Logs scraping et agent
                          </h3>
                          <span>{scraperIsRunning ? 'Suivi live' : 'Dernier run'}</span>
                        </div>
                        {scraperRecentLog ? (
                          <pre>{scraperRecentLog}</pre>
                        ) : (
                          <p className="empty">Aucun log disponible pour le moment.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="admin-card admin-sites-card">
                  <div className="admin-users-header">
                    <h2>Sites de collecte</h2>
                    <div className="admin-users-header-actions">
                      <span className="admin-users-count">{filteredSites.length}</span>
                      <button type="button" className="admin-refresh" onClick={openCreateSitePanel}>
                        <FaPlus /> Nouveau site
                      </button>
                    </div>
                  </div>

                  <p className="admin-section-help">
                    Ajoutez, modifiez, supprimez ou activez/desactivez les sites scrapes.
                    L identifiant technique doit correspondre au spider Scrapy pour piloter les
                    prochains lancements.
                  </p>

                  <div className="admin-users-toolbar admin-toolbar-row">
                    <input
                      className="admin-search-input"
                      placeholder="Rechercher par nom, spider ou URL"
                      value={siteSearch}
                      onChange={(event) => setSiteSearch(event.target.value)}
                    />
                    <div className="admin-filter-chips" aria-label="Filtrer les sites par statut">
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`admin-filter-chip ${siteStatusFilter === option.value ? 'is-active' : ''}`}
                          onClick={() => setSiteStatusFilter(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {siteFormMessage && (
                    <p
                      className={`admin-form-message ${siteFormMessage.toLowerCase().includes('erreur') ? 'admin-form-message--error' : ''}`}
                    >
                      {siteFormMessage}
                    </p>
                  )}
                  {siteError && <p className="admin-form-message admin-form-message--error">{siteError}</p>}

                  {siteLoading ? (
                    <div className="admin-state admin-state--inline">
                      <FaSyncAlt className="spin" />
                      <p>Chargement des sites de collecte...</p>
                    </div>
                  ) : filteredSites.length === 0 ? (
                    <p className="empty">Aucun site de collecte trouve.</p>
                  ) : (
                    <div className="admin-sites-grid">
                      {filteredSites.map((site) => (
                        <article
                          key={site.id}
                          className={`admin-site-card ${site.is_active ? 'is-active' : 'is-inactive'} ${editingSiteId === site.id ? 'is-editing' : ''}`}
                        >
                          <div className="admin-site-card-head">
                            <div>
                              <h3>{site.name}</h3>
                              <p className="admin-site-spider">Spider: {site.spider_name}</p>
                            </div>
                            <span className={`admin-site-status ${site.is_active ? 'is-active' : 'is-inactive'}`}>
                              {site.is_active ? <FaCheckCircle /> : <FaBan />}
                              {site.is_active ? 'Actif' : 'Desactive'}
                            </span>
                          </div>

                          <div className="admin-site-meta">
                            <span>
                              <strong>Base:</strong> {site.base_url || '-'}
                            </span>
                            <span>
                              <strong>Depart:</strong> {site.start_url || '-'}
                            </span>
                            <span>
                              <strong>Mise a jour:</strong>{' '}
                              {formatDate(site.updated_at || site.created_at)}
                            </span>
                          </div>

                          <p className="admin-site-description">
                            {site.description || 'Aucune description renseignee pour ce site.'}
                          </p>

                          <div className="admin-table-actions admin-site-actions">
                            <button
                              type="button"
                              className={`admin-toggle-btn ${site.is_active ? 'is-active' : 'is-inactive'}`}
                              onClick={() => handleToggleSiteStatus(site)}
                              disabled={siteSubmitting}
                              aria-pressed={site.is_active}
                              aria-label={
                                site.is_active ? 'Desactiver ce site scrape' : 'Activer ce site scrape'
                              }
                            >
                              <span className="admin-toggle-track">
                                <span className="admin-toggle-thumb" />
                              </span>
                              <span className="admin-toggle-copy">
                                <strong>{site.is_active ? 'Actif' : 'Inactif'}</strong>
                                <small>
                                  {site.is_active
                                    ? 'Cliquer pour desactiver'
                                    : 'Cliquer pour activer'}
                                </small>
                              </span>
                            </button>
                            <button
                              type="button"
                              className="admin-secondary"
                              onClick={() => startEditSite(site)}
                              disabled={siteSubmitting}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="admin-danger"
                              onClick={() => requestDeleteSite(site)}
                              disabled={siteSubmitting}
                            >
                              Supprimer
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'activities' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                  <h2>Dernieres activites utilisateurs</h2>
                  <div className="admin-activity-list">
                    {recentUsers.length === 0 && <p className="empty">Aucune activite.</p>}
                    {recentUsers.map((user) => (
                      <div key={user.id} className="admin-activity-item">
                        <strong>{user.name || user.email}</strong>
                        <span>{formatRole(user.role)}</span>
                        <small>{formatDate(user.created_at)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'stats' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-row">
                  <div className="admin-card">
                    <h2>Repartition des roles</h2>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.key} fill={ROLE_COLORS[entry.key] || '#003366'} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="admin-card">
                    <h2>Volume par role</h2>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="role" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#0b5fa8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                  <h2>Parametres du module admin</h2>
                  <p className="admin-section-help">
                    Configuration actuelle du tableau de bord admin.
                  </p>
                  <ul className="admin-settings-list">
                    <li>API: {apiBaseUrl}</li>
                    <li>Utilisateurs charges: {users.length}</li>
                    <li>Biens charges: {adminProperties.length}</li>
                    <li>Reclamations non lues: {unreadReportCount}</li>
                    <li>Sites de collecte charges: {scrapeSites.length}</li>
                    <li>Mode edition utilisateur: {formMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                    <li>Mode edition bien: {propertyFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                    <li>Mode edition site: {siteFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                  </ul>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {activeSection === 'users' && isEditPanelOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetForm}>
          <aside className="admin-card admin-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-edit-panel-head">
              <h2>{formMode === 'create' ? 'Nouveau utilisateur' : `Modifier utilisateur #${editingUserId}`}</h2>
              <button
                type="button"
                className="admin-close-btn"
                onClick={resetForm}
                disabled={submitting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            <p className="admin-section-help">
              Remplissez le formulaire puis validez pour creer ou mettre a jour un compte.
            </p>
            <form className="admin-user-form admin-user-form-compact" onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Nom"
                value={formData.name}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <input
                name="password"
                type="password"
                placeholder={
                  formMode === 'create'
                    ? 'Mot de passe (min 6)'
                    : 'Nouveau mot de passe (optionnel)'
                }
                value={formData.password}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                disabled={submitting}
              >
                <option value="client">Client</option>
                <option value="agent_bancaire">Agent bancaire</option>
                <option value="admin">Admin</option>
              </select>
              {formData.role === 'client' && (
                <>
                  <input
                    name="address"
                    placeholder="Adresse (optionnel)"
                    value={formData.address}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                  <input
                    name="phone"
                    placeholder="Telephone (optionnel)"
                    value={formData.phone}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                </>
              )}
              {formData.role === 'agent_bancaire' && (
                <input
                  name="matricule"
                  placeholder="Matricule (optionnel)"
                  value={formData.matricule}
                  onChange={handleFormChange}
                  disabled={submitting}
                />
              )}
              <div className="admin-form-actions">
                <button type="submit" className="admin-refresh" disabled={submitting}>
                  {submitting ? 'Traitement...' : formMode === 'create' ? 'Creer' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={openCreatePanel}
                  disabled={submitting}
                >
                  Nouveau
                </button>
              </div>
            </form>
            {formMessage && <p className="admin-form-message">{formMessage}</p>}
          </aside>
        </div>
      )}

      {activeSection === 'users' && Boolean(deleteCandidate) && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeDeleteConfirm}>
          <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p className="admin-section-help">
              Voulez-vous vraiment supprimer{' '}
              <strong>{deleteCandidate?.name || deleteCandidate?.email}</strong> ?
            </p>
            <div className="admin-form-actions">
              <button type="button" className="admin-secondary" onClick={closeDeleteConfirm} disabled={submitting}>
                Annuler
              </button>
              <button type="button" className="admin-danger" onClick={handleDeleteConfirmed} disabled={submitting}>
                {submitting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {activeSection === 'properties' && isPropertyPanelOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetPropertyForm}>
          <aside
            className="admin-card admin-edit-modal admin-edit-modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-edit-panel-head">
              <h2>
                {propertyFormMode === 'create'
                  ? 'Nouveau bien'
                  : `Modifier le bien ${propertyFormData.title || `#${editingPropertyId}`}`}
              </h2>
              <button
                type="button"
                className="admin-close-btn"
                onClick={resetPropertyForm}
                disabled={propertySubmitting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            <p className="admin-section-help">
              Les champs ci-dessous correspondent aux colonnes principales de la table canonique properties.
            </p>
            <form className="admin-user-form admin-user-form-compact" onSubmit={handlePropertySubmit}>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-title">
                  Titre (colonne title)
                </label>
                <input
                  id="property-title"
                  name="title"
                  placeholder="Ex: Appartement S+2 a Tunis"
                  value={propertyFormData.title}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-price-raw">
                  Prix texte (colonne price_raw)
                </label>
                <input
                  id="property-price-raw"
                  name="price_raw"
                  placeholder="Ex: 320 000 DT"
                  value={propertyFormData.price_raw}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-price-value">
                  Prix numerique (colonne price_value)
                </label>
                <input
                  id="property-price-value"
                  name="price_value"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 320000"
                  value={propertyFormData.price_value}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-location-raw">
                  Localisation brute (colonne location_raw)
                </label>
                <input
                  id="property-location-raw"
                  name="location_raw"
                  placeholder="Ex: La Marsa, Tunis"
                  value={propertyFormData.location_raw}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-city">
                  Ville (colonne city)
                </label>
                <input
                  id="property-city"
                  name="city"
                  placeholder="Ex: Tunis"
                  value={propertyFormData.city}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-country">
                  Pays (colonne country)
                </label>
                <input
                  id="property-country"
                  name="country"
                  placeholder="Ex: Tunisie"
                  value={propertyFormData.country}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-image">
                  Image principale (colonne image)
                </label>
                <input
                  id="property-image"
                  name="image"
                  placeholder="Ex: https://site.com/photo.jpg"
                  value={propertyFormData.image}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-source">
                  Source (colonne source)
                </label>
                <input
                  id="property-source"
                  name="source"
                  placeholder="Ex: mubawab ou admin"
                  value={propertyFormData.source}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-url">
                  Lien source (colonne url)
                </label>
                <input
                  id="property-url"
                  name="url"
                  placeholder="Ex: https://site.com/bien/123"
                  value={propertyFormData.url}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-scraped-at">
                  Date de collecte (colonne scraped_at)
                </label>
                <input
                  id="property-scraped-at"
                  name="scraped_at"
                  type="datetime-local"
                  value={propertyFormData.scraped_at}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-description">
                  Description (colonne description)
                </label>
                <textarea
                  id="property-description"
                  name="description"
                  placeholder="Description complete du bien immobilier."
                  value={propertyFormData.description}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                  rows={5}
                />
              </div>
              <label className="admin-checkbox-row">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={propertyFormData.is_active}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
                <span>Bien actif pour l espace client</span>
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="admin-refresh" disabled={propertySubmitting}>
                  {propertySubmitting
                    ? 'Traitement...'
                    : propertyFormMode === 'create'
                      ? 'Ajouter'
                      : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={openCreatePropertyPanel}
                  disabled={propertySubmitting}
                >
                  Nouveau
                </button>
              </div>
            </form>
            {propertyFormMessage && <p className="admin-form-message">{propertyFormMessage}</p>}
          </aside>
        </div>
      )}

      {activeSection === 'properties' && Boolean(propertyDeleteCandidate) && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeDeletePropertyConfirm}
        >
          <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p className="admin-section-help">
              Voulez-vous vraiment supprimer le bien{' '}
              <strong>{propertyDeleteCandidate?.title || `#${propertyDeleteCandidate?.id}`}</strong> ?
            </p>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={closeDeletePropertyConfirm}
                disabled={propertySubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-danger"
                onClick={handleDeletePropertyConfirmed}
                disabled={propertySubmitting}
              >
                {propertySubmitting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {activeSection === 'sites' && isSitePanelOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetSiteForm}>
          <aside className="admin-card admin-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-edit-panel-head">
              <h2>
                {siteFormMode === 'create'
                  ? 'Nouveau site de collecte'
                  : `Modifier le site ${siteFormData.name || `#${editingSiteId}`}`}
              </h2>
              <button
                type="button"
                className="admin-close-btn"
                onClick={resetSiteForm}
                disabled={siteSubmitting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            <p className="admin-section-help">
              Le champ identifiant du spider doit correspondre au nom technique du spider Scrapy
              si vous voulez piloter sa collecte.
            </p>
            <form className="admin-user-form admin-user-form-compact" onSubmit={handleSiteSubmit}>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-name">
                  Nom du site (colonne name)
                </label>
                <input
                  id="site-name"
                  name="name"
                  placeholder="Ex: Afariat"
                  value={siteFormData.name}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-spider-name">
                  Identifiant du spider (colonne spider_name)
                </label>
                <input
                  id="site-spider-name"
                  name="spider_name"
                  placeholder="Ex: afariat"
                  value={siteFormData.spider_name}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-base-url">
                  URL principale (colonne base_url)
                </label>
                <input
                  id="site-base-url"
                  name="base_url"
                  type="url"
                  placeholder="Ex: https://afariat.com"
                  value={siteFormData.base_url}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-start-url">
                  URL de depart (colonne start_url)
                </label>
                <input
                  id="site-start-url"
                  name="start_url"
                  type="url"
                  placeholder="Ex: https://afariat.com/appartements"
                  value={siteFormData.start_url}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-description">
                  Description (colonne description)
                </label>
                <textarea
                  id="site-description"
                  name="description"
                  placeholder="Ex: Portail de petites annonces immobilieres en Tunisie."
                  value={siteFormData.description}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                  rows={4}
                />
              </div>
              <label className="admin-checkbox-row">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={siteFormData.is_active}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                />
                <span>Site actif pour les prochains lancements du scraper</span>
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="admin-refresh" disabled={siteSubmitting}>
                  {siteSubmitting
                    ? 'Traitement...'
                    : siteFormMode === 'create'
                      ? 'Ajouter'
                      : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={openCreateSitePanel}
                  disabled={siteSubmitting}
                >
                  Nouveau
                </button>
              </div>
            </form>
            {siteFormMessage && <p className="admin-form-message">{siteFormMessage}</p>}
          </aside>
        </div>
      )}

      {activeSection === 'sites' && Boolean(siteDeleteCandidate) && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeDeleteSiteConfirm}>
          <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p className="admin-section-help">
              Voulez-vous vraiment supprimer le site <strong>{siteDeleteCandidate?.name}</strong> ?
            </p>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={closeDeleteSiteConfirm}
                disabled={siteSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-danger"
                onClick={handleDeleteSiteConfirmed}
                disabled={siteSubmitting}
              >
                {siteSubmitting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

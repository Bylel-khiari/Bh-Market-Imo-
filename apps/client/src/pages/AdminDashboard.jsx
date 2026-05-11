import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaChartLine,
  FaCog,
  FaEnvelope,
  FaExclamationTriangle,
  FaGlobe,
  FaHome,
  FaListAlt,
  FaSignOutAlt,
  FaSyncAlt,
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
  acceptAdminScrapeSiteSuggestionApi,
  fetchAdminDashboardApi,
  createAdminPropertyApi,
  createAdminScrapeSiteApi,
  createAdminUserApi,
  deleteAdminPropertyApi,
  deleteAdminScrapeSiteApi,
  deleteAdminUserApi,
  fetchAdminScraperControlApi,
  fetchAdminPropertyReportsApi,
  fetchAdminPropertiesApi,
  fetchAdminScrapeSiteSuggestionsApi,
  fetchAdminScrapeSitesApi,
  fetchAdminUsersApi,
  getApiBaseUrl,
  isAuthError,
  requireAuthToken,
  startAdminScrapeSiteDiscoveryApi,
  startAdminListingCleanerApi,
  startAdminScraperApi,
  stopAdminScraperApi,
  updateAdminPropertyReportStatusApi,
  updateAdminPropertyApi,
  updateAdminScraperControlApi,
  updateAdminScrapeSiteSuggestionApi,
  updateAdminScrapeSiteApi,
  updateAdminUserApi,
} from '../lib/auth';
import AdminUsersSection from '../features/admin/components/AdminUsersSection';
import AdminPropertiesSection from '../features/admin/components/AdminPropertiesSection';
import AdminReportsSection from '../features/admin/components/AdminReportsSection';
import AdminScraperControlSection from '../features/admin/components/AdminScraperControlSection';
import AdminSiteSuggestionsSection from '../features/admin/components/AdminSiteSuggestionsSection';
import AdminScrapeSitesSection from '../features/admin/components/AdminScrapeSitesSection';
import useAdminPropertiesPagination from '../features/admin/hooks/useAdminPropertiesPagination';
import '../styles/AdminDashboard.css';

const ADMIN_PROPERTIES_PER_PAGE = 50;
const DASHBOARD_ROLE_KEYS = ['client', 'agent_bancaire', 'admin'];
const DASHBOARD_SUGGESTION_STATUS_KEYS = ['pending', 'accepted', 'rejected', 'ignored'];

function createEmptyDashboardSummary() {
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

function normalizeDashboardSummary(summary = {}) {
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

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
];

const SITE_SUGGESTION_STATUS_FILTER_OPTIONS = [
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

const REPORT_STATUS_FILTER_OPTIONS = [
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
    integration_status: 'ready',
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

  return property?.price_raw || 'Prix non communiqué';
}

function formatReportCategory(category) {
  return REPORT_CATEGORY_LABELS[category] || category || 'Catégorie inconnue';
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
      return 'Arrêt en cours';
    case 'error':
      return control.is_enabled ? 'Erreur, relance planifiée' : 'Erreur';
    case 'scheduled':
      return 'Automatique active';
    default:
      return control.is_enabled ? 'Automatique active' : 'Arrêté';
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

function formatSiteSuggestionStatus(status) {
  return SITE_SUGGESTION_STATUS_LABELS[status] || status || 'Inconnu';
}

function formatEvidenceList(evidence, key) {
  const values = evidence?.[key];
  if (!Array.isArray(values) || values.length === 0) {
    return '-';
  }

  return values.slice(0, 5).join(', ');
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
  const [dashboardSummary, setDashboardSummary] = useState(createEmptyDashboardSummary);
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
  const [propertyPagination, setPropertyPagination] = useState({
    page: 1,
    limit: ADMIN_PROPERTIES_PER_PAGE,
    total: 0,
    totalPages: 1,
    status: 'all',
    search: '',
  });
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
  const [siteSuggestions, setSiteSuggestions] = useState([]);
  const [siteSuggestionStatusFilter, setSiteSuggestionStatusFilter] = useState('pending');
  const [siteSuggestionLoading, setSiteSuggestionLoading] = useState(true);
  const [siteSuggestionError, setSiteSuggestionError] = useState('');
  const [siteSuggestionMessage, setSiteSuggestionMessage] = useState('');
  const [siteSuggestionSubmittingId, setSiteSuggestionSubmittingId] = useState(null);
  const [siteDiscoverySubmitting, setSiteDiscoverySubmitting] = useState(false);
  const apiBaseUrl = getApiBaseUrl();
  const {
    currentPropertyPage,
    setCurrentPropertyPage,
    propertyTotalPages,
    propertyVisiblePageNumbers,
    propertyVisibleRangeStart,
    propertyVisibleRangeEnd,
  } = useAdminPropertiesPagination({
    limit: propertyPagination.limit,
    total: propertyPagination.total,
    totalPages: propertyPagination.totalPages,
    search: propertySearch,
    status: propertyStatusFilter,
  });

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

  const fetchDashboardSummary = useCallback(async ({ silent = false } = {}) => {
    try {
      const token = requireAuthToken();
      const payload = await fetchAdminDashboardApi(token);
      const nextSummary = normalizeDashboardSummary(payload?.summary);
      setDashboardSummary(nextSummary);
      setUnreadReportCount(nextSummary.reports.unread);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      if (!silent) {
        setError(requestError.message || 'Erreur de chargement du tableau de bord.');
      }
    }
  }, [handleAuthFailure]);

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

  const fetchScrapeSiteSuggestions = useCallback(async ({ status = siteSuggestionStatusFilter, silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setSiteSuggestionLoading(true);
      }

      setSiteSuggestionError('');
      const payload = await fetchAdminScrapeSiteSuggestionsApi(token, {
        limit: 100,
        status,
      });
      setSiteSuggestions(Array.isArray(payload?.suggestions) ? payload.suggestions : []);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteSuggestionError(requestError.message || 'Erreur de chargement des suggestions.');
    } finally {
      if (!silent) {
        setSiteSuggestionLoading(false);
      }
    }
  }, [handleAuthFailure, siteSuggestionStatusFilter]);

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

      setScraperControlError(requestError.message || 'Erreur de chargement du contrôle du scraper.');
    } finally {
      if (!silent) {
        setScraperControlLoading(false);
      }
    }
  }, [handleAuthFailure]);

  const fetchAdminProperties = useCallback(async ({ silent = false } = {}) => {
    try {
      const token = requireAuthToken();
      if (!silent) {
        setPropertyLoading(true);
      }
      setPropertyError('');
      const payload = await fetchAdminPropertiesApi(token, {
        limit: ADMIN_PROPERTIES_PER_PAGE,
        page: currentPropertyPage,
        status: propertyStatusFilter,
        search: propertySearch,
      });
      setAdminProperties(Array.isArray(payload?.properties) ? payload.properties : []);
      setPropertyPagination((prev) => ({
        ...prev,
        ...(payload?.pagination || {}),
        page: Number(payload?.pagination?.page || currentPropertyPage),
        limit: Number(payload?.pagination?.limit || ADMIN_PROPERTIES_PER_PAGE),
        total: Number(payload?.pagination?.total || 0),
        totalPages: Math.max(1, Number(payload?.pagination?.totalPages || 1)),
      }));
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyError(requestError.message || 'Erreur de chargement des biens.');
    } finally {
      if (!silent) {
        setPropertyLoading(false);
      }
    }
  }, [currentPropertyPage, handleAuthFailure, propertySearch, propertyStatusFilter]);

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
      const nextUnreadReportCount = Number(payload?.unreadCount || 0);
      setUnreadReportCount(nextUnreadReportCount);
      setDashboardSummary((prev) => ({
        ...prev,
        reports: {
          ...prev.reports,
          unread: nextUnreadReportCount,
        },
      }));
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setReportError(requestError.message || 'Erreur de chargement des réclamations.');
    } finally {
      if (!silent) {
        setReportLoading(false);
      }
    }
  }, [handleAuthFailure]);

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      fetchDashboardSummary(),
      fetchUsers(),
      fetchScrapeSites(),
      fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter }),
      fetchScraperControl(),
      fetchAdminProperties(),
      fetchAdminReports({ status: reportStatusFilter }),
    ]);
  }, [
    fetchAdminProperties,
    fetchAdminReports,
    fetchDashboardSummary,
    fetchScrapeSiteSuggestions,
    fetchScrapeSites,
    fetchScraperControl,
    fetchUsers,
    reportStatusFilter,
    siteSuggestionStatusFilter,
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

      setReportFormMessage('Réclamation mise à jour.');

      if (report.status === 'unread' && nextStatus !== 'unread') {
        setUnreadReportCount((prev) => Math.max(0, prev - 1));
      }

      await Promise.all([
        fetchAdminReports({ status: reportStatusFilter, silent: true }),
        fetchDashboardSummary({ silent: true }),
      ]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setReportFormMessage('');
      setReportError(requestError.message || 'Erreur pendant la mise à jour de la réclamation.');
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
      setFormMessage('Nom et e-mail sont obligatoires.');
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

      setFormMessage(formMode === 'create' ? 'Utilisateur créé.' : 'Utilisateur mis à jour.');
      resetForm();
      await Promise.all([fetchUsers(), fetchDashboardSummary({ silent: true })]);
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
      await Promise.all([fetchUsers(), fetchDashboardSummary({ silent: true })]);
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
      integration_status: site.integration_status || 'ready',
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
    integration_status: siteFormData.integration_status || 'ready',
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
      await Promise.all([fetchScrapeSites(), fetchDashboardSummary({ silent: true })]);
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
      await Promise.all([fetchScrapeSites(), fetchDashboardSummary({ silent: true })]);
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
        ? 'Site désactivé pour les prochains lancements.'
          : 'Site reactive pour les prochains lancements.',
      );
      await fetchDashboardSummary({ silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteFormMessage(requestError.message || 'Erreur pendant la mise à jour du statut.');
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

      setScraperControlError(requestError.message || 'Erreur pendant la mise à jour du scraper.');
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
        'Cycle de scraping démarré. Les prochains rescrapes suivront cet intervalle.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le démarrage du scraper.');
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
        'Agent de filtrage démarré. Les annonces nettoyées seront synchronisées après le filtrage.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le démarrage de l’agent.');
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
        'Le scraping automatique a été arrêté.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant l’arrêt du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStartSiteDiscovery = async () => {
    try {
      const token = requireAuthToken();
      setSiteDiscoverySubmitting(true);
      setSiteSuggestionError('');
      setSiteSuggestionMessage('');

      const payload = await startAdminScrapeSiteDiscoveryApi(token);
      const written = Number(payload?.result?.suggestions_written || 0);

      setSiteSuggestionMessage(
        written > 0
          ? `${written} nouvelle(s) suggestion(s) détectée(s).`
          : 'Recherche terminée : aucune nouvelle suggestion.',
      );
      await fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter, silent: true });
      await fetchDashboardSummary({ silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteSuggestionError(requestError.message || 'Erreur pendant la recherche de nouveaux sites.');
    } finally {
      setSiteDiscoverySubmitting(false);
    }
  };

  const handleUpdateSiteSuggestionStatus = async (suggestion, status) => {
    try {
      const token = requireAuthToken();
      setSiteSuggestionSubmittingId(suggestion.id);
      setSiteSuggestionError('');
      setSiteSuggestionMessage('');

      await updateAdminScrapeSiteSuggestionApi(suggestion.id, { status }, token);
      setSiteSuggestionMessage('Suggestion mise à jour.');
      await Promise.all([
        fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter, silent: true }),
        fetchDashboardSummary({ silent: true }),
      ]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteSuggestionError(requestError.message || 'Erreur pendant la mise à jour de la suggestion.');
    } finally {
      setSiteSuggestionSubmittingId(null);
    }
  };

  const handleAcceptSiteSuggestion = async (suggestion) => {
    try {
      const token = requireAuthToken();
      setSiteSuggestionSubmittingId(suggestion.id);
      setSiteSuggestionError('');
      setSiteSuggestionMessage('');

      await acceptAdminScrapeSiteSuggestionApi(suggestion.id, {}, token);
      setSiteSuggestionMessage(
        'Suggestion acceptée. Le site est ajouté en attente de spider et reste inactif.',
      );
      await Promise.all([
        fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter, silent: true }),
        fetchScrapeSites(),
        fetchDashboardSummary({ silent: true }),
      ]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteSuggestionError(requestError.message || 'Erreur pendant l acceptation de la suggestion.');
    } finally {
      setSiteSuggestionSubmittingId(null);
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
      setPropertyFormMessage('Le prix numérique doit être un nombre valide.');
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
      await Promise.all([fetchAdminProperties(), fetchDashboardSummary({ silent: true })]);
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
      await Promise.all([fetchAdminProperties(), fetchDashboardSummary({ silent: true })]);
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
        ? 'Bien désactivé pour l’espace client.'
          : 'Bien reactive pour l espace client.',
      );
      await fetchDashboardSummary({ silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyFormMessage(requestError.message || 'Erreur pendant la mise à jour du statut.');
    } finally {
      setPropertySubmitting(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
    fetchUsers();
    fetchScrapeSites();
    fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter });
    fetchScraperControl();
    fetchAdminProperties();
  }, [
    fetchAdminProperties,
    fetchDashboardSummary,
    fetchScrapeSiteSuggestions,
    fetchScrapeSites,
    fetchScraperControl,
    fetchUsers,
    siteSuggestionStatusFilter,
  ]);

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
    return dashboardSummary.users.roles;
  }, [dashboardSummary.users.roles]);

  const siteTotals = useMemo(() => {
    return dashboardSummary.scrapeSites;
  }, [dashboardSummary.scrapeSites]);

  const siteSuggestionTotals = useMemo(() => {
    return dashboardSummary.scrapeSiteSuggestions;
  }, [dashboardSummary.scrapeSiteSuggestions]);

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
    return dashboardSummary.properties;
  }, [dashboardSummary.properties]);

  const pieData = useMemo(
    () =>
      [
        { key: 'client', name: 'Clients', value: roleTotals.client || 0 },
        { key: 'agent_bancaire', name: 'Agents bancaires', value: roleTotals.agent_bancaire || 0 },
        { key: 'admin', name: 'Administrateurs', value: roleTotals.admin || 0 },
      ].filter((item) => item.value > 0),
    [roleTotals],
  );

  const barData = useMemo(
    () => [
      { role: 'Clients', total: roleTotals.client || 0 },
      { role: 'Agents', total: roleTotals.agent_bancaire || 0 },
      { role: 'Administrateurs', total: roleTotals.admin || 0 },
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

  const filteredAdminProperties = adminPropertiesSorted;
  const paginatedAdminProperties = filteredAdminProperties;

  const menuItems = [
    { key: 'dashboard', label: 'Tableau de bord', icon: FaHome },
    { key: 'users', label: 'Utilisateurs', icon: FaUsers },
    { key: 'properties', label: 'Biens', icon: FaBuilding },
    { key: 'mail', label: 'Mail', icon: FaEnvelope },
    { key: 'sites', label: 'Sites scrapés', icon: FaGlobe },
    { key: 'activities', label: 'Activités', icon: FaListAlt },
    { key: 'stats', label: 'Statistiques', icon: FaChartLine },
    { key: 'settings', label: 'Paramètres', icon: FaCog },
  ];

  const sectionTitles = {
    dashboard: 'Tableau de bord',
    users: 'Gestion des utilisateurs',
    properties: 'Gestion des biens immobiliers',
    mail: 'Boîte mail réclamations',
    sites: 'Gestion des sites scrapés',
    activities: 'Activités récentes',
    stats: 'Statistiques',
    settings: 'Paramètres',
  };

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--state">
        <div className="admin-state admin-state--page">
          <FaSyncAlt className="spin" />
          <p>Chargement du tableau de bord admin...</p>
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
            Réessayer
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
                aria-label="Mail réclamations"
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
                disabled={submitting || siteSubmitting || propertySubmitting || siteDiscoverySubmitting}
              >
                Actualiser
              </button>
              <button
                type="button"
                className="admin-topbar-btn admin-topbar-btn--logout"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                <span>Déconnexion</span>
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
                      <p>{dashboardSummary.users.total}</p>
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
                      <h3>Réclamations non lues</h3>
                      <p>{dashboardSummary.reports.unread}</p>
                    </div>
                  </div>
                </div>

                <div className="admin-card admin-dashboard-status-card">
                  <div className="admin-dashboard-status-head">
                    <div>
                      <h2>État des biens immobiliers</h2>
                      <p className="admin-section-help">
                        Synthèse des biens visibles, actifs et collectés sur la plateforme.
                      </p>
                    </div>
                  </div>
                  <div className="admin-dashboard-status-grid">
                    <article className="admin-dashboard-status-item">
                      <span className="admin-dashboard-status-icon">
                        <FaBuilding />
                      </span>
                      <div>
                        <span>Total admin</span>
                        <strong>{propertyTotals.total}</strong>
                      </div>
                    </article>
                    <article className="admin-dashboard-status-item">
                      <span className="admin-dashboard-status-icon">
                        <FaChartLine />
                      </span>
                      <div>
                        <span>Actifs côté client</span>
                        <strong>{propertyTotals.active}</strong>
                      </div>
                    </article>
                    <article className="admin-dashboard-status-item">
                      <span className="admin-dashboard-status-icon">
                        <FaTimes />
                      </span>
                      <div>
                        <span>Désactivés</span>
                        <strong>{propertyTotals.inactive}</strong>
                      </div>
                    </article>
                    <article className="admin-dashboard-status-item">
                      <span className="admin-dashboard-status-icon">
                        <FaListAlt />
                      </span>
                      <div>
                        <span>Ajoutés par admin</span>
                        <strong>{propertyTotals.adminCreated}</strong>
                      </div>
                    </article>
                    <article className="admin-dashboard-status-item">
                      <span className="admin-dashboard-status-icon">
                        <FaGlobe />
                      </span>
                      <div>
                        <span>Sites actifs</span>
                        <strong>{siteTotals.active}</strong>
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'users' && (
            <AdminUsersSection
              filteredUsers={filteredUsers}
              editingUserId={editingUserId}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              openCreatePanel={openCreatePanel}
              startEdit={startEdit}
              requestDelete={requestDelete}
              getInitials={getInitials}
              formatRole={formatRole}
              formatDate={formatDate}
            />
          )}
          {activeSection === 'properties' && (
            <AdminPropertiesSection
              statusFilterOptions={STATUS_FILTER_OPTIONS}
              propertyPagination={propertyPagination}
              propertyLoading={propertyLoading}
              propertyError={propertyError}
              propertyFormMessage={propertyFormMessage}
              propertySearch={propertySearch}
              setPropertySearch={setPropertySearch}
              propertyStatusFilter={propertyStatusFilter}
              setPropertyStatusFilter={setPropertyStatusFilter}
              propertyVisibleRangeStart={propertyVisibleRangeStart}
              propertyVisibleRangeEnd={propertyVisibleRangeEnd}
              paginatedAdminProperties={paginatedAdminProperties}
              propertyTotalPages={propertyTotalPages}
              currentPropertyPage={currentPropertyPage}
              setCurrentPropertyPage={setCurrentPropertyPage}
              propertyVisiblePageNumbers={propertyVisiblePageNumbers}
              propertySubmitting={propertySubmitting}
              editingPropertyId={editingPropertyId}
              openCreatePropertyPanel={openCreatePropertyPanel}
              handleTogglePropertyStatus={handleTogglePropertyStatus}
              startEditProperty={startEditProperty}
              requestDeleteProperty={requestDeleteProperty}
              formatPropertyPrice={formatPropertyPrice}
              formatDate={formatDate}
            />
          )}
          {activeSection === 'mail' && (
            <AdminReportsSection
              reportStatusFilterOptions={REPORT_STATUS_FILTER_OPTIONS}
              adminReports={adminReports}
              reportLoading={reportLoading}
              reportError={reportError}
              reportFormMessage={reportFormMessage}
              reportStatusFilter={reportStatusFilter}
              setReportStatusFilter={setReportStatusFilter}
              reportSubmittingId={reportSubmittingId}
              handleReportStatusUpdate={handleReportStatusUpdate}
              formatReportStatus={formatReportStatus}
              formatReportCategory={formatReportCategory}
              formatDate={formatDate}
            />
          )}
          {activeSection === 'sites' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column admin-sites-column">
                <AdminScraperControlSection
                  scraperControl={scraperControl}
                  scraperControlLoading={scraperControlLoading}
                  scraperControlError={scraperControlError}
                  scraperControlMessage={scraperControlMessage}
                  scraperSubmitting={scraperSubmitting}
                  scraperIntervalDays={scraperIntervalDays}
                  scraperIntervalDirty={scraperIntervalDirty}
                  scraperStatusClassName={scraperStatusClassName}
                  scraperStatusLabel={scraperStatusLabel}
                  scraperIsRunning={scraperIsRunning}
                  scraperIsEnabled={scraperIsEnabled}
                  scraperProgressPercent={scraperProgressPercent}
                  scraperProgressSteps={scraperProgressSteps}
                  scraperRunTypeLabel={scraperRunTypeLabel}
                  scraperEtaLabel={scraperEtaLabel}
                  scraperCurrentCommandLabel={scraperCurrentCommandLabel}
                  scraperRecentLog={scraperRecentLog}
                  siteTotals={siteTotals}
                  handleScraperIntervalChange={handleScraperIntervalChange}
                  handleSaveScraperConfig={handleSaveScraperConfig}
                  handleStartScraper={handleStartScraper}
                  handleStartListingCleaner={handleStartListingCleaner}
                  handleStopScraper={handleStopScraper}
                  fetchScraperControl={fetchScraperControl}
                  formatDateTime={formatDateTime}
                  formatDuration={formatDuration}
                  formatScraperRunType={formatScraperRunType}
                />
                <AdminSiteSuggestionsSection
                  suggestionStatusFilterOptions={SITE_SUGGESTION_STATUS_FILTER_OPTIONS}
                  siteSuggestions={siteSuggestions}
                  siteSuggestionTotals={siteSuggestionTotals}
                  siteSuggestionStatusFilter={siteSuggestionStatusFilter}
                  setSiteSuggestionStatusFilter={setSiteSuggestionStatusFilter}
                  siteSuggestionLoading={siteSuggestionLoading}
                  siteSuggestionError={siteSuggestionError}
                  siteSuggestionMessage={siteSuggestionMessage}
                  siteSuggestionSubmittingId={siteSuggestionSubmittingId}
                  siteDiscoverySubmitting={siteDiscoverySubmitting}
                  handleStartSiteDiscovery={handleStartSiteDiscovery}
                  handleAcceptSiteSuggestion={handleAcceptSiteSuggestion}
                  handleUpdateSiteSuggestionStatus={handleUpdateSiteSuggestionStatus}
                  formatSiteSuggestionStatus={formatSiteSuggestionStatus}
                  formatEvidenceList={formatEvidenceList}
                  formatDate={formatDate}
                />
                <AdminScrapeSitesSection
                  statusFilterOptions={STATUS_FILTER_OPTIONS}
                  filteredSites={filteredSites}
                  siteSearch={siteSearch}
                  setSiteSearch={setSiteSearch}
                  siteStatusFilter={siteStatusFilter}
                  setSiteStatusFilter={setSiteStatusFilter}
                  siteFormMessage={siteFormMessage}
                  siteError={siteError}
                  siteLoading={siteLoading}
                  siteSubmitting={siteSubmitting}
                  editingSiteId={editingSiteId}
                  openCreateSitePanel={openCreateSitePanel}
                  handleToggleSiteStatus={handleToggleSiteStatus}
                  startEditSite={startEditSite}
                  requestDeleteSite={requestDeleteSite}
                  formatDate={formatDate}
                />
              </section>
            </div>
          )}
          {activeSection === 'activities' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                      <h2>Dernières activités utilisateurs</h2>
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
                    <h2>Répartition des rôles</h2>
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
                    <h2>Volume par rôle</h2>
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
                  <h2>Paramètres du module admin</h2>
                  <p className="admin-section-help">
                    Configuration actuelle du tableau de bord admin.
                  </p>
                  <ul className="admin-settings-list">
                    <li>API: {apiBaseUrl}</li>
                    <li>Utilisateurs en base : {dashboardSummary.users.total}</li>
                    <li>Biens en base : {propertyTotals.total}</li>
                    <li>Réclamations non lues : {dashboardSummary.reports.unread}</li>
                    <li>Sites de collecte en base : {siteTotals.total}</li>
                    <li>Mode édition utilisateur : {formMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                    <li>Mode édition bien : {propertyFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                    <li>Mode édition site : {siteFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
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
              <h2>{formMode === 'create' ? 'Nouvel utilisateur' : `Modifier utilisateur #${editingUserId}`}</h2>
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
              Remplissez le formulaire puis validez pour créer ou mettre à jour un compte.
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
                placeholder="E-mail"
                value={formData.email}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <input
                name="password"
                type="password"
                placeholder={
                  formMode === 'create'
                    ? 'Mot de passe (min. 6)'
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
                    placeholder="Téléphone (optionnel)"
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
                  {submitting ? 'Traitement...' : formMode === 'create' ? 'Créer' : 'Enregistrer'}
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
                  placeholder="Ex. : Appartement S+2 à Tunis"
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
                  Prix numérique (colonne price_value)
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
                  placeholder="Description complète du bien immobilier."
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
                <span>Bien actif pour l’espace client</span>
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
                  URL de départ (colonne start_url)
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
                  placeholder="Ex. : Portail de petites annonces immobilières en Tunisie."
                  value={siteFormData.description}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                  rows={4}
                />
              </div>
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-integration-status">
                  Statut integration
                </label>
                <select
                  id="site-integration-status"
                  name="integration_status"
                  value={siteFormData.integration_status}
                  onChange={handleSiteFormChange}
                  disabled={siteSubmitting}
                >
                  <option value="ready">Spider pret</option>
                  <option value="pending_spider">En attente de spider</option>
                      <option value="disabled">Désactivé techniquement</option>
                </select>
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

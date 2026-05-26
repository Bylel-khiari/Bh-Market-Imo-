import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaCog,
  FaEnvelope,
  FaExclamationTriangle,
  FaGlobe,
  FaHome,
  FaListAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaUsers,
} from 'react-icons/fa';
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
} from '../../lib/auth';
import AdminReportsSection from '../../features/admin/components/AdminReportsSection';
import useAdminPropertiesPagination from '../../features/admin/hooks/useAdminPropertiesPagination';
import AdminChartsSection from './components/AdminChartsSection';
import AdminModals from './components/AdminModals';
import AdminPropertiesTable from './components/AdminPropertiesTable';
import AdminScraperPanel from './components/AdminScraperPanel';
import AdminSidebar from './components/AdminSidebar';
import AdminStatsCards from './components/AdminStatsCards';
import AdminUsersTable from './components/AdminUsersTable';
import {
  ADMIN_PROPERTIES_PER_PAGE,
  REPORT_STATUS_FILTER_OPTIONS,
  SITE_SUGGESTION_STATUS_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  createEmptyDashboardSummary,
  createEmptyPropertyForm,
  createEmptySiteForm,
  createEmptyUserForm,
  daysToYearsInput,
  formatDate,
  formatDateTime,
  formatDateTimeLocalValue,
  formatDuration,
  formatEvidenceList,
  formatPropertyPrice,
  formatReportCategory,
  formatReportStatus,
  formatRole,
  formatScraperRunType,
  formatScraperStatus,
  formatSiteSuggestionStatus,
  generateSecurePassword,
  getInitials,
  normalizeDashboardSummary,
  normalizeRibInput,
  yearsToDays,
} from './utils/adminFormatters';
import '../../styles/AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboardSummary, setDashboardSummary] = useState(createEmptyDashboardSummary);
  const [users, setUsers] = useState([]);
  const [scrapeSites, setScrapeSites] = useState([]);
  const [adminProperties, setAdminProperties] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isParameterMenuOpen, setIsParameterMenuOpen] = useState(true);
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
  const [scraperMaxListingAgeYears, setScraperMaxListingAgeYears] = useState('3');
  const [scraperIntervalDirty, setScraperIntervalDirty] = useState(false);
  const scraperIntervalDirtyRef = useRef(false);
  const [siteSuggestions, setSiteSuggestions] = useState([]);
  const [siteSuggestionStatusFilter, setSiteSuggestionStatusFilter] = useState('pending');
  const [siteSuggestionLoading, setSiteSuggestionLoading] = useState(true);
  const siteSuggestionsLoadedRef = useRef(false);
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

  const fetchScrapeSiteSuggestions = useCallback(async ({ status = 'pending', silent = false } = {}) => {
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
      siteSuggestionsLoadedRef.current = true;

      if (!silent) {
        setSiteSuggestionLoading(false);
      }
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
      if (nextControl?.max_listing_age_days && !scraperIntervalDirtyRef.current) {
        setScraperMaxListingAgeYears(daysToYearsInput(nextControl.max_listing_age_days));
      }
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur de chargement du contrÃ´le du scraper.');
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

      setReportError(requestError.message || 'Erreur de chargement des rÃ©clamations.');
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

      setReportFormMessage('RÃ©clamation mise Ã  jour.');

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
      setReportError(requestError.message || 'Erreur pendant la mise Ã  jour de la rÃ©clamation.');
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
      rib_bancaire: user.rib_bancaire || '',
      generate_rib_bancaire: false,
      address: '',
      phone: '',
      matricule: '',
    });
    setFormMessage('');
    setIsEditPanelOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };

      if (name === 'role' && value !== 'client') {
        next.rib_bancaire = '';
        next.generate_rib_bancaire = false;
      }

      if (name === 'generate_rib_bancaire' && checked) {
        next.rib_bancaire = '';
      }

      return next;
    });
  };

  const handleGeneratePassword = () => {
    setFormData((prev) => ({ ...prev, password: generateSecurePassword() }));
    setFormMessage('Mot de passe genere. Pensez a le communiquer au client.');
  };

  const buildPayload = () => {
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    if (formData.password) payload.password = formData.password;
    if (formData.role === 'client') {
      payload.generate_rib_bancaire = Boolean(formData.generate_rib_bancaire);
      if (!payload.generate_rib_bancaire) {
        payload.rib_bancaire = normalizeRibInput(formData.rib_bancaire);
      }
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

    if (
      formData.role === 'client' &&
      !formData.generate_rib_bancaire &&
      !normalizeRibInput(formData.rib_bancaire)
    ) {
      setFormMessage('Le RIB bancaire est obligatoire pour un compte client.');
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

      setFormMessage(formMode === 'create' ? 'Utilisateur crÃ©Ã©.' : 'Utilisateur mis Ã  jour.');
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
        ? 'Site dÃ©sactivÃ© pour les prochains lancements.'
          : 'Site reactive pour les prochains lancements.',
      );
      await fetchDashboardSummary({ silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteFormMessage(requestError.message || 'Erreur pendant la mise Ã  jour du statut.');
    } finally {
      setSiteSubmitting(false);
    }
  };

  const syncScraperControlState = (control, message = '') => {
    setScraperControl(control || null);

    if (control?.interval_days) {
      setScraperIntervalDays(String(control.interval_days));
    }

    if (control?.max_listing_age_days) {
      setScraperMaxListingAgeYears(daysToYearsInput(control.max_listing_age_days));
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

  const readScraperMaxListingAgeDays = () => {
    const value = yearsToDays(scraperMaxListingAgeYears);

    if (!value || value < 365 || value > 365 * 20) {
      setScraperControlMessage('');
      setScraperControlError('Choisissez un age maximum valide entre 1 et 20 ans.');
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

  const handleScraperMaxListingAgeChange = (event) => {
    setScraperMaxListingAgeYears(event.target.value);
    setScraperControlError('');
    scraperIntervalDirtyRef.current = true;
    setScraperIntervalDirty(true);
  };

  const handleSaveScraperConfig = async () => {
    const intervalDays = readScraperIntervalDays();
    if (!intervalDays) return;
    const maxListingAgeDays = readScraperMaxListingAgeDays();
    if (!maxListingAgeDays) return;

    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await updateAdminScraperControlApi(
        {
          interval_days: intervalDays,
          max_listing_age_days: maxListingAgeDays,
        },
        token,
      );

      syncScraperControlState(
        payload?.control || scraperControl,
        'Configuration du scraping mise a jour.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant la mise Ã  jour du scraper.');
    } finally {
      setScraperSubmitting(false);
    }
  };

  const handleStartScraper = async () => {
    const intervalDays = readScraperIntervalDays();
    if (!intervalDays) return;
    const maxListingAgeDays = readScraperMaxListingAgeDays();
    if (!maxListingAgeDays) return;

    try {
      const token = requireAuthToken();
      setScraperSubmitting(true);
      setScraperControlError('');
      setScraperControlMessage('');

      const payload = await startAdminScraperApi(
        {
          interval_days: intervalDays,
          max_listing_age_days: maxListingAgeDays,
        },
        token,
      );

      syncScraperControlState(
        payload?.control || scraperControl,
        'Cycle de scraping dÃ©marrÃ©. Les prochains rescrapes suivront cet intervalle.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le dÃ©marrage du scraper.');
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
        'Agent de filtrage dÃ©marrÃ©. Les annonces nettoyÃ©es seront synchronisÃ©es aprÃ¨s le filtrage.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant le dÃ©marrage de lâ€™agent.');
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
        'Le scraping automatique a Ã©tÃ© arrÃªtÃ©.',
      );
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setScraperControlError(requestError.message || 'Erreur pendant lâ€™arrÃªt du scraper.');
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
          ? `${written} nouvelle(s) suggestion(s) dÃ©tectÃ©e(s).`
          : 'Recherche terminÃ©e : aucune nouvelle suggestion.',
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
      setSiteSuggestionMessage('Suggestion mise Ã  jour.');
      await Promise.all([
        fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter, silent: true }),
        fetchDashboardSummary({ silent: true }),
      ]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteSuggestionError(requestError.message || 'Erreur pendant la mise Ã  jour de la suggestion.');
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
        'Suggestion acceptÃ©e. Le site est ajoutÃ© en attente de spider et reste inactif.',
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
      setPropertyFormMessage('Le prix numÃ©rique doit Ãªtre un nombre valide.');
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
        ? 'Bien dÃ©sactivÃ© pour lâ€™espace client.'
          : 'Bien reactive pour l espace client.',
      );
      await fetchDashboardSummary({ silent: true });
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setPropertyFormMessage(requestError.message || 'Erreur pendant la mise Ã  jour du statut.');
    } finally {
      setPropertySubmitting(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
    fetchUsers();
    fetchScrapeSites();
    fetchScraperControl();
    fetchAdminProperties();
  }, [
    fetchAdminProperties,
    fetchDashboardSummary,
    fetchScrapeSites,
    fetchScraperControl,
    fetchUsers,
  ]);

  useEffect(() => {
    fetchScrapeSiteSuggestions({
      status: siteSuggestionStatusFilter,
      silent: siteSuggestionsLoadedRef.current,
    });
  }, [fetchScrapeSiteSuggestions, siteSuggestionStatusFilter]);

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
      const haystack = `${user?.name || ''} ${user?.email || ''} ${user?.rib_bancaire || ''} ${user?.role || ''}`.toLowerCase();
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

  const parameterMenuItems = [
    { key: 'users', label: 'Utilisateurs', icon: FaUsers },
    { key: 'properties', label: 'Biens', icon: FaBuilding },
    { key: 'sites', label: 'Sites scrapÃ©s', icon: FaGlobe },
  ];

  const menuItems = [
    { key: 'dashboard', label: 'Tableau de bord', icon: FaHome },
    { key: 'mail', label: 'RÃ©clamation', icon: FaEnvelope },
    { key: 'activities', label: 'ActivitÃ©s', icon: FaListAlt },
    { key: 'settings', label: 'Configuration', icon: FaCog },
  ];
  const isParameterSectionActive = parameterMenuItems.some((item) => item.key === activeSection);

  const sectionTitles = {
    dashboard: 'Tableau de bord',
    users: 'Gestion des utilisateurs',
    properties: 'Gestion des biens immobiliers',
    mail: 'RÃ©clamation',
    sites: 'Gestion des sites scrapÃ©s',
    activities: 'ActivitÃ©s rÃ©centes',
    settings: 'Configuration',
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
            RÃ©essayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-shell">
        <AdminSidebar
          activeSection={activeSection}
          isParameterMenuOpen={isParameterMenuOpen}
          isParameterSectionActive={isParameterSectionActive}
          menuItems={menuItems}
          parameterMenuItems={parameterMenuItems}
          setActiveSection={setActiveSection}
          setIsParameterMenuOpen={setIsParameterMenuOpen}
        />

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
                aria-label="RÃ©clamations"
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
                <span>DÃ©connexion</span>
              </button>
            </div>
          </div>

          {activeSection === 'dashboard' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <AdminStatsCards
                  dashboardSummary={dashboardSummary}
                  propertyTotals={propertyTotals}
                  roleTotals={roleTotals}
                  siteTotals={siteTotals}
                />
                <AdminChartsSection propertyTotals={propertyTotals} siteTotals={siteTotals} />
              </section>
            </div>
          )}


          {activeSection === 'users' && (
            <AdminUsersTable
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
            <AdminPropertiesTable
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
            <AdminScraperPanel
              editingSiteId={editingSiteId}
              fetchScraperControl={fetchScraperControl}
              filteredSites={filteredSites}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              formatDuration={formatDuration}
              formatEvidenceList={formatEvidenceList}
              formatScraperRunType={formatScraperRunType}
              formatSiteSuggestionStatus={formatSiteSuggestionStatus}
              handleAcceptSiteSuggestion={handleAcceptSiteSuggestion}
              handleSaveScraperConfig={handleSaveScraperConfig}
              handleScraperIntervalChange={handleScraperIntervalChange}
              handleScraperMaxListingAgeChange={handleScraperMaxListingAgeChange}
              handleStartListingCleaner={handleStartListingCleaner}
              handleStartScraper={handleStartScraper}
              handleStartSiteDiscovery={handleStartSiteDiscovery}
              handleStopScraper={handleStopScraper}
              handleToggleSiteStatus={handleToggleSiteStatus}
              handleUpdateSiteSuggestionStatus={handleUpdateSiteSuggestionStatus}
              openCreateSitePanel={openCreateSitePanel}
              requestDeleteSite={requestDeleteSite}
              scraperControl={scraperControl}
              scraperControlError={scraperControlError}
              scraperControlLoading={scraperControlLoading}
              scraperControlMessage={scraperControlMessage}
              scraperCurrentCommandLabel={scraperCurrentCommandLabel}
              scraperEtaLabel={scraperEtaLabel}
              scraperIntervalDays={scraperIntervalDays}
              scraperIntervalDirty={scraperIntervalDirty}
              scraperIsEnabled={scraperIsEnabled}
              scraperIsRunning={scraperIsRunning}
              scraperMaxListingAgeYears={scraperMaxListingAgeYears}
              scraperProgressPercent={scraperProgressPercent}
              scraperProgressSteps={scraperProgressSteps}
              scraperRecentLog={scraperRecentLog}
              scraperRunTypeLabel={scraperRunTypeLabel}
              scraperStatusClassName={scraperStatusClassName}
              scraperStatusLabel={scraperStatusLabel}
              scraperSubmitting={scraperSubmitting}
              setSiteSearch={setSiteSearch}
              setSiteStatusFilter={setSiteStatusFilter}
              setSiteSuggestionStatusFilter={setSiteSuggestionStatusFilter}
              siteDiscoverySubmitting={siteDiscoverySubmitting}
              siteError={siteError}
              siteFormMessage={siteFormMessage}
              siteLoading={siteLoading}
              siteSearch={siteSearch}
              siteStatusFilter={siteStatusFilter}
              siteSubmitting={siteSubmitting}
              siteSuggestionError={siteSuggestionError}
              siteSuggestionLoading={siteSuggestionLoading}
              siteSuggestionMessage={siteSuggestionMessage}
              siteSuggestionStatusFilter={siteSuggestionStatusFilter}
              siteSuggestionSubmittingId={siteSuggestionSubmittingId}
              siteSuggestionTotals={siteSuggestionTotals}
              siteSuggestions={siteSuggestions}
              siteTotals={siteTotals}
              startEditSite={startEditSite}
              statusFilterOptions={STATUS_FILTER_OPTIONS}
              suggestionStatusFilterOptions={SITE_SUGGESTION_STATUS_FILTER_OPTIONS}
            />
          )}
          {activeSection === 'activities' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                      <h2>DerniÃ¨res activitÃ©s utilisateurs</h2>
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

          {activeSection === 'settings' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                  <h2>Configuration du module admin</h2>
                  <p className="admin-section-help">
                    Configuration actuelle du tableau de bord admin.
                  </p>
                  <ul className="admin-settings-list">
                    <li>API: {apiBaseUrl}</li>
                    <li>Utilisateurs en base : {dashboardSummary.users.total}</li>
                    <li>Biens en base : {propertyTotals.total}</li>
                    <li>RÃ©clamations non lues : {dashboardSummary.reports.unread}</li>
                    <li>Sites de collecte en base : {siteTotals.total}</li>
                    <li>Mode Ã©dition utilisateur : {formMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                    <li>Mode Ã©dition bien : {propertyFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                    <li>Mode Ã©dition site : {siteFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                  </ul>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      <AdminModals
        activeSection={activeSection}
        closeDeleteConfirm={closeDeleteConfirm}
        closeDeletePropertyConfirm={closeDeletePropertyConfirm}
        closeDeleteSiteConfirm={closeDeleteSiteConfirm}
        deleteCandidate={deleteCandidate}
        editingPropertyId={editingPropertyId}
        editingSiteId={editingSiteId}
        editingUserId={editingUserId}
        formData={formData}
        formMessage={formMessage}
        formMode={formMode}
        handleDeleteConfirmed={handleDeleteConfirmed}
        handleDeletePropertyConfirmed={handleDeletePropertyConfirmed}
        handleDeleteSiteConfirmed={handleDeleteSiteConfirmed}
        handleFormChange={handleFormChange}
        handleGeneratePassword={handleGeneratePassword}
        handlePropertyFormChange={handlePropertyFormChange}
        handlePropertySubmit={handlePropertySubmit}
        handleSiteFormChange={handleSiteFormChange}
        handleSiteSubmit={handleSiteSubmit}
        handleSubmit={handleSubmit}
        isEditPanelOpen={isEditPanelOpen}
        isPropertyPanelOpen={isPropertyPanelOpen}
        isSitePanelOpen={isSitePanelOpen}
        openCreatePanel={openCreatePanel}
        openCreatePropertyPanel={openCreatePropertyPanel}
        openCreateSitePanel={openCreateSitePanel}
        propertyDeleteCandidate={propertyDeleteCandidate}
        propertyFormData={propertyFormData}
        propertyFormMessage={propertyFormMessage}
        propertyFormMode={propertyFormMode}
        propertySubmitting={propertySubmitting}
        resetForm={resetForm}
        resetPropertyForm={resetPropertyForm}
        resetSiteForm={resetSiteForm}
        siteDeleteCandidate={siteDeleteCandidate}
        siteFormData={siteFormData}
        siteFormMessage={siteFormMessage}
        siteFormMode={siteFormMode}
        siteSubmitting={siteSubmitting}
        submitting={submitting}
      />
    </div>
  );
}

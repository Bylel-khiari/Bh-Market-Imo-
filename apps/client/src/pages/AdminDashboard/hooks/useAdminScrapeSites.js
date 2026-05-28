import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminScrapeSiteApi,
  deleteAdminScrapeSiteApi,
  fetchAdminScrapeSitesApi,
  requireAuthToken,
  updateAdminScrapeSiteApi,
} from '../../../lib/auth';
import { createEmptySiteForm } from '../utils/adminFormatters';

export default function useAdminScrapeSites({ fetchDashboardSummary, handleAuthFailure }) {
  const [scrapeSites, setScrapeSites] = useState([]);
  const [siteSearch, setSiteSearch] = useState('');
  const [siteStatusFilter, setSiteStatusFilter] = useState('all');
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState('');
  const [isSitePanelOpen, setIsSitePanelOpen] = useState(false);
  const [siteDeleteCandidate, setSiteDeleteCandidate] = useState(null);
  const [siteFormMode, setSiteFormMode] = useState('create');
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [siteFormMessage, setSiteFormMessage] = useState('');
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const [siteFormData, setSiteFormData] = useState(createEmptySiteForm());

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

  useEffect(() => {
    fetchScrapeSites();
  }, [fetchScrapeSites]);

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

  const scrapeSitesSorted = useMemo(() => {
    return [...scrapeSites].sort((a, b) => {
      const nameComparison = String(a?.name || '').localeCompare(String(b?.name || ''), 'fr');
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return Number(a?.id || 0) - Number(b?.id || 0);
    });
  }, [scrapeSites]);

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

  return {
    closeDeleteSiteConfirm,
    editingSiteId,
    fetchScrapeSites,
    filteredSites,
    handleDeleteSiteConfirmed,
    handleSiteFormChange,
    handleSiteSubmit,
    handleToggleSiteStatus,
    isSitePanelOpen,
    openCreateSitePanel,
    requestDeleteSite,
    resetSiteForm,
    setSiteSearch,
    setSiteStatusFilter,
    siteDeleteCandidate,
    siteError,
    siteFormData,
    siteFormMessage,
    siteFormMode,
    siteLoading,
    siteSearch,
    siteStatusFilter,
    siteSubmitting,
    startEditSite,
  };
}

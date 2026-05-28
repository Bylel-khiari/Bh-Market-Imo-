import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminPropertyApi,
  deleteAdminPropertyApi,
  fetchAdminPropertiesApi,
  requireAuthToken,
  updateAdminPropertyApi,
} from '../../../lib/auth';
import useAdminPropertiesPagination from '../../../features/admin/hooks/useAdminPropertiesPagination';
import {
  ADMIN_PROPERTIES_PER_PAGE,
  createEmptyPropertyForm,
  formatDateTimeLocalValue,
} from '../utils/adminFormatters';

export default function useAdminProperties({ fetchDashboardSummary, handleAuthFailure }) {
  const [adminProperties, setAdminProperties] = useState([]);
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all');
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

  useEffect(() => {
    fetchAdminProperties();
  }, [fetchAdminProperties]);

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

  const adminPropertiesSorted = useMemo(() => {
    return [...adminProperties].sort((a, b) => {
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [adminProperties]);

  const filteredAdminProperties = adminPropertiesSorted;
  const paginatedAdminProperties = filteredAdminProperties;

  return {
    closeDeletePropertyConfirm,
    currentPropertyPage,
    editingPropertyId,
    fetchAdminProperties,
    handleDeletePropertyConfirmed,
    handlePropertyFormChange,
    handlePropertySubmit,
    handleTogglePropertyStatus,
    isPropertyPanelOpen,
    openCreatePropertyPanel,
    paginatedAdminProperties,
    propertyDeleteCandidate,
    propertyError,
    propertyFormData,
    propertyFormMessage,
    propertyFormMode,
    propertyLoading,
    propertyPagination,
    propertySearch,
    propertyStatusFilter,
    propertySubmitting,
    propertyTotalPages,
    propertyVisiblePageNumbers,
    propertyVisibleRangeEnd,
    propertyVisibleRangeStart,
    requestDeleteProperty,
    resetPropertyForm,
    setCurrentPropertyPage,
    setPropertySearch,
    setPropertyStatusFilter,
    startEditProperty,
  };
}

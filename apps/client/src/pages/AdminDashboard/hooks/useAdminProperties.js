import { useCallback, useState } from 'react';
import { fetchAdminPropertiesApi, requireAuthToken } from '../../../lib/auth';
import useAdminPropertiesPagination from '../../../features/admin/hooks/useAdminPropertiesPagination';
import { ADMIN_PROPERTIES_PER_PAGE } from '../utils/adminFormatters';

export default function useAdminProperties({
  handleAuthFailure,
  propertySearch,
  propertyStatusFilter,
}) {
  const [adminProperties, setAdminProperties] = useState([]);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [propertyError, setPropertyError] = useState('');
  const [propertyPagination, setPropertyPagination] = useState({
    page: 1,
    limit: ADMIN_PROPERTIES_PER_PAGE,
    total: 0,
    totalPages: 1,
    status: 'all',
    search: '',
  });
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

  return {
    adminProperties,
    fetchAdminProperties,
    propertyError,
    propertyLoading,
    propertyPagination,
    propertyTotalPages,
    propertyVisiblePageNumbers,
    propertyVisibleRangeEnd,
    propertyVisibleRangeStart,
    setAdminProperties,
    setCurrentPropertyPage,
    setPropertyError,
    setPropertyLoading,
    setPropertyPagination,
    currentPropertyPage,
  };
}

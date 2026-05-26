import { useCallback, useState } from 'react';
import {
  fetchAgentCreditApplicationsApi,
  fetchAgentDashboardApi,
  fetchAgentProfileApi,
  requireAuthToken,
} from '../../../lib/auth';
import { createEmptyPlatformDashboard, createEmptySummary } from '../utils/agentFormatters';

export default function useAgentDashboardData(handleAuthFailure) {
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(createEmptySummary());
  const [platformDashboard, setPlatformDashboard] = useState(createEmptyPlatformDashboard());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async ({ status = 'all', searchTerm = '', month = 'all', silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setLoading(true);
      }

      setError('');

      const [profilePayload, queuePayload, platformPayload] = await Promise.all([
        fetchAgentProfileApi(token),
        fetchAgentCreditApplicationsApi(token, {
          limit: 150,
          status,
          search: searchTerm,
        }),
        fetchAgentDashboardApi(token, { month }),
      ]);

      setProfile(profilePayload?.profile || null);
      setApplications(Array.isArray(queuePayload?.applications) ? queuePayload.applications : []);
      setSummary(queuePayload?.summary || createEmptySummary());
      setPlatformDashboard(platformPayload || createEmptyPlatformDashboard());
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Erreur de chargement du tableau de bord agent.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [handleAuthFailure]);

  const loadApplicationQueue = useCallback(async ({ status = 'all', searchTerm = '', silent = false } = {}) => {
    try {
      const token = requireAuthToken();

      if (!silent) {
        setLoading(true);
      }

      setError('');

      const queuePayload = await fetchAgentCreditApplicationsApi(token, {
        limit: 150,
        status,
        search: searchTerm,
      });

      setApplications(Array.isArray(queuePayload?.applications) ? queuePayload.applications : []);
      setSummary(queuePayload?.summary || createEmptySummary());
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Erreur de chargement des dossiers.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [handleAuthFailure]);

  return {
    applications,
    error,
    loadApplicationQueue,
    loadDashboard,
    loading,
    platformDashboard,
    profile,
    setError,
    summary,
  };
}

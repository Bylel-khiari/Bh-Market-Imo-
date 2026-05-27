import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptAdminScrapeSiteSuggestionApi,
  fetchAdminScrapeSiteSuggestionsApi,
  requireAuthToken,
  startAdminScrapeSiteDiscoveryApi,
  updateAdminScrapeSiteSuggestionApi,
} from '../../../lib/auth';

export default function useAdminSiteSuggestions({
  fetchDashboardSummary,
  fetchScrapeSites,
  handleAuthFailure,
}) {
  const [siteSuggestions, setSiteSuggestions] = useState([]);
  const [siteSuggestionStatusFilter, setSiteSuggestionStatusFilter] = useState('pending');
  const [siteSuggestionLoading, setSiteSuggestionLoading] = useState(true);
  const siteSuggestionsLoadedRef = useRef(false);
  const [siteSuggestionError, setSiteSuggestionError] = useState('');
  const [siteSuggestionMessage, setSiteSuggestionMessage] = useState('');
  const [siteSuggestionSubmittingId, setSiteSuggestionSubmittingId] = useState(null);
  const [siteDiscoverySubmitting, setSiteDiscoverySubmitting] = useState(false);

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
          ? `${written} nouvelle(s) suggestion(s) dÃƒÂ©tectÃƒÂ©e(s).`
          : 'Recherche terminÃƒÂ©e : aucune nouvelle suggestion.',
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
      setSiteSuggestionMessage('Suggestion mise ÃƒÂ  jour.');
      await Promise.all([
        fetchScrapeSiteSuggestions({ status: siteSuggestionStatusFilter, silent: true }),
        fetchDashboardSummary({ silent: true }),
      ]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setSiteSuggestionError(requestError.message || 'Erreur pendant la mise ÃƒÂ  jour de la suggestion.');
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
        'Suggestion acceptÃƒÂ©e. Le site est ajoutÃƒÂ© en attente de spider et reste inactif.',
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

  useEffect(() => {
    fetchScrapeSiteSuggestions({
      status: siteSuggestionStatusFilter,
      silent: siteSuggestionsLoadedRef.current,
    });
  }, [fetchScrapeSiteSuggestions, siteSuggestionStatusFilter]);

  return {
    fetchScrapeSiteSuggestions,
    handleAcceptSiteSuggestion,
    handleStartSiteDiscovery,
    handleUpdateSiteSuggestionStatus,
    setSiteSuggestionStatusFilter,
    siteDiscoverySubmitting,
    siteSuggestionError,
    siteSuggestionLoading,
    siteSuggestionMessage,
    siteSuggestions,
    siteSuggestionStatusFilter,
    siteSuggestionSubmittingId,
  };
}

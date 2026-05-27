import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAdminDashboardApi, requireAuthToken } from '../../../lib/auth';
import {
  createEmptyDashboardSummary,
  normalizeDashboardSummary,
} from '../utils/adminFormatters';

export default function useAdminStats(handleAuthFailure) {
  const [dashboardSummary, setDashboardSummary] = useState(createEmptyDashboardSummary);
  const [dashboardError, setDashboardError] = useState('');
  const [unreadReportCount, setUnreadReportCount] = useState(0);

  const fetchDashboardSummary = useCallback(async ({ silent = false } = {}) => {
    try {
      const token = requireAuthToken();
      const payload = await fetchAdminDashboardApi(token);
      const nextSummary = normalizeDashboardSummary(payload?.summary);
      setDashboardSummary(nextSummary);
      setUnreadReportCount(nextSummary.reports.unread);

      if (!silent) {
        setDashboardError('');
      }
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      if (!silent) {
        setDashboardError(requestError.message || 'Erreur de chargement du tableau de bord.');
      }
    }
  }, [handleAuthFailure]);

  const syncUnreadReportCount = useCallback((nextUnreadReportCount) => {
    setUnreadReportCount((prevUnreadReportCount) => {
      const resolvedCount =
        typeof nextUnreadReportCount === 'function'
          ? nextUnreadReportCount(prevUnreadReportCount)
          : nextUnreadReportCount;

      setDashboardSummary((prev) => ({
        ...prev,
        reports: {
          ...prev.reports,
          unread: resolvedCount,
        },
      }));

      return resolvedCount;
    });
  }, []);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  const roleTotals = useMemo(() => dashboardSummary.users.roles, [dashboardSummary.users.roles]);
  const siteTotals = useMemo(() => dashboardSummary.scrapeSites, [dashboardSummary.scrapeSites]);
  const siteSuggestionTotals = useMemo(
    () => dashboardSummary.scrapeSiteSuggestions,
    [dashboardSummary.scrapeSiteSuggestions],
  );
  const propertyTotals = useMemo(() => dashboardSummary.properties, [dashboardSummary.properties]);

  return {
    dashboardError,
    dashboardSummary,
    fetchDashboardSummary,
    propertyTotals,
    roleTotals,
    siteSuggestionTotals,
    siteTotals,
    syncUnreadReportCount,
    unreadReportCount,
  };
}

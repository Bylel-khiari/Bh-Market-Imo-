import { useCallback, useState } from 'react';
import { fetchAdminDashboardApi, requireAuthToken } from '../../../lib/auth';
import { createEmptyDashboardSummary, normalizeDashboardSummary } from '../utils/adminFormatters';

export default function useAdminStats(handleAuthFailure, setPageError) {
  const [dashboardSummary, setDashboardSummary] = useState(createEmptyDashboardSummary);
  const [unreadReportCount, setUnreadReportCount] = useState(0);

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
        setPageError(requestError.message || 'Erreur de chargement du tableau de bord.');
      }
    }
  }, [handleAuthFailure, setPageError]);

  return {
    dashboardSummary,
    fetchDashboardSummary,
    setDashboardSummary,
    setUnreadReportCount,
    unreadReportCount,
  };
}

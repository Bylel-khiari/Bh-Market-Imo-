import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminPropertyReportsApi,
  requireAuthToken,
  updateAdminPropertyReportStatusApi,
} from '../../../lib/auth';

export default function useAdminReports({
  fetchDashboardSummary,
  handleAuthFailure,
  syncUnreadReportCount,
}) {
  const [adminReports, setAdminReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [reportFormMessage, setReportFormMessage] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportSubmittingId, setReportSubmittingId] = useState(null);

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
      syncUnreadReportCount(Number(payload?.unreadCount || 0));
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
  }, [handleAuthFailure, syncUnreadReportCount]);

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
        syncUnreadReportCount((prev) => Math.max(0, prev - 1));
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

  useEffect(() => {
    fetchAdminReports({ status: reportStatusFilter });
  }, [fetchAdminReports, reportStatusFilter]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAdminReports({ status: reportStatusFilter, silent: true });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAdminReports, reportStatusFilter]);

  return {
    adminReports,
    fetchAdminReports,
    handleReportStatusUpdate,
    reportError,
    reportFormMessage,
    reportLoading,
    reportStatusFilter,
    reportSubmittingId,
    setReportStatusFilter,
  };
}

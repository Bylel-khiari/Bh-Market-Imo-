import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAgentApplicationReview from './applications/useAgentApplicationReview';
import {
  clearAuthSession,
  isAuthError,
} from './api/agentApi';
import useAgentPlatformMetrics from './platform/useAgentPlatformMetrics';
import { AGENT_SECTION_COPY } from './shared/agentNavigation';
import useAgentDashboardData from './shared/useAgentDashboardData';

export default function useAgentDashboardController() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const redirectToLogin = useCallback(() => {
    clearAuthSession();
    navigate('/login', { replace: true, state: { from: '/agent/dashboard' } });
  }, [navigate]);

  const handleAuthFailure = useCallback((requestError) => {
    if (!isAuthError(requestError)) {
      return false;
    }

    redirectToLogin();
    return true;
  }, [redirectToLogin]);

  const dashboardData = useAgentDashboardData(handleAuthFailure);
  const {
    applications,
    loadApplicationQueue,
    loadDashboard,
    platformDashboard,
    setError,
    summary,
  } = dashboardData;

  const applicationReview = useAgentApplicationReview({
    applications,
    handleAuthFailure,
    loadApplicationQueue,
    setError,
  });

  const platformMetrics = useAgentPlatformMetrics({
    applications,
    loadDashboard,
    platformDashboard,
    search: applicationReview.search,
    statusFilter: applicationReview.statusFilter,
    summary,
  });

  useEffect(() => {
    loadDashboard({ status: 'all', searchTerm: '' });
  }, [loadDashboard]);

  const handleRefresh = useCallback(() => {
    loadDashboard({
      status: applicationReview.statusFilter,
      searchTerm: applicationReview.search.trim(),
      month: platformMetrics.selectedMonth,
    });
  }, [applicationReview.search, applicationReview.statusFilter, loadDashboard, platformMetrics.selectedMonth]);

  const openApplicationsSection = useCallback((applicationId) => {
    if (applicationId) {
      applicationReview.setSelectedApplicationId(applicationId);
    }

    setActiveSection('applications');
  }, [applicationReview]);

  return {
    activeSection,
    applicationReview,
    dashboardData,
    handleLogout: redirectToLogin,
    handleRefresh,
    onHome: () => navigate('/'),
    openApplicationsSection,
    pageCopy: AGENT_SECTION_COPY[activeSection] || AGENT_SECTION_COPY.overview,
    platformMetrics,
    setActiveSection,
  };
}

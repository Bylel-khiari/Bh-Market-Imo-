import { useCallback, useMemo, useState } from 'react';
import useAdminAuth from './auth/useAdminAuth';
import useAdminStats from './overview/useAdminStats';
import useAdminProperties from './properties/useAdminProperties';
import useAdminReports from './reports/useAdminReports';
import useAdminScraper from './scraper/useAdminScraper';
import { ADMIN_PARAMETER_MENU_ITEMS } from './shared/adminNavigation';
import useAdminUsers from './users/useAdminUsers';

export default function useAdminDashboardController() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isParameterMenuOpen, setIsParameterMenuOpen] = useState(true);
  const { goToHomePage, handleAuthFailure, handleLogout } = useAdminAuth();

  const statsController = useAdminStats(handleAuthFailure);
  const {
    dashboardError,
    fetchDashboardSummary,
    syncUnreadReportCount,
  } = statsController;

  const usersController = useAdminUsers({
    fetchDashboardSummary,
    handleAuthFailure,
  });

  const propertiesController = useAdminProperties({
    fetchDashboardSummary,
    handleAuthFailure,
  });

  const reportsController = useAdminReports({
    fetchDashboardSummary,
    handleAuthFailure,
    syncUnreadReportCount,
  });

  const scraperController = useAdminScraper({
    activeSection,
    fetchDashboardSummary,
    handleAuthFailure,
  });

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      fetchDashboardSummary(),
      usersController.fetchUsers(),
      scraperController.fetchScrapeSites(),
      scraperController.fetchScrapeSiteSuggestions({
        status: scraperController.siteSuggestionStatusFilter,
      }),
      scraperController.fetchScraperControl(),
      propertiesController.fetchAdminProperties(),
      reportsController.fetchAdminReports({
        status: reportsController.reportStatusFilter,
      }),
    ]);
  }, [
    fetchDashboardSummary,
    propertiesController,
    reportsController,
    scraperController,
    usersController,
  ]);

  const isParameterSectionActive = useMemo(
    () => ADMIN_PARAMETER_MENU_ITEMS.some((item) => item.key === activeSection),
    [activeSection],
  );

  return {
    activeSection,
    goToHomePage,
    handleLogout,
    isLoading: usersController.loading,
    isParameterMenuOpen,
    isParameterSectionActive,
    isRefreshDisabled:
      usersController.submitting ||
      scraperController.siteSubmitting ||
      propertiesController.propertySubmitting ||
      scraperController.siteDiscoverySubmitting,
    pageError: usersController.error || dashboardError,
    propertiesController,
    refreshDashboardData,
    reportsController,
    scraperController,
    setActiveSection,
    setIsParameterMenuOpen,
    statsController,
    usersController,
  };
}

import React from 'react';
import AdminSectionRenderer from './AdminSectionRenderer';
import useAdminDashboardController from './useAdminDashboardController';
import AdminLayout from './layout/AdminLayout';
import AdminModals from './shared/AdminModals';
import { AdminErrorState, AdminLoadingState } from './shared/AdminPageState';
import {
  ADMIN_MENU_ITEMS,
  ADMIN_PARAMETER_MENU_ITEMS,
  ADMIN_SECTION_TITLES,
} from './shared/adminNavigation';
import '../../styles/AdminDashboard.css';

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboardController();

  if (dashboard.isLoading) {
    return <AdminLoadingState />;
  }

  if (dashboard.pageError) {
    return (
      <AdminErrorState
        error={dashboard.pageError}
        refreshDashboardData={dashboard.refreshDashboardData}
      />
    );
  }

  return (
    <AdminLayout
      activeSection={dashboard.activeSection}
      isParameterMenuOpen={dashboard.isParameterMenuOpen}
      isParameterSectionActive={dashboard.isParameterSectionActive}
      menuItems={ADMIN_MENU_ITEMS}
      parameterMenuItems={ADMIN_PARAMETER_MENU_ITEMS}
      setActiveSection={dashboard.setActiveSection}
      setIsParameterMenuOpen={dashboard.setIsParameterMenuOpen}
      topbarProps={{
        disabled: dashboard.isRefreshDisabled,
        goToHomePage: dashboard.goToHomePage,
        handleLogout: dashboard.handleLogout,
        refreshDashboardData: dashboard.refreshDashboardData,
        sectionTitle: ADMIN_SECTION_TITLES[dashboard.activeSection],
        setActiveSection: dashboard.setActiveSection,
        unreadReportCount: dashboard.statsController.unreadReportCount,
      }}
      modals={
        <AdminModals
          activeSection={dashboard.activeSection}
          propertiesController={dashboard.propertiesController}
          scraperController={dashboard.scraperController}
          usersController={dashboard.usersController}
        />
      }
    >
      <AdminSectionRenderer
        activeSection={dashboard.activeSection}
        propertiesController={dashboard.propertiesController}
        reportsController={dashboard.reportsController}
        scraperController={dashboard.scraperController}
        statsController={dashboard.statsController}
        usersController={dashboard.usersController}
      />
    </AdminLayout>
  );
}

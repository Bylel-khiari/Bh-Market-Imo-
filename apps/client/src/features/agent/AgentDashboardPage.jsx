import React from 'react';
import AgentSectionRenderer from './AgentSectionRenderer';
import useAgentDashboardController from './useAgentDashboardController';
import AgentLayout from './layout/AgentLayout';
import AgentLoadingState from './shared/AgentLoadingState';
import '../../styles/AdminDashboard.css';
import '../../styles/AgentDashboard.css';

export default function AgentDashboardPage() {
  const dashboard = useAgentDashboardController();

  if (dashboard.dashboardData.loading) {
    return <AgentLoadingState />;
  }

  return (
    <AgentLayout
      activeSection={dashboard.activeSection}
      dashboardData={dashboard.dashboardData}
      handleLogout={dashboard.handleLogout}
      handleRefresh={dashboard.handleRefresh}
      onHome={dashboard.onHome}
      pageCopy={dashboard.pageCopy}
      platformMetrics={dashboard.platformMetrics}
      setActiveSection={dashboard.setActiveSection}
    >
      <AgentSectionRenderer
        activeSection={dashboard.activeSection}
        applicationReview={dashboard.applicationReview}
        dashboardData={dashboard.dashboardData}
        openApplicationsSection={dashboard.openApplicationsSection}
        platformMetrics={dashboard.platformMetrics}
      />
    </AgentLayout>
  );
}

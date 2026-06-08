import React from 'react';
import AgentSidebar from './AgentSidebar';
import AgentTopbar from './AgentTopbar';

export default function AgentLayout({
  activeSection,
  children,
  dashboardData,
  handleLogout,
  handleRefresh,
  onHome,
  pageCopy,
  platformMetrics,
  setActiveSection,
}) {
  return (
    <div className="admin-dashboard agent-dashboard">
      <div className="admin-shell">
        <AgentSidebar
          acceptedCreditApplications={platformMetrics.acceptedCreditApplications}
          activeSection={activeSection}
          pendingCount={platformMetrics.pendingCount}
          profile={dashboardData.profile}
          refusedCreditApplications={platformMetrics.refusedCreditApplications}
          setActiveSection={setActiveSection}
        />

        <div className="admin-main">
          <AgentTopbar
            handleLogout={handleLogout}
            handleRefresh={handleRefresh}
            onHome={onHome}
            pageCopy={pageCopy}
          />
          {children}
        </div>
      </div>
    </div>
  );
}

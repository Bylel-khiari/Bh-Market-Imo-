import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearAuthSession,
  isAuthError,
} from '../../lib/auth';
import PowerBiDashboardDock from '../../features/agent/components/PowerBiDashboardDock';
import AgentLoadingState from './components/AgentLoadingState';
import AgentOverviewSection from './components/AgentOverviewSection';
import AgentPlatformSection from './components/AgentPlatformSection';
import AgentSidebar from './components/AgentSidebar';
import AgentTopbar from './components/AgentTopbar';
import CreditRequestsTable from './components/CreditRequestsTable';
import useAgentApplicationReview from './hooks/useAgentApplicationReview';
import useAgentDashboardData from './hooks/useAgentDashboardData';
import useAgentPlatformMetrics from './hooks/useAgentPlatformMetrics';
import {
  POWER_BI_AGENT_DASHBOARD_TITLE,
  POWER_BI_AGENT_DASHBOARD_URL,
  SECTION_COPY,
} from './utils/agentFormatters';
import '../../styles/AdminDashboard.css';
import '../../styles/AgentDashboard.css';

export default function AgentDashboard() {
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

  const {
    applications,
    error,
    loadApplicationQueue,
    loadDashboard,
    loading,
    platformDashboard,
    profile,
    setError,
    summary,
  } = useAgentDashboardData(handleAuthFailure);

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

  const pageCopy = SECTION_COPY[activeSection] || SECTION_COPY.overview;

  const handleLogout = () => {
    redirectToLogin();
  };

  const handleRefresh = () => {
    loadDashboard({
      status: applicationReview.statusFilter,
      searchTerm: applicationReview.search.trim(),
      month: platformMetrics.selectedMonth,
    });
  };

  if (loading) {
    return <AgentLoadingState />;
  }

  return (
    <div className="admin-dashboard agent-dashboard">
      <div className="admin-shell">
        <AgentSidebar
          acceptedCreditApplications={platformMetrics.acceptedCreditApplications}
          activeSection={activeSection}
          pendingCount={platformMetrics.pendingCount}
          profile={profile}
          refusedCreditApplications={platformMetrics.refusedCreditApplications}
          setActiveSection={setActiveSection}
        />

        <div className="admin-main">
          <AgentTopbar
            handleLogout={handleLogout}
            handleRefresh={handleRefresh}
            onHome={() => navigate('/')}
            pageCopy={pageCopy}
          />

          {activeSection === 'overview' && (
            <AgentOverviewSection
              approvalRate={platformMetrics.approvalRate}
              averageComplianceScore={platformMetrics.averageComplianceScore}
              onOpenApplication={(applicationId) => {
                applicationReview.setSelectedApplicationId(applicationId);
                setActiveSection('applications');
              }}
              onOpenQueue={() => setActiveSection('applications')}
              overviewApplications={platformMetrics.overviewApplications}
              pendingCount={platformMetrics.pendingCount}
              pieData={platformMetrics.pieData}
              totalCreditApplications={platformMetrics.totalCreditApplications}
            />
          )}

          {activeSection === 'applications' && (
            <CreditRequestsTable
              activeApplicationPanel={applicationReview.activeApplicationPanel}
              applications={applications}
              draft={applicationReview.draft}
              error={error}
              formMessage={applicationReview.formMessage}
              handleDraftChange={applicationReview.handleDraftChange}
              handleFilterChange={applicationReview.handleFilterChange}
              handleOpenApplicationDocument={applicationReview.handleOpenApplicationDocument}
              handleReviewSubmit={applicationReview.handleReviewSubmit}
              handleScoringSubmit={applicationReview.handleScoringSubmit}
              handleSearchSubmit={applicationReview.handleSearchSubmit}
              openingDocumentKey={applicationReview.openingDocumentKey}
              search={applicationReview.search}
              selectedApplication={applicationReview.selectedApplication}
              selectedApplicationDocuments={applicationReview.selectedApplicationDocuments}
              selectedApplicationId={applicationReview.selectedApplicationId}
              setActiveApplicationPanel={applicationReview.setActiveApplicationPanel}
              setSearch={applicationReview.setSearch}
              setSelectedApplicationId={applicationReview.setSelectedApplicationId}
              statusFilter={applicationReview.statusFilter}
              submitting={applicationReview.submitting}
            />
          )}

          {activeSection === 'platform' && (
            <AgentPlatformSection
              clientActivityDistribution={platformMetrics.clientActivityDistribution}
              clientActivitySummary={platformMetrics.clientActivitySummary}
              creditSubmitConversionRate={platformMetrics.creditSubmitConversionRate}
              dashboardMonthOptions={platformMetrics.dashboardMonthOptions}
              handleExportPlatformReport={platformMetrics.handleExportPlatformReport}
              handleMonthChange={platformMetrics.handleMonthChange}
              monthlyActivity={platformMetrics.monthlyActivity}
              monthlyClientEvents={platformMetrics.monthlyClientEvents}
              platformActivityTotal={platformMetrics.platformActivityTotal}
              platformSummary={platformMetrics.platformSummary}
              selectedMonth={platformMetrics.selectedMonth}
              topCities={platformMetrics.topCities}
              totalCreditApplications={platformMetrics.totalCreditApplications}
            />
          )}

          {activeSection === 'powerbi' && (
            <div className="admin-content-grid agent-platform-grid agent-powerbi-grid">
              <PowerBiDashboardDock
                defaultEmbedUrl={POWER_BI_AGENT_DASHBOARD_URL}
                defaultTitle={POWER_BI_AGENT_DASHBOARD_TITLE}
                onExportPlatformReport={platformMetrics.handleExportPlatformReport}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import CreditRequestsTable from './applications/CreditRequestsTable';
import AgentOverviewSection from './overview/AgentOverviewSection';
import AgentPlatformSection from './platform/AgentPlatformSection';
import PowerBiDashboardDock from './platform/PowerBiDashboardDock';
import {
  POWER_BI_AGENT_DASHBOARD_TITLE,
  POWER_BI_AGENT_DASHBOARD_URL,
} from './shared/agentFormatters';

export default function AgentSectionRenderer({
  activeSection,
  applicationReview,
  dashboardData,
  openApplicationsSection,
  platformMetrics,
}) {
  if (activeSection === 'overview') {
    return (
      <AgentOverviewSection
        approvalRate={platformMetrics.approvalRate}
        averageComplianceScore={platformMetrics.averageComplianceScore}
        onOpenApplication={openApplicationsSection}
        onOpenQueue={() => openApplicationsSection()}
        overviewApplications={platformMetrics.overviewApplications}
        pendingCount={platformMetrics.pendingCount}
        pieData={platformMetrics.pieData}
        totalCreditApplications={platformMetrics.totalCreditApplications}
      />
    );
  }

  if (activeSection === 'applications') {
    return (
      <CreditRequestsTable
        activeApplicationPanel={applicationReview.activeApplicationPanel}
        applications={dashboardData.applications}
        clockTick={applicationReview.clockTick}
        draft={applicationReview.draft}
        error={dashboardData.error}
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
    );
  }

  if (activeSection === 'platform') {
    return (
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
    );
  }

  if (activeSection === 'powerbi') {
    return (
      <div className="admin-content-grid agent-platform-grid agent-powerbi-grid">
        <PowerBiDashboardDock
          defaultEmbedUrl={POWER_BI_AGENT_DASHBOARD_URL}
          defaultTitle={POWER_BI_AGENT_DASHBOARD_TITLE}
          onExportPlatformReport={platformMetrics.handleExportPlatformReport}
        />
      </div>
    );
  }

  return null;
}

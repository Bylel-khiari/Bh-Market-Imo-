import React from 'react';
import AdminActivitiesSection from './activity/AdminActivitiesSection';
import AdminOverviewSection from './overview/AdminOverviewSection';
import AdminPropertiesTable from './properties/AdminPropertiesTable';
import AdminReportsSection from './reports/AdminReportsSection';
import AdminScraperPanel from './scraper/AdminScraperPanel';
import {
  REPORT_STATUS_FILTER_OPTIONS,
  SITE_SUGGESTION_STATUS_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  formatDate,
  formatDateTime,
  formatDuration,
  formatEvidenceList,
  formatPropertyPrice,
  formatReportCategory,
  formatReportStatus,
  formatRole,
  formatScraperRunType,
  formatSiteSuggestionStatus,
  getInitials,
} from './shared/adminFormatters';
import AdminUsersTable from './users/AdminUsersTable';

export default function AdminSectionRenderer({
  activeSection,
  propertiesController,
  reportsController,
  scraperController,
  statsController,
  usersController,
}) {
  if (activeSection === 'dashboard') {
    return (
      <AdminOverviewSection
        dashboardSummary={statsController.dashboardSummary}
        propertyTotals={statsController.propertyTotals}
        roleTotals={statsController.roleTotals}
        siteTotals={statsController.siteTotals}
      />
    );
  }

  if (activeSection === 'users') {
    return (
      <AdminUsersTable
        filteredUsers={usersController.filteredUsers}
        editingUserId={usersController.editingUserId}
        userSearch={usersController.userSearch}
        setUserSearch={usersController.setUserSearch}
        openCreatePanel={usersController.openCreatePanel}
        startEdit={usersController.startEdit}
        requestDelete={usersController.requestDelete}
        getInitials={getInitials}
        formatRole={formatRole}
        formatDate={formatDate}
      />
    );
  }

  if (activeSection === 'properties') {
    return (
      <AdminPropertiesTable
        statusFilterOptions={STATUS_FILTER_OPTIONS}
        propertyPagination={propertiesController.propertyPagination}
        propertyLoading={propertiesController.propertyLoading}
        propertyError={propertiesController.propertyError}
        propertyFormMessage={propertiesController.propertyFormMessage}
        propertySearch={propertiesController.propertySearch}
        setPropertySearch={propertiesController.setPropertySearch}
        propertyStatusFilter={propertiesController.propertyStatusFilter}
        setPropertyStatusFilter={propertiesController.setPropertyStatusFilter}
        propertyVisibleRangeStart={propertiesController.propertyVisibleRangeStart}
        propertyVisibleRangeEnd={propertiesController.propertyVisibleRangeEnd}
        paginatedAdminProperties={propertiesController.paginatedAdminProperties}
        propertyTotalPages={propertiesController.propertyTotalPages}
        currentPropertyPage={propertiesController.currentPropertyPage}
        setCurrentPropertyPage={propertiesController.setCurrentPropertyPage}
        propertyVisiblePageNumbers={propertiesController.propertyVisiblePageNumbers}
        propertySubmitting={propertiesController.propertySubmitting}
        editingPropertyId={propertiesController.editingPropertyId}
        openCreatePropertyPanel={propertiesController.openCreatePropertyPanel}
        handleTogglePropertyStatus={propertiesController.handleTogglePropertyStatus}
        startEditProperty={propertiesController.startEditProperty}
        requestDeleteProperty={propertiesController.requestDeleteProperty}
        formatPropertyPrice={formatPropertyPrice}
        formatDate={formatDate}
      />
    );
  }

  if (activeSection === 'mail') {
    return (
      <AdminReportsSection
        reportStatusFilterOptions={REPORT_STATUS_FILTER_OPTIONS}
        adminReports={reportsController.adminReports}
        reportLoading={reportsController.reportLoading}
        reportError={reportsController.reportError}
        reportFormMessage={reportsController.reportFormMessage}
        reportStatusFilter={reportsController.reportStatusFilter}
        setReportStatusFilter={reportsController.setReportStatusFilter}
        reportSubmittingId={reportsController.reportSubmittingId}
        handleReportStatusUpdate={reportsController.handleReportStatusUpdate}
        formatReportStatus={formatReportStatus}
        formatReportCategory={formatReportCategory}
        formatDate={formatDate}
      />
    );
  }

  if (activeSection === 'sites') {
    return (
      <AdminScraperPanel
        editingSiteId={scraperController.editingSiteId}
        fetchScraperControl={scraperController.fetchScraperControl}
        filteredSites={scraperController.filteredSites}
        formatDate={formatDate}
        formatDateTime={formatDateTime}
        formatDuration={formatDuration}
        formatEvidenceList={formatEvidenceList}
        formatScraperRunType={formatScraperRunType}
        formatSiteSuggestionStatus={formatSiteSuggestionStatus}
        handleAcceptSiteSuggestion={scraperController.handleAcceptSiteSuggestion}
        handleSaveScraperConfig={scraperController.handleSaveScraperConfig}
        handleScraperIntervalChange={scraperController.handleScraperIntervalChange}
        handleScraperMaxListingAgeChange={scraperController.handleScraperMaxListingAgeChange}
        handleStartListingCleaner={scraperController.handleStartListingCleaner}
        handleStartScraper={scraperController.handleStartScraper}
        handleStartSiteDiscovery={scraperController.handleStartSiteDiscovery}
        handleStopScraper={scraperController.handleStopScraper}
        handleToggleSiteStatus={scraperController.handleToggleSiteStatus}
        handleUpdateSiteSuggestionStatus={scraperController.handleUpdateSiteSuggestionStatus}
        openCreateSitePanel={scraperController.openCreateSitePanel}
        requestDeleteSite={scraperController.requestDeleteSite}
        scraperControl={scraperController.scraperControl}
        scraperControlError={scraperController.scraperControlError}
        scraperControlLoading={scraperController.scraperControlLoading}
        scraperControlMessage={scraperController.scraperControlMessage}
        scraperCurrentCommandLabel={scraperController.scraperCurrentCommandLabel}
        scraperEtaLabel={scraperController.scraperEtaLabel}
        scraperIntervalDays={scraperController.scraperIntervalDays}
        scraperIntervalDirty={scraperController.scraperIntervalDirty}
        scraperIsEnabled={scraperController.scraperIsEnabled}
        scraperIsRunning={scraperController.scraperIsRunning}
        scraperMaxListingAgeYears={scraperController.scraperMaxListingAgeYears}
        scraperProgressPercent={scraperController.scraperProgressPercent}
        scraperProgressSteps={scraperController.scraperProgressSteps}
        scraperRecentLog={scraperController.scraperRecentLog}
        scraperRunTypeLabel={scraperController.scraperRunTypeLabel}
        scraperStatusClassName={scraperController.scraperStatusClassName}
        scraperStatusLabel={scraperController.scraperStatusLabel}
        scraperSubmitting={scraperController.scraperSubmitting}
        setSiteSearch={scraperController.setSiteSearch}
        setSiteStatusFilter={scraperController.setSiteStatusFilter}
        setSiteSuggestionStatusFilter={scraperController.setSiteSuggestionStatusFilter}
        siteDiscoverySubmitting={scraperController.siteDiscoverySubmitting}
        siteError={scraperController.siteError}
        siteFormMessage={scraperController.siteFormMessage}
        siteLoading={scraperController.siteLoading}
        siteSearch={scraperController.siteSearch}
        siteStatusFilter={scraperController.siteStatusFilter}
        siteSubmitting={scraperController.siteSubmitting}
        siteSuggestionError={scraperController.siteSuggestionError}
        siteSuggestionLoading={scraperController.siteSuggestionLoading}
        siteSuggestionMessage={scraperController.siteSuggestionMessage}
        siteSuggestionStatusFilter={scraperController.siteSuggestionStatusFilter}
        siteSuggestionSubmittingId={scraperController.siteSuggestionSubmittingId}
        siteSuggestionTotals={statsController.siteSuggestionTotals}
        siteSuggestions={scraperController.siteSuggestions}
        siteTotals={statsController.siteTotals}
        startEditSite={scraperController.startEditSite}
        statusFilterOptions={STATUS_FILTER_OPTIONS}
        suggestionStatusFilterOptions={SITE_SUGGESTION_STATUS_FILTER_OPTIONS}
      />
    );
  }

  if (activeSection === 'activities') {
    return (
      <AdminActivitiesSection
        formatDate={formatDate}
        formatRole={formatRole}
        recentUsers={usersController.recentUsers}
      />
    );
  }

  return null;
}

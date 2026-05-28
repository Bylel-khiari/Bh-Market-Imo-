import React, { useCallback, useMemo, useState } from 'react';
import {
  FaBuilding,
  FaCog,
  FaEnvelope,
  FaGlobe,
  FaHome,
  FaListAlt,
  FaUsers,
} from 'react-icons/fa';
import { getApiBaseUrl } from '../../lib/auth';
import AdminReportsSection from '../../features/admin/components/AdminReportsSection';
import AdminActivitiesSection from './components/AdminActivitiesSection';
import AdminModals from './components/AdminModals';
import AdminOverviewSection from './components/AdminOverviewSection';
import { AdminErrorState, AdminLoadingState } from './components/AdminPageState';
import AdminPropertiesTable from './components/AdminPropertiesTable';
import AdminScraperPanel from './components/AdminScraperPanel';
import AdminSettingsSection from './components/AdminSettingsSection';
import AdminSidebar from './components/AdminSidebar';
import AdminTopbar from './components/AdminTopbar';
import AdminUsersTable from './components/AdminUsersTable';
import useAdminAuth from './hooks/useAdminAuth';
import useAdminProperties from './hooks/useAdminProperties';
import useAdminReports from './hooks/useAdminReports';
import useAdminScraper from './hooks/useAdminScraper';
import useAdminStats from './hooks/useAdminStats';
import useAdminUsers from './hooks/useAdminUsers';
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
} from './utils/adminFormatters';
import '../../styles/AdminDashboard.css';

const parameterMenuItems = [
  { key: 'users', label: 'Utilisateurs', icon: FaUsers },
  { key: 'properties', label: 'Biens', icon: FaBuilding },
  { key: 'sites', label: 'Sites scrapés', icon: FaGlobe },
];

const menuItems = [
  { key: 'dashboard', label: 'Tableau de bord', icon: FaHome },
  { key: 'mail', label: 'Réclamation', icon: FaEnvelope },
  { key: 'activities', label: 'Activités', icon: FaListAlt },
  { key: 'settings', label: 'Configuration', icon: FaCog },
];

const sectionTitles = {
  dashboard: 'Tableau de bord',
  users: 'Gestion des utilisateurs',
  properties: 'Gestion des biens immobiliers',
  mail: 'Réclamation',
  sites: 'Gestion des sites scrapés',
  activities: 'Activités récentes',
  settings: 'Configuration',
};

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isParameterMenuOpen, setIsParameterMenuOpen] = useState(true);
  const apiBaseUrl = getApiBaseUrl();
  const { goToHomePage, handleAuthFailure, handleLogout } = useAdminAuth();

  const {
    dashboardError,
    dashboardSummary,
    fetchDashboardSummary,
    propertyTotals,
    roleTotals,
    siteSuggestionTotals,
    siteTotals,
    syncUnreadReportCount,
    unreadReportCount,
  } = useAdminStats(handleAuthFailure);

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
    () => parameterMenuItems.some((item) => item.key === activeSection),
    [activeSection],
  );
  const pageError = usersController.error || dashboardError;

  if (usersController.loading) {
    return <AdminLoadingState />;
  }

  if (pageError) {
    return (
      <AdminErrorState
        error={pageError}
        refreshDashboardData={refreshDashboardData}
      />
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-shell">
        <AdminSidebar
          activeSection={activeSection}
          isParameterMenuOpen={isParameterMenuOpen}
          isParameterSectionActive={isParameterSectionActive}
          menuItems={menuItems}
          parameterMenuItems={parameterMenuItems}
          setActiveSection={setActiveSection}
          setIsParameterMenuOpen={setIsParameterMenuOpen}
        />

        <main className="admin-main">
          <AdminTopbar
            disabled={
              usersController.submitting ||
              scraperController.siteSubmitting ||
              propertiesController.propertySubmitting ||
              scraperController.siteDiscoverySubmitting
            }
            goToHomePage={goToHomePage}
            handleLogout={handleLogout}
            refreshDashboardData={refreshDashboardData}
            sectionTitle={sectionTitles[activeSection]}
            setActiveSection={setActiveSection}
            unreadReportCount={unreadReportCount}
          />

          {activeSection === 'dashboard' && (
            <AdminOverviewSection
              dashboardSummary={dashboardSummary}
              propertyTotals={propertyTotals}
              roleTotals={roleTotals}
              siteTotals={siteTotals}
            />
          )}

          {activeSection === 'users' && (
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
          )}

          {activeSection === 'properties' && (
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
          )}

          {activeSection === 'mail' && (
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
          )}

          {activeSection === 'sites' && (
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
              siteSuggestionTotals={siteSuggestionTotals}
              siteSuggestions={scraperController.siteSuggestions}
              siteTotals={siteTotals}
              startEditSite={scraperController.startEditSite}
              statusFilterOptions={STATUS_FILTER_OPTIONS}
              suggestionStatusFilterOptions={SITE_SUGGESTION_STATUS_FILTER_OPTIONS}
            />
          )}

          {activeSection === 'activities' && (
            <AdminActivitiesSection
              formatDate={formatDate}
              formatRole={formatRole}
              recentUsers={usersController.recentUsers}
            />
          )}

          {activeSection === 'settings' && (
            <AdminSettingsSection
              apiBaseUrl={apiBaseUrl}
              dashboardSummary={dashboardSummary}
              formMode={usersController.formMode}
              propertyFormMode={propertiesController.propertyFormMode}
              propertyTotals={propertyTotals}
              siteFormMode={scraperController.siteFormMode}
              siteTotals={siteTotals}
            />
          )}
        </main>
      </div>

      <AdminModals
        activeSection={activeSection}
        closeDeleteConfirm={usersController.closeDeleteConfirm}
        closeDeletePropertyConfirm={propertiesController.closeDeletePropertyConfirm}
        closeDeleteSiteConfirm={scraperController.closeDeleteSiteConfirm}
        deleteCandidate={usersController.deleteCandidate}
        editingPropertyId={propertiesController.editingPropertyId}
        editingSiteId={scraperController.editingSiteId}
        editingUserId={usersController.editingUserId}
        formData={usersController.formData}
        formMessage={usersController.formMessage}
        formMode={usersController.formMode}
        handleDeleteConfirmed={usersController.handleDeleteConfirmed}
        handleDeletePropertyConfirmed={propertiesController.handleDeletePropertyConfirmed}
        handleDeleteSiteConfirmed={scraperController.handleDeleteSiteConfirmed}
        handleFormChange={usersController.handleFormChange}
        handleGeneratePassword={usersController.handleGeneratePassword}
        handlePropertyFormChange={propertiesController.handlePropertyFormChange}
        handlePropertySubmit={propertiesController.handlePropertySubmit}
        handleSiteFormChange={scraperController.handleSiteFormChange}
        handleSiteSubmit={scraperController.handleSiteSubmit}
        handleSubmit={usersController.handleSubmit}
        isEditPanelOpen={usersController.isEditPanelOpen}
        isPropertyPanelOpen={propertiesController.isPropertyPanelOpen}
        isSitePanelOpen={scraperController.isSitePanelOpen}
        openCreatePanel={usersController.openCreatePanel}
        openCreatePropertyPanel={propertiesController.openCreatePropertyPanel}
        openCreateSitePanel={scraperController.openCreateSitePanel}
        propertyDeleteCandidate={propertiesController.propertyDeleteCandidate}
        propertyFormData={propertiesController.propertyFormData}
        propertyFormMessage={propertiesController.propertyFormMessage}
        propertyFormMode={propertiesController.propertyFormMode}
        propertySubmitting={propertiesController.propertySubmitting}
        resetForm={usersController.resetForm}
        resetPropertyForm={propertiesController.resetPropertyForm}
        resetSiteForm={scraperController.resetSiteForm}
        siteDeleteCandidate={scraperController.siteDeleteCandidate}
        siteFormData={scraperController.siteFormData}
        siteFormMessage={scraperController.siteFormMessage}
        siteFormMode={scraperController.siteFormMode}
        siteSubmitting={scraperController.siteSubmitting}
        submitting={usersController.submitting}
      />
    </div>
  );
}

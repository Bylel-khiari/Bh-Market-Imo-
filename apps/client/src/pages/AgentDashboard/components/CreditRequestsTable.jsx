import React from 'react';
import CreditApplicationQueue from './CreditApplicationQueue';
import CreditApplicationReviewPanel from './CreditApplicationReviewPanel';

export default function CreditRequestsTable({
  activeApplicationPanel,
  applications,
  draft,
  error,
  formMessage,
  handleDraftChange,
  handleFilterChange,
  handleOpenApplicationDocument,
  handleReviewSubmit,
  handleScoringSubmit,
  handleSearchSubmit,
  openingDocumentKey,
  search,
  selectedApplication,
  selectedApplicationDocuments,
  selectedApplicationId,
  setActiveApplicationPanel,
  setSearch,
  setSelectedApplicationId,
  statusFilter,
  submitting,
}) {
  return (
    <div className="admin-content-grid agent-dossier-workbench">
      <div className="admin-analytics-column">
        <CreditApplicationQueue
          applications={applications}
          error={error}
          formMessage={formMessage}
          handleFilterChange={handleFilterChange}
          handleSearchSubmit={handleSearchSubmit}
          search={search}
          selectedApplicationId={selectedApplicationId}
          setSearch={setSearch}
          setSelectedApplicationId={setSelectedApplicationId}
          statusFilter={statusFilter}
        />
      </div>

      <CreditApplicationReviewPanel
        activeApplicationPanel={activeApplicationPanel}
        draft={draft}
        handleDraftChange={handleDraftChange}
        handleOpenApplicationDocument={handleOpenApplicationDocument}
        handleReviewSubmit={handleReviewSubmit}
        handleScoringSubmit={handleScoringSubmit}
        openingDocumentKey={openingDocumentKey}
        selectedApplication={selectedApplication}
        selectedApplicationDocuments={selectedApplicationDocuments}
        setActiveApplicationPanel={setActiveApplicationPanel}
        submitting={submitting}
      />
    </div>
  );
}

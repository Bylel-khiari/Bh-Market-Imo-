import React from 'react';
import {
  FaFileSignature,
  FaFolderOpen,
  FaIdCard,
  FaMoneyCheckAlt,
  FaSyncAlt,
} from 'react-icons/fa';
import {
  formatComplianceScore,
  formatDate,
  formatStatus,
  getComplianceLabelForApplication,
  hasComplianceScore,
  normalizeStatusClass,
} from '../utils/agentFormatters';
import ClientSummary from './ClientSummary';
import DecisionActions from './DecisionActions';
import DecisionForm from './DecisionForm';
import DocumentList from './DocumentList';
import ScoringSummary from './ScoringSummary';

export default function CreditApplicationReviewPanel({
  activeApplicationPanel,
  draft,
  handleDraftChange,
  handleOpenApplicationDocument,
  handleReviewSubmit,
  handleScoringSubmit,
  openingDocumentKey,
  selectedApplication,
  selectedApplicationDocuments,
  setActiveApplicationPanel,
  submitting,
}) {
  return (
    <aside className="admin-crud-column">
      <section className="admin-card agent-review-card">
        {selectedApplication ? (
          <>
            <ReviewHeader selectedApplication={selectedApplication} />

            <div className={`agent-treatment-panel ${hasComplianceScore(selectedApplication) ? 'has-score' : 'is-pending'}`}>
              <div className="agent-treatment-score">
                <strong>{formatComplianceScore(selectedApplication)}</strong>
                <span>
                  {hasComplianceScore(selectedApplication)
                    ? 'Score calculÃƒÂ© par lÃ¢â‚¬â„¢agent de scoring'
                    : 'Aucun score calculÃƒÂ© pour ce dossier'}
                </span>
              </div>
              <button
                type="button"
                className="admin-refresh agent-treatment-button"
                onClick={handleScoringSubmit}
                disabled={submitting}
              >
                <FaSyncAlt className={submitting ? 'spin' : undefined} />
                <span>{hasComplianceScore(selectedApplication) ? 'Recalculer le score' : 'Calculer le score'}</span>
              </button>
            </div>

            <div className="agent-detail-tabs" role="tablist" aria-label="Sections du dossier">
              <TabButton
                activeApplicationPanel={activeApplicationPanel}
                icon={<FaIdCard />}
                label="Client"
                panel="summary"
                setActiveApplicationPanel={setActiveApplicationPanel}
              />
              <TabButton
                activeApplicationPanel={activeApplicationPanel}
                icon={<FaMoneyCheckAlt />}
                label="Scoring"
                panel="scoring"
                setActiveApplicationPanel={setActiveApplicationPanel}
              />
              <TabButton
                activeApplicationPanel={activeApplicationPanel}
                icon={<FaFolderOpen />}
                label="Pieces"
                panel="documents"
                setActiveApplicationPanel={setActiveApplicationPanel}
              />
              <TabButton
                activeApplicationPanel={activeApplicationPanel}
                icon={<FaFileSignature />}
                label="DÃƒÂ©cision"
                panel="decision"
                setActiveApplicationPanel={setActiveApplicationPanel}
              />
            </div>

            <div className="agent-detail-panel">
              {activeApplicationPanel === 'summary' && (
                <>
                  <div className="agent-panel-head">
                    <h3>Informations client</h3>
                    <p>CoordonnÃƒÂ©es, identitÃƒÂ© et ÃƒÂ©lÃƒÂ©ments financiers principaux.</p>
                  </div>
                  <ClientSummary application={selectedApplication} />
                </>
              )}

              {activeApplicationPanel === 'scoring' && (
                <>
                  <div className="agent-panel-head">
                    <h3>Variables de scoring</h3>
                    <p>DonnÃƒÂ©es utilisÃƒÂ©es pour calculer le score bancaire du dossier.</p>
                  </div>
                  <ScoringSummary application={selectedApplication} />

                  <button
                    type="button"
                    className="admin-secondary agent-scoring-action agent-panel-action"
                    onClick={handleScoringSubmit}
                    disabled={submitting}
                  >
                    <FaSyncAlt className={submitting ? 'spin' : undefined} />
                    <span>{hasComplianceScore(selectedApplication) ? 'Recalculer le scoring' : 'Calculer le scoring'}</span>
                  </button>
                </>
              )}

              {activeApplicationPanel === 'documents' && (
                <div className="agent-document-block">
                  <div className="agent-panel-head">
                    <h3>PiÃƒÂ¨ces du dossier</h3>
                    <p>Documents dÃƒÂ©clarÃƒÂ©s par le client pour lÃ¢â‚¬â„¢ÃƒÂ©tude du crÃƒÂ©dit.</p>
                  </div>
                  <DocumentList
                    documents={selectedApplicationDocuments}
                    openingDocumentKey={openingDocumentKey}
                    selectedApplication={selectedApplication}
                    onOpenApplicationDocument={handleOpenApplicationDocument}
                  />
                </div>
              )}

              {activeApplicationPanel === 'decision' && (
                <>
                  <div className="agent-panel-head">
                    <h3>DÃƒÂ©cision agent</h3>
                    <p>Mise ÃƒÂ  jour du statut, note interne et dÃƒÂ©cision finale.</p>
                  </div>
                  <DecisionForm draft={draft} submitting={submitting} onDraftChange={handleDraftChange} />
                  <DecisionActions
                    draft={draft}
                    submitting={submitting}
                    onReviewSubmit={handleReviewSubmit}
                  />
                </>
              )}
            </div>

            <ReviewAccordion
              draft={draft}
              handleDraftChange={handleDraftChange}
              handleOpenApplicationDocument={handleOpenApplicationDocument}
              handleReviewSubmit={handleReviewSubmit}
              handleScoringSubmit={handleScoringSubmit}
              openingDocumentKey={openingDocumentKey}
              selectedApplication={selectedApplication}
              selectedApplicationDocuments={selectedApplicationDocuments}
              submitting={submitting}
            />
          </>
        ) : (
          <div className="admin-state admin-state--inline">
            <FaFileSignature />
            <p>Saisissez un dossier dans la file pour lancer lÃ¢â‚¬â„¢analyse.</p>
          </div>
        )}
      </section>
    </aside>
  );
}

function ReviewHeader({ selectedApplication }) {
  return (
    <div className="agent-review-head">
      <div>
        <h2>{selectedApplication.property_title || `Dossier #${selectedApplication.id}`}</h2>
        <p className="admin-section-help">
          CrÃƒÂ©ÃƒÂ© le {formatDate(selectedApplication.created_at)} par {selectedApplication.full_name}
        </p>
      </div>
      <div className="agent-review-statuses">
        <span className={`admin-report-status-pill status-${normalizeStatusClass(selectedApplication.status)}`}>
          {formatStatus(selectedApplication.status)}
        </span>
        <span className={`agent-score-pill level-${selectedApplication.compliance_level}`}>
          {getComplianceLabelForApplication(selectedApplication)}
        </span>
      </div>
    </div>
  );
}

function TabButton({ activeApplicationPanel, icon, label, panel, setActiveApplicationPanel }) {
  return (
    <button
      type="button"
      className={activeApplicationPanel === panel ? 'is-active' : ''}
      onClick={() => setActiveApplicationPanel(panel)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ReviewAccordion({
  draft,
  handleDraftChange,
  handleOpenApplicationDocument,
  handleReviewSubmit,
  handleScoringSubmit,
  openingDocumentKey,
  selectedApplication,
  selectedApplicationDocuments,
  submitting,
}) {
  return (
    <div className="agent-detail-accordion">
      <details className="agent-detail-section" open>
        <summary>
          <FaIdCard />
          <span>RÃƒÂ©sumÃƒÂ© client</span>
        </summary>
        <ClientSummary application={selectedApplication} accentedLabels />
      </details>

      <details className="agent-detail-section">
        <summary>
          <FaMoneyCheckAlt />
          <span>Scoring</span>
        </summary>
        <ScoringSummary application={selectedApplication} />

        <button
          type="button"
          className="admin-secondary agent-scoring-action agent-panel-action"
          onClick={handleScoringSubmit}
          disabled={submitting}
        >
          <FaSyncAlt className={submitting ? 'spin' : undefined} />
          <span>{hasComplianceScore(selectedApplication) ? 'Recalculer le scoring' : 'Calculer le scoring'}</span>
        </button>
      </details>

      <details className="agent-detail-section">
        <summary>
          <FaFolderOpen />
          <span>Pieces</span>
        </summary>

        <div className="agent-document-block">
          <h3>Documents dÃƒÂ©clarÃƒÂ©s</h3>
          <DocumentList
            documents={selectedApplicationDocuments}
            openingDocumentKey={openingDocumentKey}
            selectedApplication={selectedApplication}
            onOpenApplicationDocument={handleOpenApplicationDocument}
          />
        </div>
      </details>

      <details className="agent-detail-section">
        <summary>
          <FaFileSignature />
          <span>DÃƒÂ©cision</span>
        </summary>
        <DecisionForm draft={draft} submitting={submitting} onDraftChange={handleDraftChange} />
        <DecisionActions
          draft={draft}
          submitting={submitting}
          onReviewSubmit={handleReviewSubmit}
        />
      </details>
    </div>
  );
}

import React from 'react';
import {
  FaBan,
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaFileSignature,
  FaFolderOpen,
  FaIdCard,
  FaMapMarkerAlt,
  FaMoneyCheckAlt,
  FaPhone,
  FaSearch,
  FaSyncAlt,
  FaUniversity,
} from 'react-icons/fa';
import {
  STATUS_OPTIONS,
  formatComplianceScore,
  formatCurrency,
  formatDate,
  formatPercent,
  formatQueueStatusLabel,
  formatStatus,
  getComplianceLabelForApplication,
  hasComplianceScore,
  normalizeStatusClass,
} from '../utils/agentFormatters';

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
        <section className="admin-card agent-queue-panel">
          <div className="agent-section-head">
            <div>
              <h2>File de dossiers</h2>
              <p className="admin-section-help">
                SÃ©lection rapide du dossier Ã  traiter.
              </p>
            </div>
            <span className="admin-users-count">{applications.length}</span>
          </div>

          <form className="admin-toolbar-row agent-queue-search-form" onSubmit={handleSearchSubmit}>
            <div className="agent-search-group">
              <FaSearch />
              <input
                className="admin-search-input"
                type="search"
                placeholder="Dossier, client, e-mail, CIN..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="admin-secondary agent-queue-search-button"
              onClick={handleSearchSubmit}
              aria-label="Rechercher"
              title="Rechercher"
            >
              <FaSearch />
            </button>
          </form>

          <div className="admin-filter-chips" aria-label="Filtrer les dossiers par statut">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`admin-filter-chip ${statusFilter === option.value ? 'is-active' : ''}`}
                onClick={() => handleFilterChange(option.value)}
              >
                {formatQueueStatusLabel(option)}
              </button>
            ))}
          </div>

          {formMessage && <p className="admin-form-message">{formMessage}</p>}
          {error && <p className="admin-form-message admin-form-message--error">{error}</p>}

          {applications.length ? (
            <div className="agent-case-queue">
              {applications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  className={`agent-case-card ${
                    String(selectedApplicationId) === String(application.id) ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedApplicationId(application.id)}
                >
                  <div className="agent-case-head">
                    <div>
                      <h3>{application.property_title || `Dossier #${application.id}`}</h3>
                      <p>{application.full_name} - {application.email}</p>
                    </div>
                    <span className={`admin-report-status-pill status-${normalizeStatusClass(application.status)}`}>
                      {formatStatus(application.status)}
                    </span>
                  </div>

                  <div className="agent-case-metrics">
                    <span>
                      <strong>Montant</strong>
                      <small>{formatCurrency(application.requested_amount)}</small>
                    </span>
                    <span>
                      <strong>Dette</strong>
                      <small>{formatPercent(application.debt_ratio)}</small>
                    </span>
                    <span>
                      <strong>Score</strong>
                      <small>{formatComplianceScore(application)}</small>
                    </span>
                    <span>
                      <strong>DÃ©pÃ´t</strong>
                      <small>{formatDate(application.created_at)}</small>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="admin-state admin-state--inline">
              <FaFolderOpen />
              <p>Aucun dossier ne correspond aux filtres courants.</p>
            </div>
          )}
        </section>
      </div>

      <aside className="admin-crud-column">
        <section className="admin-card agent-review-card">
          {selectedApplication ? (
            <>
              <div className="agent-review-head">
                <div>
                  <h2>{selectedApplication.property_title || `Dossier #${selectedApplication.id}`}</h2>
                  <p className="admin-section-help">
                    CrÃ©Ã© le {formatDate(selectedApplication.created_at)} par {selectedApplication.full_name}
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

              <div className={`agent-treatment-panel ${hasComplianceScore(selectedApplication) ? 'has-score' : 'is-pending'}`}>
                <div className="agent-treatment-score">
                  <strong>{formatComplianceScore(selectedApplication)}</strong>
                  <span>
                    {hasComplianceScore(selectedApplication)
                      ? 'Score calculÃ© par lâ€™agent de scoring'
                      : 'Aucun score calculÃ© pour ce dossier'}
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
                <button
                  type="button"
                  className={activeApplicationPanel === 'summary' ? 'is-active' : ''}
                  onClick={() => setActiveApplicationPanel('summary')}
                >
                  <FaIdCard />
                  <span>Client</span>
                </button>
                <button
                  type="button"
                  className={activeApplicationPanel === 'scoring' ? 'is-active' : ''}
                  onClick={() => setActiveApplicationPanel('scoring')}
                >
                  <FaMoneyCheckAlt />
                  <span>Scoring</span>
                </button>
                <button
                  type="button"
                  className={activeApplicationPanel === 'documents' ? 'is-active' : ''}
                  onClick={() => setActiveApplicationPanel('documents')}
                >
                  <FaFolderOpen />
                  <span>Pieces</span>
                </button>
                <button
                  type="button"
                  className={activeApplicationPanel === 'decision' ? 'is-active' : ''}
                  onClick={() => setActiveApplicationPanel('decision')}
                >
                  <FaFileSignature />
                  <span>DÃ©cision</span>
                </button>
              </div>

              <div className="agent-detail-panel">
                {activeApplicationPanel === 'summary' && (
                  <>
                    <div className="agent-panel-head">
                      <h3>Informations client</h3>
                      <p>CoordonnÃ©es, identitÃ© et Ã©lÃ©ments financiers principaux.</p>
                    </div>
                    <ClientSummary application={selectedApplication} />
                  </>
                )}

                {activeApplicationPanel === 'scoring' && (
                  <>
                    <div className="agent-panel-head">
                      <h3>Variables de scoring</h3>
                      <p>DonnÃ©es utilisÃ©es pour calculer le score bancaire du dossier.</p>
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
                      <h3>PiÃ¨ces du dossier</h3>
                      <p>Documents dÃ©clarÃ©s par le client pour lâ€™Ã©tude du crÃ©dit.</p>
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
                      <h3>DÃ©cision agent</h3>
                      <p>Mise Ã  jour du statut, note interne et dÃ©cision finale.</p>
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

              <div className="agent-detail-accordion">
                <details className="agent-detail-section" open>
                  <summary>
                    <FaIdCard />
                    <span>RÃ©sumÃ© client</span>
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
                    <h3>Documents dÃ©clarÃ©s</h3>
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
                    <span>DÃ©cision</span>
                  </summary>
                  <DecisionForm draft={draft} submitting={submitting} onDraftChange={handleDraftChange} />
                  <DecisionActions
                    draft={draft}
                    submitting={submitting}
                    onReviewSubmit={handleReviewSubmit}
                  />
                </details>
              </div>
            </>
          ) : (
            <div className="admin-state admin-state--inline">
              <FaFileSignature />
              <p>Saisissez un dossier dans la file pour lancer lâ€™analyse.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function ClientSummary({ accentedLabels = false, application }) {
  return (
    <>
      <div className="agent-info-grid">
        <span><FaEnvelope /> {application.email}</span>
        <span><FaPhone /> {application.phone}</span>
        <span><FaIdCard /> {application.cin}</span>
        <span><FaUniversity /> {application.rib}</span>
        <span><FaMapMarkerAlt /> {application.property_location || 'Localisation non renseignÃ©e'}</span>
        <span><FaMoneyCheckAlt /> {formatCurrency(application.requested_amount)}</span>
      </div>

      <div className="agent-finance-grid">
        <div className="agent-finance-card">
          <strong>Apport</strong>
          <span>{formatCurrency(application.personal_contribution_value)}</span>
        </div>
        <div className="agent-finance-card">
          <strong>Revenus</strong>
          <span>{formatCurrency(application.gross_income_value)}</span>
        </div>
        <div className="agent-finance-card">
          <strong>{accentedLabels ? 'DurÃ©e' : 'Duree'}</strong>
          <span>
            {application.duration_months ? `${application.duration_months} mois` : 'Non renseignÃ©e'}
          </span>
        </div>
        <div className="agent-finance-card">
          <strong>{accentedLabels ? 'MensualitÃ©' : 'Mensualite'}</strong>
          <span>{formatCurrency(application.estimated_monthly_payment)}</span>
        </div>
      </div>
    </>
  );
}

function ScoringSummary({ application }) {
  return (
    <div className="agent-scoring-grid">
      <div className="agent-finance-card">
        <strong>Revenu annuel scoring</strong>
        <span>{formatCurrency(application.revenu_annuel)}</span>
      </div>
      <div className="agent-finance-card">
        <strong>Charges annuelles scoring</strong>
        <span>{formatCurrency(application.charges_impayees)}</span>
      </div>
      <div className="agent-finance-card">
        <strong>Situation familiale</strong>
        <span>{application.situation_familiale || 'Ã€ vÃ©rifier'}</span>
      </div>
      <div className="agent-finance-card">
        <strong>Situation contractuelle</strong>
        <span>{application.situation_contractuelle || 'Ã€ vÃ©rifier'}</span>
      </div>
    </div>
  );
}

function DocumentList({
  documents,
  openingDocumentKey,
  onOpenApplicationDocument,
  selectedApplication,
}) {
  if (!documents.length) {
    return <p className="admin-section-help">Aucun document nâ€™a Ã©tÃ© dÃ©clarÃ© dans le portail.</p>;
  }

  return (
    <div className="agent-document-list">
      {documents.map((document) => {
        const documentKey = `${selectedApplication.id}-${document.index}`;
        const isOpening = openingDocumentKey === documentKey;

        return document.hasFile ? (
          <button
            key={document.key}
            type="button"
            className="agent-document-pill agent-document-pill--action"
            onClick={() => onOpenApplicationDocument(document)}
            disabled={isOpening}
            title="Consulter le document"
          >
            <FaDownload />
            <span>{isOpening ? 'Ouverture...' : document.name}</span>
          </button>
        ) : (
          <span
            key={document.key}
            className="agent-document-pill agent-document-pill--unavailable"
            title="Fichier non disponible pour les anciens dossiers."
          >
            {document.name}
          </span>
        );
      })}
    </div>
  );
}

function DecisionForm({ draft, onDraftChange, submitting }) {
  return (
    <div className="agent-review-form">
      <label className="admin-field-block">
        <span className="admin-field-label">Ã‰tat du dossier</span>
        <select name="status" value={draft.status} onChange={onDraftChange} disabled={submitting}>
          {STATUS_OPTIONS.slice(1).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field-block">
        <span className="admin-field-label">Score de conformitÃ©</span>
        <input
          name="compliance_score"
          type="number"
          min="0"
          max="100"
          value={draft.compliance_score}
          onChange={onDraftChange}
          disabled={submitting}
          placeholder="Ex: 78"
        />
      </label>

      <label className="admin-field-block">
        <span className="admin-field-label">SynthÃ¨se conformitÃ©</span>
        <textarea
          name="compliance_summary"
          rows={4}
          value={draft.compliance_summary}
          onChange={onDraftChange}
          disabled={submitting}
          placeholder="RÃ©sumÃ© des contrÃ´les, anomalies et conformitÃ©s observÃ©es."
        />
      </label>

      <label className="admin-field-block">
        <span className="admin-field-label">Note agent</span>
        <textarea
          name="agent_note"
          rows={4}
          value={draft.agent_note}
          onChange={onDraftChange}
          disabled={submitting}
          placeholder="Ã‰lÃ©ments Ã  transmettre au client ou au back-office."
        />
      </label>
    </div>
  );
}

function DecisionActions({ draft, onReviewSubmit, submitting }) {
  return (
    <>
      <div className="agent-quick-actions">
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('EN_VERIFICATION')}
          disabled={submitting}
        >
          VÃ©rifier les documents
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('DOCUMENTS_MANQUANTS')}
          disabled={submitting}
        >
          Demander les piÃ¨ces
        </button>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onReviewSubmit('EN_ETUDE')}
          disabled={submitting}
        >
          Passer en Ã©tude
        </button>
        <button
          type="button"
          className="admin-refresh"
          onClick={() => onReviewSubmit('ACCEPTE')}
          disabled={submitting}
        >
          <FaCheckCircle />
          <span>Accepter</span>
        </button>
        <button
          type="button"
          className="admin-danger"
          onClick={() => onReviewSubmit('REFUSE')}
          disabled={submitting}
        >
          <FaBan />
          <span>Refuser</span>
        </button>
      </div>

      <button
        type="button"
        className="admin-refresh agent-save-btn"
        onClick={() => onReviewSubmit(draft.status)}
        disabled={submitting}
      >
        {submitting ? 'Traitement...' : 'Enregistrer les modifications'}
      </button>
    </>
  );
}

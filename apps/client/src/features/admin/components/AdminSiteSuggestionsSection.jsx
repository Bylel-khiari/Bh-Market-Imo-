import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';

export default function AdminSiteSuggestionsSection({
  suggestionStatusFilterOptions,
  siteSuggestions,
  siteSuggestionTotals,
  siteSuggestionStatusFilter,
  setSiteSuggestionStatusFilter,
  siteSuggestionLoading,
  siteSuggestionError,
  siteSuggestionMessage,
  siteSuggestionSubmittingId,
  siteDiscoverySubmitting,
  handleStartSiteDiscovery,
  handleAcceptSiteSuggestion,
  handleUpdateSiteSuggestionStatus,
  formatSiteSuggestionStatus,
  formatEvidenceList,
  formatDate,
}) {
  return (
    <div className="admin-card admin-site-suggestions-card">
      <div className="admin-users-header">
        <h2>Suggestions de nouveaux sites</h2>
        <div className="admin-users-header-actions">
          <span className="admin-users-count">{siteSuggestionTotals.pending}</span>
          <button
            type="button"
            className="admin-refresh"
            onClick={handleStartSiteDiscovery}
            disabled={siteDiscoverySubmitting || Boolean(siteSuggestionSubmittingId)}
          >
            <FaSyncAlt className={siteDiscoverySubmitting ? 'spin' : ''} />
            {siteDiscoverySubmitting ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      <p className="admin-section-help">
        L agent de decouverte propose uniquement des domaines candidats. Un site accepte reste
        inactif avec le statut pending_spider jusqu a l ajout d un spider Scrapy.
      </p>

      <div className="admin-filter-chips admin-suggestion-filters" aria-label="Filtrer les suggestions">
        {suggestionStatusFilterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`admin-filter-chip ${siteSuggestionStatusFilter === option.value ? 'is-active' : ''}`}
            onClick={() => setSiteSuggestionStatusFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {siteSuggestionMessage && <p className="admin-form-message">{siteSuggestionMessage}</p>}
      {siteSuggestionError && (
        <p className="admin-form-message admin-form-message--error">{siteSuggestionError}</p>
      )}

      {siteSuggestionLoading ? (
        <div className="admin-state admin-state--inline">
          <FaSyncAlt className="spin" />
          <p>Chargement des suggestions...</p>
        </div>
      ) : siteSuggestions.length === 0 ? (
        <p className="empty">Aucune suggestion dans ce filtre.</p>
      ) : (
        <div className="admin-sites-grid admin-suggestions-grid">
          {siteSuggestions.map((suggestion) => {
            const isSubmitting = siteSuggestionSubmittingId === suggestion.id;
            const canReview = suggestion.status === 'pending' || suggestion.status === 'ignored';
            return (
              <article key={suggestion.id} className={`admin-site-card admin-suggestion-card status-${suggestion.status}`}>
                <div className="admin-site-card-head">
                  <div>
                    <h3>{suggestion.name || suggestion.domain}</h3>
                    <p className="admin-site-spider">{suggestion.domain}</p>
                  </div>
                  <span className={`admin-site-status status-${suggestion.status}`}>
                    {formatSiteSuggestionStatus(suggestion.status)}
                  </span>
                </div>

                <div className="admin-site-meta">
                  <span>
                    <strong>Score:</strong> {Math.round(Number(suggestion.confidence_score || 0))}%
                  </span>
                  <span>
                    <strong>Base:</strong> {suggestion.base_url || '-'}
                  </span>
                  <span>
                    <strong>Detecte:</strong> {formatDate(suggestion.discovered_at)}
                  </span>
                  <span>
                    <strong>Mots cles:</strong>{' '}
                    {formatEvidenceList(suggestion.evidence, 'matched_keywords')}
                  </span>
                  <span>
                    <strong>Signaux Tunisie:</strong>{' '}
                    {formatEvidenceList(suggestion.evidence, 'matched_tunisia_signals')}
                  </span>
                </div>

                <p className="admin-site-description">
                  {suggestion.evidence?.search_snippet || 'Suggestion detectee automatiquement.'}
                </p>

                {suggestion.sample_url && (
                  <div className="admin-property-link-row">
                    <span className="admin-property-link-label">Exemple</span>
                    <a className="admin-property-link" href={suggestion.sample_url} target="_blank" rel="noreferrer">
                      {suggestion.sample_url}
                    </a>
                  </div>
                )}

                <div className="admin-table-actions admin-site-actions">
                  <button
                    type="button"
                    className="admin-refresh"
                    onClick={() => handleAcceptSiteSuggestion(suggestion)}
                    disabled={!canReview || isSubmitting || siteDiscoverySubmitting}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="admin-secondary"
                    onClick={() => handleUpdateSiteSuggestionStatus(suggestion, 'ignored')}
                    disabled={!canReview || isSubmitting || siteDiscoverySubmitting}
                  >
                    Ignorer
                  </button>
                  <button
                    type="button"
                    className="admin-danger"
                    onClick={() => handleUpdateSiteSuggestionStatus(suggestion, 'rejected')}
                    disabled={!canReview || isSubmitting || siteDiscoverySubmitting}
                  >
                    Rejeter
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

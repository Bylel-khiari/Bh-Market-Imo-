import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import AdminFilterChips from '../shared/ui/AdminFilterChips';
import AdminFormMessage from '../shared/ui/AdminFormMessage';
import AdminInlineLoading from '../shared/ui/AdminInlineLoading';

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

      <AdminFilterChips
        ariaLabel="Filtrer les suggestions"
        className="admin-suggestion-filters"
        options={suggestionStatusFilterOptions}
        value={siteSuggestionStatusFilter}
        onChange={setSiteSuggestionStatusFilter}
      />

      <AdminFormMessage>{siteSuggestionMessage}</AdminFormMessage>
      <AdminFormMessage tone="error">{siteSuggestionError}</AdminFormMessage>

      {siteSuggestionLoading ? (
        <AdminInlineLoading message="Chargement des suggestions..." />
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
                    <strong>Score :</strong> {Math.round(Number(suggestion.confidence_score || 0))}%
                  </span>
                  <span>
                    <strong>Base :</strong> {suggestion.base_url || '-'}
                  </span>
                  <span>
                    <strong>Détecté :</strong> {formatDate(suggestion.discovered_at)}
                  </span>
                  <span>
                    <strong>Mots clés :</strong>{' '}
                    {formatEvidenceList(suggestion.evidence, 'matched_keywords')}
                  </span>
                  <span>
                    <strong>Signaux Tunisie:</strong>{' '}
                    {formatEvidenceList(suggestion.evidence, 'matched_tunisia_signals')}
                  </span>
                </div>

                <p className="admin-site-description">
                  {suggestion.evidence?.search_snippet || 'Suggestion détectée automatiquement.'}
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

import React from 'react';
import { FaFolderOpen, FaSearch } from 'react-icons/fa';
import {
  STATUS_OPTIONS,
  formatComplianceScore,
  formatCurrency,
  formatDate,
  formatPercent,
  formatQueueStatusLabel,
  formatStatus,
  normalizeStatusClass,
} from '../utils/agentFormatters';

export default function CreditApplicationQueue({
  applications,
  error,
  formMessage,
  handleFilterChange,
  handleSearchSubmit,
  search,
  selectedApplicationId,
  setSearch,
  setSelectedApplicationId,
  statusFilter,
}) {
  return (
    <section className="admin-card agent-queue-panel">
      <div className="agent-section-head">
        <div>
          <h2>File de dossiers</h2>
          <p className="admin-section-help">
            SÃƒÂ©lection rapide du dossier ÃƒÂ  traiter.
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
                  <strong>DÃƒÂ©pÃƒÂ´t</strong>
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
  );
}

import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';

export default function AdminReportsSection({
  reportStatusFilterOptions,
  adminReports,
  reportLoading,
  reportError,
  reportFormMessage,
  reportStatusFilter,
  setReportStatusFilter,
  reportSubmittingId,
  handleReportStatusUpdate,
  formatReportStatus,
  formatReportCategory,
  formatDate,
}) {
  return (
    <div className="admin-content-grid admin-content-single">
      <section className="admin-analytics-column">
        <div className="admin-card admin-reports-card">
          <div className="admin-users-header">
            <h2>Mail reclamations</h2>
            <div className="admin-users-header-actions">
              <span className="admin-users-count">{adminReports.length}</span>
            </div>
          </div>

          <p className="admin-section-help">
            Cette boite regroupe les reclamations envoyees par les clients depuis les biens.
            Traitez chaque message pour suivre l incident et garder un historique clair.
          </p>

          <div className="admin-users-toolbar admin-toolbar-row">
            <div className="admin-filter-chips" aria-label="Filtrer les reclamations par statut">
              {reportStatusFilterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`admin-filter-chip ${reportStatusFilter === option.value ? 'is-active' : ''}`}
                  onClick={() => setReportStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {reportFormMessage && <p className="admin-form-message">{reportFormMessage}</p>}
          {reportError && <p className="admin-form-message admin-form-message--error">{reportError}</p>}

          {reportLoading ? (
            <div className="admin-state admin-state--inline">
              <FaSyncAlt className="spin" />
              <p>Chargement des reclamations...</p>
            </div>
          ) : adminReports.length === 0 ? (
            <p className="empty">Aucune reclamation trouvee.</p>
          ) : (
            <div className="admin-reports-list">
              {adminReports.map((report) => {
                const canMoveToInReview = report.status === 'unread';
                const canMoveToResolved = report.status === 'unread' || report.status === 'in_review';
                const canMoveToRejected = report.status === 'unread' || report.status === 'in_review';
                const isSubmitting = String(reportSubmittingId) === String(report.id);

                return (
                  <article key={report.id} className={`admin-report-card status-${report.status}`}>
                    <div className="admin-report-card-head">
                      <div>
                        <h3>{report.property_title || `Bien #${report.property_id}`}</h3>
                        <p className="admin-report-meta">
                          Reclamation #{report.id} - Bien #{report.property_id}
                        </p>
                      </div>
                      <span className={`admin-report-status-pill status-${report.status}`}>
                        {formatReportStatus(report.status)}
                      </span>
                    </div>

                    <p className="admin-report-category">{formatReportCategory(report.category)}</p>
                    <p className="admin-report-message">{report.message}</p>

                    <div className="admin-report-footnote">
                      <span>
                        <strong>Client:</strong>{' '}
                        {report.reporter_name || report.reporter_email || `#${report.reporter_user_id}`}
                      </span>
                      <span>
                        <strong>Date:</strong> {formatDate(report.created_at)}
                      </span>
                    </div>

                    {report.property_url && (
                      <div className="admin-property-link-row">
                        <span className="admin-property-link-label">Source:</span>
                        <a
                          href={report.property_url}
                          className="admin-property-link"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ouvrir le bien
                        </a>
                      </div>
                    )}

                    {report.admin_note && (
                      <p className="admin-report-note">
                        <strong>Note admin:</strong> {report.admin_note}
                      </p>
                    )}

                    <div className="admin-table-actions admin-report-actions">
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() => handleReportStatusUpdate(report, 'in_review')}
                        disabled={!canMoveToInReview || isSubmitting}
                      >
                        En revue
                      </button>
                      <button
                        type="button"
                        className="admin-refresh"
                        onClick={() => handleReportStatusUpdate(report, 'resolved')}
                        disabled={!canMoveToResolved || isSubmitting}
                      >
                        Resolu
                      </button>
                      <button
                        type="button"
                        className="admin-danger"
                        onClick={() => handleReportStatusUpdate(report, 'rejected')}
                        disabled={!canMoveToRejected || isSubmitting}
                      >
                        Rejete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

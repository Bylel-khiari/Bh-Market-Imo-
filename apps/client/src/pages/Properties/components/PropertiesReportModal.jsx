import React from 'react';
import { REPORT_CATEGORY_OPTIONS } from '../utils/propertyFormatters';

export default function PropertiesReportModal({
  closeReportModal,
  reportCategory,
  reportError,
  reportMessage,
  reportModalProperty,
  reportSubmitting,
  setReportCategory,
  setReportMessage,
  submitReport,
}) {
  if (!reportModalProperty) {
    return null;
  }

  return (
    <div className="properties-modal-backdrop" role="dialog" aria-modal="true" onClick={closeReportModal}>
      <div className="properties-report-modal" onClick={(event) => event.stopPropagation()}>
        <div className="properties-report-head">
          <h3>Signaler un problÃƒÂ¨me</h3>
          <button
            type="button"
            className="properties-report-close"
            onClick={closeReportModal}
            disabled={reportSubmitting}
            aria-label="Fermer"
          >
            x
          </button>
        </div>

        <p className="properties-report-context">
          Bien concernÃƒÂ© : <strong>{reportModalProperty.title || `#${reportModalProperty.id}`}</strong>
        </p>

        <form className="properties-report-form" onSubmit={submitReport}>
          <label htmlFor="report-category">CatÃƒÂ©gorie du problÃƒÂ¨me</label>
          <select
            id="report-category"
            value={reportCategory}
            onChange={(event) => setReportCategory(event.target.value)}
            disabled={reportSubmitting}
          >
            {REPORT_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="report-message">DÃƒÂ©tails</label>
          <textarea
            id="report-message"
            rows={5}
            value={reportMessage}
            onChange={(event) => setReportMessage(event.target.value)}
            placeholder="Expliquez le probleme rencontre avec cette annonce."
            disabled={reportSubmitting}
          />

          {reportError && <p className="properties-report-error">{reportError}</p>}

          <div className="properties-report-actions">
            <button
              type="button"
              className="btn-light"
              onClick={closeReportModal}
              disabled={reportSubmitting}
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={reportSubmitting}>
              {reportSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

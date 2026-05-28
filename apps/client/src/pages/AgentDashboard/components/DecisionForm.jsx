import React from 'react';
import { STATUS_OPTIONS } from '../utils/agentFormatters';

export default function DecisionForm({ draft, onDraftChange, submitting }) {
  return (
    <div className="agent-review-form">
      <label className="admin-field-block">
        <span className="admin-field-label">État du dossier</span>
        <select name="status" value={draft.status} onChange={onDraftChange} disabled={submitting}>
          {STATUS_OPTIONS.slice(1).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field-block">
        <span className="admin-field-label">Score de conformité</span>
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
        <span className="admin-field-label">Synthèse conformité</span>
        <textarea
          name="compliance_summary"
          rows={4}
          value={draft.compliance_summary}
          onChange={onDraftChange}
          disabled={submitting}
          placeholder="Résumé des contrôles, anomalies et conformités observées."
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
          placeholder="Éléments à transmettre au client ou au back-office."
        />
      </label>
    </div>
  );
}

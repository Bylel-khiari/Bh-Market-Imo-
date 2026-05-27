import React from 'react';
import { STATUS_OPTIONS } from '../utils/agentFormatters';

export default function DecisionForm({ draft, onDraftChange, submitting }) {
  return (
    <div className="agent-review-form">
      <label className="admin-field-block">
        <span className="admin-field-label">Ãƒâ€°tat du dossier</span>
        <select name="status" value={draft.status} onChange={onDraftChange} disabled={submitting}>
          {STATUS_OPTIONS.slice(1).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field-block">
        <span className="admin-field-label">Score de conformitÃƒÂ©</span>
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
        <span className="admin-field-label">SynthÃƒÂ¨se conformitÃƒÂ©</span>
        <textarea
          name="compliance_summary"
          rows={4}
          value={draft.compliance_summary}
          onChange={onDraftChange}
          disabled={submitting}
          placeholder="RÃƒÂ©sumÃƒÂ© des contrÃƒÂ´les, anomalies et conformitÃƒÂ©s observÃƒÂ©es."
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
          placeholder="Ãƒâ€°lÃƒÂ©ments ÃƒÂ  transmettre au client ou au back-office."
        />
      </label>
    </div>
  );
}

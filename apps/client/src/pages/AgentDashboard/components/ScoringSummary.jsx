import React from 'react';
import { formatCurrency } from '../utils/agentFormatters';

export default function ScoringSummary({ application }) {
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
        <span>{application.situation_familiale || 'Ãƒâ‚¬ vÃƒÂ©rifier'}</span>
      </div>
      <div className="agent-finance-card">
        <strong>Situation contractuelle</strong>
        <span>{application.situation_contractuelle || 'Ãƒâ‚¬ vÃƒÂ©rifier'}</span>
      </div>
    </div>
  );
}

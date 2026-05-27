import React from 'react';
import {
  FaEnvelope,
  FaIdCard,
  FaMapMarkerAlt,
  FaMoneyCheckAlt,
  FaPhone,
  FaUniversity,
} from 'react-icons/fa';
import { formatCurrency } from '../utils/agentFormatters';

export default function ClientSummary({ accentedLabels = false, application }) {
  return (
    <>
      <div className="agent-info-grid">
        <span><FaEnvelope /> {application.email}</span>
        <span><FaPhone /> {application.phone}</span>
        <span><FaIdCard /> {application.cin}</span>
        <span><FaUniversity /> {application.rib}</span>
        <span><FaMapMarkerAlt /> {application.property_location || 'Localisation non renseignÃƒÂ©e'}</span>
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
          <strong>{accentedLabels ? 'DurÃƒÂ©e' : 'Duree'}</strong>
          <span>
            {application.duration_months ? `${application.duration_months} mois` : 'Non renseignÃƒÂ©e'}
          </span>
        </div>
        <div className="agent-finance-card">
          <strong>{accentedLabels ? 'MensualitÃƒÂ©' : 'Mensualite'}</strong>
          <span>{formatCurrency(application.estimated_monthly_payment)}</span>
        </div>
      </div>
    </>
  );
}

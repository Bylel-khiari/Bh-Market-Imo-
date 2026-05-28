import React from 'react';
import {
  FaCalculator,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaDownload,
  FaMapMarkerAlt,
  FaMoneyCheckAlt,
  FaSignInAlt,
} from 'react-icons/fa';
import ClientJourneySection from './ClientJourneySection';
import MarketplaceActivitySection from './MarketplaceActivitySection';
import { formatNumber } from '../utils/agentFormatters';

export default function AgentPlatformSection({
  clientActivityDistribution,
  clientActivitySummary,
  creditSubmitConversionRate,
  dashboardMonthOptions,
  handleExportPlatformReport,
  handleMonthChange,
  monthlyActivity,
  monthlyClientEvents,
  platformActivityTotal,
  platformSummary,
  selectedMonth,
  topCities,
  totalCreditApplications,
}) {
  return (
    <div className="admin-content-grid agent-platform-grid">
      <section className="admin-card agent-platform-toolbar">
        <div>
          <h2>Vue plateforme consolidée</h2>
          <p className="admin-section-help">
            KPI utiles à l’agent bancaire pour croiser dossiers de crédit, portefeuille de biens et réclamations d’assistance.
          </p>
        </div>
        <div className="agent-platform-actions">
          <label className="admin-field-block agent-period-field">
            <span className="admin-field-label">Mois observe</span>
            <select value={selectedMonth} onChange={handleMonthChange}>
              {dashboardMonthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="admin-secondary" onClick={handleExportPlatformReport}>
            <FaDownload />
            <span>Exporter</span>
          </button>
        </div>
      </section>

      <section className="admin-kpi-grid agent-platform-kpi-grid">
        <article className="admin-kpi-card">
          <div className="icon"><FaClipboardList /></div>
          <div>
            <h3>Réclamations</h3>
            <p>{formatNumber(platformSummary.total_reports)}</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaCheckCircle /></div>
          <div>
            <h3>Assistance traitée</h3>
            <p>{formatNumber(platformSummary.resolution_rate)}%</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaChartLine /></div>
          <div>
            <h3>Activite</h3>
            <p>{formatNumber(platformActivityTotal)}</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaCalculator /></div>
          <div>
            <h3>Calculs credit</h3>
            <p>{formatNumber(clientActivitySummary.simulation_calculations)}</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaMoneyCheckAlt /></div>
          <div>
            <h3>Intentions credit</h3>
            <p>{formatNumber(clientActivitySummary.credit_request_starts)}</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaClipboardList /></div>
          <div>
            <h3>Dossiers deposes</h3>
            <p>{formatNumber(totalCreditApplications)}</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaCheckCircle /></div>
          <div>
            <h3>Conversion depot</h3>
            <p>{formatNumber(creditSubmitConversionRate)}%</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaSignInAlt /></div>
          <div>
            <h3>Connexions client</h3>
            <p>{formatNumber(clientActivitySummary.client_logins)}</p>
          </div>
        </article>
        <article className="admin-kpi-card">
          <div className="icon"><FaMapMarkerAlt /></div>
          <div>
            <h3>Regions map</h3>
            <p>{formatNumber(clientActivitySummary.map_region_selects)}</p>
          </div>
        </article>
      </section>

      <ClientJourneySection
        clientActivityDistribution={clientActivityDistribution}
        monthlyActivity={monthlyActivity}
        monthlyClientEvents={monthlyClientEvents}
      />

      <MarketplaceActivitySection topCities={topCities} />
    </div>
  );
}

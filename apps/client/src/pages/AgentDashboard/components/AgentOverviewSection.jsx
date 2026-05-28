import React from 'react';
import AgentChartsSection from './AgentChartsSection';
import AgentStatsCards from './AgentStatsCards';
import {
  formatDate,
  formatStatus,
  normalizeStatusClass,
} from '../utils/agentFormatters';

export default function AgentOverviewSection({
  approvalRate,
  averageComplianceScore,
  onOpenApplication,
  onOpenQueue,
  overviewApplications,
  pendingCount,
  pieData,
  totalCreditApplications,
}) {
  return (
    <div className="admin-content-grid admin-content-single">
      <div className="admin-analytics-column">
        <AgentStatsCards
          approvalRate={approvalRate}
          averageComplianceScore={averageComplianceScore}
          pendingCount={pendingCount}
          totalCreditApplications={totalCreditApplications}
        />

        <AgentChartsSection pieData={pieData} />

        <section className="admin-card">
          <div className="agent-section-head">
            <div>
              <h2>Dossiers prioritaires</h2>
              <p className="admin-section-help">
                Reprises rapides sur les dossiers qui demandent une analyse ou un complément.
              </p>
            </div>
            <button type="button" className="admin-secondary" onClick={onOpenQueue}>
              Ouvrir la file
            </button>
          </div>

          {overviewApplications.length ? (
            <div className="agent-overview-list">
              {overviewApplications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  className="agent-overview-item"
                  onClick={() => onOpenApplication(application.id)}
                >
                  <div>
                    <strong>{application.property_title || `Dossier #${application.id}`}</strong>
                    <span>{application.full_name}</span>
                  </div>
                  <div className="agent-overview-meta">
                    <span className={`admin-report-status-pill status-${normalizeStatusClass(application.status)}`}>
                      {formatStatus(application.status)}
                    </span>
                    <small>{formatDate(application.created_at)}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty">Aucun dossier prioritaire à afficher.</p>
          )}
        </section>
      </div>
    </div>
  );
}

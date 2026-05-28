import React from 'react';
import { FaCheckCircle, FaClock, FaFileSignature, FaFolderOpen } from 'react-icons/fa';
import { formatNumber } from '../utils/agentFormatters';

export default function AgentStatsCards({
  approvalRate,
  averageComplianceScore,
  pendingCount,
  totalCreditApplications,
}) {
  return (
    <section className="admin-kpi-grid">
      <article className="admin-kpi-card">
        <div className="icon"><FaFolderOpen /></div>
        <div>
          <h3>Dossiers total</h3>
          <p>{formatNumber(totalCreditApplications)}</p>
        </div>
      </article>
      <article className="admin-kpi-card">
        <div className="icon"><FaClock /></div>
        <div>
          <h3>À traiter</h3>
          <p>{pendingCount}</p>
        </div>
      </article>
      <article className="admin-kpi-card">
        <div className="icon"><FaCheckCircle /></div>
        <div>
          <h3>Taux d accord</h3>
          <p>{approvalRate}%</p>
        </div>
      </article>
      <article className="admin-kpi-card">
        <div className="icon"><FaFileSignature /></div>
        <div>
          <h3>Score moyen</h3>
          <p>{formatNumber(averageComplianceScore)}</p>
        </div>
      </article>
    </section>
  );
}

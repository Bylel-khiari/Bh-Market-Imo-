import React from 'react';
import { FaBuilding, FaEnvelope, FaGlobe, FaListAlt, FaUser, FaUserTie, FaUsers } from 'react-icons/fa';

export default function AdminStatsCards({
  dashboardSummary,
  propertyTotals,
  roleTotals,
  siteTotals,
}) {
  return (
    <div className="admin-kpi-grid">
      <div className="admin-kpi-card">
        <div className="icon">
          <FaUsers />
        </div>
        <div>
          <h3>Utilisateurs</h3>
          <p>{dashboardSummary.users.total}</p>
        </div>
      </div>
      <div className="admin-kpi-card">
        <div className="icon">
          <FaUser />
        </div>
        <div>
          <h3>Clients</h3>
          <p>{roleTotals.client || 0}</p>
        </div>
      </div>
      <div className="admin-kpi-card">
        <div className="icon">
          <FaUserTie />
        </div>
        <div>
          <h3>Agents bancaires</h3>
          <p>{roleTotals.agent_bancaire || 0}</p>
        </div>
      </div>
      <div className="admin-kpi-card">
        <div className="icon">
          <FaBuilding />
        </div>
        <div>
          <h3>Biens actifs</h3>
          <p>{propertyTotals.active || 0}</p>
        </div>
      </div>
      <div className="admin-kpi-card">
        <div className="icon">
          <FaListAlt />
        </div>
        <div>
          <h3>Biens admin</h3>
          <p>{propertyTotals.adminCreated || 0}</p>
        </div>
      </div>
      <div className="admin-kpi-card">
        <div className="icon">
          <FaGlobe />
        </div>
        <div>
          <h3>Sites actifs</h3>
          <p>{siteTotals.active || 0}</p>
        </div>
      </div>
      <div className="admin-kpi-card">
        <div className="icon">
          <FaEnvelope />
        </div>
        <div>
          <h3>Réclamations non lues</h3>
          <p>{dashboardSummary.reports.unread}</p>
        </div>
      </div>
    </div>
  );
}

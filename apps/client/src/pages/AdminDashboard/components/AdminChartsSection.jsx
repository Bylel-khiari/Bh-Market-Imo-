import React from 'react';
import { FaBuilding, FaChartLine, FaGlobe, FaListAlt, FaTimes } from 'react-icons/fa';

export default function AdminChartsSection({ propertyTotals, siteTotals }) {
  return (
    <div className="admin-card admin-dashboard-status-card">
      <div className="admin-dashboard-status-head">
        <div>
          <h2>Ã‰tat des biens immobiliers</h2>
          <p className="admin-section-help">
            SynthÃ¨se des biens visibles, actifs et collectÃ©s sur la plateforme.
          </p>
        </div>
      </div>
      <div className="admin-dashboard-status-grid">
        <article className="admin-dashboard-status-item">
          <span className="admin-dashboard-status-icon">
            <FaBuilding />
          </span>
          <div>
            <span>Total admin</span>
            <strong>{propertyTotals.total}</strong>
          </div>
        </article>
        <article className="admin-dashboard-status-item">
          <span className="admin-dashboard-status-icon">
            <FaChartLine />
          </span>
          <div>
            <span>Actifs cÃ´tÃ© client</span>
            <strong>{propertyTotals.active}</strong>
          </div>
        </article>
        <article className="admin-dashboard-status-item">
          <span className="admin-dashboard-status-icon">
            <FaTimes />
          </span>
          <div>
            <span>DÃ©sactivÃ©s</span>
            <strong>{propertyTotals.inactive}</strong>
          </div>
        </article>
        <article className="admin-dashboard-status-item">
          <span className="admin-dashboard-status-icon">
            <FaListAlt />
          </span>
          <div>
            <span>AjoutÃ©s par admin</span>
            <strong>{propertyTotals.adminCreated}</strong>
          </div>
        </article>
        <article className="admin-dashboard-status-item">
          <span className="admin-dashboard-status-icon">
            <FaGlobe />
          </span>
          <div>
            <span>Sites actifs</span>
            <strong>{siteTotals.active}</strong>
          </div>
        </article>
      </div>
    </div>
  );
}

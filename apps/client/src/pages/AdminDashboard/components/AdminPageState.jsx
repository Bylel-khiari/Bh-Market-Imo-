import React from 'react';
import { FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';

export function AdminLoadingState() {
  return (
    <div className="admin-dashboard admin-dashboard--state">
      <div className="admin-state admin-state--page">
        <FaSyncAlt className="spin" />
        <p>Chargement du tableau de bord admin...</p>
      </div>
    </div>
  );
}

export function AdminErrorState({ error, refreshDashboardData }) {
  return (
    <div className="admin-dashboard admin-dashboard--state">
      <div className="admin-state admin-state--page error">
        <FaExclamationTriangle />
        <p>{error}</p>
        <button type="button" className="admin-refresh" onClick={refreshDashboardData}>
          RÃƒÂ©essayer
        </button>
      </div>
    </div>
  );
}

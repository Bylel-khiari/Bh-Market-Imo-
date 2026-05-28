import React from 'react';

export default function AdminSettingsSection({
  apiBaseUrl,
  dashboardSummary,
  formMode,
  propertyFormMode,
  propertyTotals,
  siteFormMode,
  siteTotals,
}) {
  return (
    <div className="admin-content-grid admin-content-single">
      <section className="admin-analytics-column">
        <div className="admin-card">
          <h2>Configuration du module admin</h2>
          <p className="admin-section-help">
            Configuration actuelle du tableau de bord admin.
          </p>
          <ul className="admin-settings-list">
            <li>API: {apiBaseUrl}</li>
            <li>Utilisateurs en base : {dashboardSummary.users.total}</li>
            <li>Biens en base : {propertyTotals.total}</li>
            <li>Réclamations non lues : {dashboardSummary.reports.unread}</li>
            <li>Sites de collecte en base : {siteTotals.total}</li>
            <li>Mode édition utilisateur : {formMode === 'edit' ? 'Actif' : 'Inactif'}</li>
            <li>Mode édition bien : {propertyFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
            <li>Mode édition site : {siteFormMode === 'edit' ? 'Actif' : 'Inactif'}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

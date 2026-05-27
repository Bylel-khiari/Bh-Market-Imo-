import React from 'react';
import AdminModalShell, { AdminFieldInput } from './AdminModalShell';

export default function AdminSiteModal({
  editingSiteId,
  handleSiteFormChange,
  handleSiteSubmit,
  openCreateSitePanel,
  resetSiteForm,
  siteFormData,
  siteFormMessage,
  siteFormMode,
  siteSubmitting,
}) {
  return (
    <AdminModalShell
      disabled={siteSubmitting}
      onClose={resetSiteForm}
      title={
        siteFormMode === 'create'
          ? 'Nouveau site de collecte'
          : `Modifier le site ${siteFormData.name || `#${editingSiteId}`}`
      }
    >
      <p className="admin-section-help">
        Le champ identifiant du spider doit correspondre au nom technique du spider Scrapy
        si vous voulez piloter sa collecte.
      </p>
      <form className="admin-user-form admin-user-form-compact" onSubmit={handleSiteSubmit}>
        <AdminFieldInput id="site-name" name="name" label="Nom du site (colonne name)" placeholder="Ex: Afariat" value={siteFormData.name} onChange={handleSiteFormChange} disabled={siteSubmitting} />
        <AdminFieldInput id="site-spider-name" name="spider_name" label="Identifiant du spider (colonne spider_name)" placeholder="Ex: afariat" value={siteFormData.spider_name} onChange={handleSiteFormChange} disabled={siteSubmitting} />
        <AdminFieldInput id="site-base-url" name="base_url" type="url" label="URL principale (colonne base_url)" placeholder="Ex: https://afariat.com" value={siteFormData.base_url} onChange={handleSiteFormChange} disabled={siteSubmitting} />
        <AdminFieldInput id="site-start-url" name="start_url" type="url" label="URL de dÃƒÂ©part (colonne start_url)" placeholder="Ex: https://afariat.com/appartements" value={siteFormData.start_url} onChange={handleSiteFormChange} disabled={siteSubmitting} />
        <div className="admin-field-block">
          <label className="admin-field-label" htmlFor="site-description">
            Description (colonne description)
          </label>
          <textarea
            id="site-description"
            name="description"
            placeholder="Ex. : Portail de petites annonces immobiliÃƒÂ¨res en Tunisie."
            value={siteFormData.description}
            onChange={handleSiteFormChange}
            disabled={siteSubmitting}
            rows={4}
          />
        </div>
        <div className="admin-field-block">
          <label className="admin-field-label" htmlFor="site-integration-status">
            Statut integration
          </label>
          <select
            id="site-integration-status"
            name="integration_status"
            value={siteFormData.integration_status}
            onChange={handleSiteFormChange}
            disabled={siteSubmitting}
          >
            <option value="ready">Spider pret</option>
            <option value="pending_spider">En attente de spider</option>
            <option value="disabled">DÃƒÂ©sactivÃƒÂ© techniquement</option>
          </select>
        </div>
        <label className="admin-checkbox-row">
          <input
            name="is_active"
            type="checkbox"
            checked={siteFormData.is_active}
            onChange={handleSiteFormChange}
            disabled={siteSubmitting}
          />
          <span>Site actif pour les prochains lancements du scraper</span>
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="admin-refresh" disabled={siteSubmitting}>
            {siteSubmitting
              ? 'Traitement...'
              : siteFormMode === 'create'
                ? 'Ajouter'
                : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="admin-secondary"
            onClick={openCreateSitePanel}
            disabled={siteSubmitting}
          >
            Nouveau
          </button>
        </div>
      </form>
      {siteFormMessage && <p className="admin-form-message">{siteFormMessage}</p>}
    </AdminModalShell>
  );
}

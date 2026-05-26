import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function AdminModals({
  activeSection,
  closeDeleteConfirm,
  closeDeletePropertyConfirm,
  closeDeleteSiteConfirm,
  deleteCandidate,
  editingPropertyId,
  editingSiteId,
  editingUserId,
  formData,
  formMessage,
  formMode,
  handleDeleteConfirmed,
  handleDeletePropertyConfirmed,
  handleDeleteSiteConfirmed,
  handleFormChange,
  handleGeneratePassword,
  handlePropertyFormChange,
  handlePropertySubmit,
  handleSiteFormChange,
  handleSiteSubmit,
  handleSubmit,
  isEditPanelOpen,
  isPropertyPanelOpen,
  isSitePanelOpen,
  openCreatePanel,
  openCreatePropertyPanel,
  openCreateSitePanel,
  propertyDeleteCandidate,
  propertyFormData,
  propertyFormMessage,
  propertyFormMode,
  propertySubmitting,
  resetForm,
  resetPropertyForm,
  resetSiteForm,
  siteDeleteCandidate,
  siteFormData,
  siteFormMessage,
  siteFormMode,
  siteSubmitting,
  submitting,
}) {
  return (
    <>
      {activeSection === 'users' && isEditPanelOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetForm}>
          <aside className="admin-card admin-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-edit-panel-head">
              <h2>{formMode === 'create' ? 'Nouvel utilisateur' : `Modifier utilisateur #${editingUserId}`}</h2>
              <button
                type="button"
                className="admin-close-btn"
                onClick={resetForm}
                disabled={submitting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            <p className="admin-section-help">
              Remplissez le formulaire puis validez pour crÃ©er ou mettre Ã  jour un compte.
            </p>
            <form className="admin-user-form admin-user-form-compact" onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Nom"
                value={formData.name}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <input
                name="password"
                type="text"
                placeholder={
                  formMode === 'create'
                    ? 'Mot de passe (min. 6)'
                    : 'Nouveau mot de passe (optionnel)'
                }
                value={formData.password}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <button
                type="button"
                className="admin-secondary"
                onClick={handleGeneratePassword}
                disabled={submitting}
              >
                Generer mot de passe
              </button>
              <select
                name="role"
                value={formData.role}
                onChange={handleFormChange}
                disabled={submitting}
              >
                <option value="client">Client</option>
                <option value="agent_bancaire">Agent bancaire</option>
                <option value="admin">Admin</option>
              </select>
              {formData.role === 'client' && (
                <>
                  <label className="admin-field-block">
                    <span className="admin-field-label">RIB bancaire</span>
                    <input
                      name="rib_bancaire"
                      placeholder="RIB-000001-8392"
                      value={formData.rib_bancaire}
                      onChange={handleFormChange}
                      disabled={submitting || formData.generate_rib_bancaire}
                    />
                  </label>
                  <label className="admin-checkbox-line">
                    <input
                      name="generate_rib_bancaire"
                      type="checkbox"
                      checked={formData.generate_rib_bancaire}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                    <span>Generer automatiquement le RIB</span>
                  </label>
                  <input
                    name="address"
                    placeholder="Adresse (optionnel)"
                    value={formData.address}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                  <input
                    name="phone"
                    placeholder="TÃ©lÃ©phone (optionnel)"
                    value={formData.phone}
                    onChange={handleFormChange}
                    disabled={submitting}
                  />
                </>
              )}
              {formData.role === 'agent_bancaire' && (
                <input
                  name="matricule"
                  placeholder="Matricule (optionnel)"
                  value={formData.matricule}
                  onChange={handleFormChange}
                  disabled={submitting}
                />
              )}
              <div className="admin-form-actions">
                <button type="submit" className="admin-refresh" disabled={submitting}>
                  {submitting ? 'Traitement...' : formMode === 'create' ? 'CrÃ©er' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={openCreatePanel}
                  disabled={submitting}
                >
                  Nouveau
                </button>
              </div>
            </form>
            {formMessage && <p className="admin-form-message">{formMessage}</p>}
          </aside>
        </div>
      )}

      {activeSection === 'users' && Boolean(deleteCandidate) && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeDeleteConfirm}>
          <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p className="admin-section-help">
              Voulez-vous vraiment supprimer{' '}
              <strong>{deleteCandidate?.name || deleteCandidate?.email}</strong> ?
            </p>
            <div className="admin-form-actions">
              <button type="button" className="admin-secondary" onClick={closeDeleteConfirm} disabled={submitting}>
                Annuler
              </button>
              <button type="button" className="admin-danger" onClick={handleDeleteConfirmed} disabled={submitting}>
                {submitting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {activeSection === 'properties' && isPropertyPanelOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetPropertyForm}>
          <aside
            className="admin-card admin-edit-modal admin-edit-modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-edit-panel-head">
              <h2>
                {propertyFormMode === 'create'
                  ? 'Nouveau bien'
                  : `Modifier le bien ${propertyFormData.title || `#${editingPropertyId}`}`}
              </h2>
              <button
                type="button"
                className="admin-close-btn"
                onClick={resetPropertyForm}
                disabled={propertySubmitting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            <p className="admin-section-help">
              Les champs ci-dessous correspondent aux colonnes principales de la table canonique properties.
            </p>
            <form className="admin-user-form admin-user-form-compact" onSubmit={handlePropertySubmit}>
              <PropertyInput id="property-title" name="title" label="Titre (colonne title)" placeholder="Ex. : Appartement S+2 Ã  Tunis" value={propertyFormData.title} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-price-raw" name="price_raw" label="Prix texte (colonne price_raw)" placeholder="Ex: 320 000 DT" value={propertyFormData.price_raw} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-price-value" name="price_value" type="number" min="0" step="0.01" label="Prix numÃ©rique (colonne price_value)" placeholder="Ex: 320000" value={propertyFormData.price_value} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-location-raw" name="location_raw" label="Localisation brute (colonne location_raw)" placeholder="Ex: La Marsa, Tunis" value={propertyFormData.location_raw} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-city" name="city" label="Ville (colonne city)" placeholder="Ex: Tunis" value={propertyFormData.city} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-country" name="country" label="Pays (colonne country)" placeholder="Ex: Tunisie" value={propertyFormData.country} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-image" name="image" label="Image principale (colonne image)" placeholder="Ex: https://site.com/photo.jpg" value={propertyFormData.image} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-source" name="source" label="Source (colonne source)" placeholder="Ex: mubawab ou admin" value={propertyFormData.source} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-url" name="url" label="Lien source (colonne url)" placeholder="Ex: https://site.com/bien/123" value={propertyFormData.url} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <PropertyInput id="property-scraped-at" name="scraped_at" type="datetime-local" label="Date de collecte (colonne scraped_at)" value={propertyFormData.scraped_at} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="property-description">
                  Description (colonne description)
                </label>
                <textarea
                  id="property-description"
                  name="description"
                  placeholder="Description complÃ¨te du bien immobilier."
                  value={propertyFormData.description}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                  rows={5}
                />
              </div>
              <label className="admin-checkbox-row">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={propertyFormData.is_active}
                  onChange={handlePropertyFormChange}
                  disabled={propertySubmitting}
                />
                <span>Bien actif pour lâ€™espace client</span>
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="admin-refresh" disabled={propertySubmitting}>
                  {propertySubmitting
                    ? 'Traitement...'
                    : propertyFormMode === 'create'
                      ? 'Ajouter'
                      : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={openCreatePropertyPanel}
                  disabled={propertySubmitting}
                >
                  Nouveau
                </button>
              </div>
            </form>
            {propertyFormMessage && <p className="admin-form-message">{propertyFormMessage}</p>}
          </aside>
        </div>
      )}

      {activeSection === 'properties' && Boolean(propertyDeleteCandidate) && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeDeletePropertyConfirm}
        >
          <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p className="admin-section-help">
              Voulez-vous vraiment supprimer le bien{' '}
              <strong>{propertyDeleteCandidate?.title || `#${propertyDeleteCandidate?.id}`}</strong> ?
            </p>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={closeDeletePropertyConfirm}
                disabled={propertySubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-danger"
                onClick={handleDeletePropertyConfirmed}
                disabled={propertySubmitting}
              >
                {propertySubmitting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {activeSection === 'sites' && isSitePanelOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetSiteForm}>
          <aside className="admin-card admin-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-edit-panel-head">
              <h2>
                {siteFormMode === 'create'
                  ? 'Nouveau site de collecte'
                  : `Modifier le site ${siteFormData.name || `#${editingSiteId}`}`}
              </h2>
              <button
                type="button"
                className="admin-close-btn"
                onClick={resetSiteForm}
                disabled={siteSubmitting}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            <p className="admin-section-help">
              Le champ identifiant du spider doit correspondre au nom technique du spider Scrapy
              si vous voulez piloter sa collecte.
            </p>
            <form className="admin-user-form admin-user-form-compact" onSubmit={handleSiteSubmit}>
              <PropertyInput id="site-name" name="name" label="Nom du site (colonne name)" placeholder="Ex: Afariat" value={siteFormData.name} onChange={handleSiteFormChange} disabled={siteSubmitting} />
              <PropertyInput id="site-spider-name" name="spider_name" label="Identifiant du spider (colonne spider_name)" placeholder="Ex: afariat" value={siteFormData.spider_name} onChange={handleSiteFormChange} disabled={siteSubmitting} />
              <PropertyInput id="site-base-url" name="base_url" type="url" label="URL principale (colonne base_url)" placeholder="Ex: https://afariat.com" value={siteFormData.base_url} onChange={handleSiteFormChange} disabled={siteSubmitting} />
              <PropertyInput id="site-start-url" name="start_url" type="url" label="URL de dÃ©part (colonne start_url)" placeholder="Ex: https://afariat.com/appartements" value={siteFormData.start_url} onChange={handleSiteFormChange} disabled={siteSubmitting} />
              <div className="admin-field-block">
                <label className="admin-field-label" htmlFor="site-description">
                  Description (colonne description)
                </label>
                <textarea
                  id="site-description"
                  name="description"
                  placeholder="Ex. : Portail de petites annonces immobiliÃ¨res en Tunisie."
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
                  <option value="disabled">DÃ©sactivÃ© techniquement</option>
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
          </aside>
        </div>
      )}

      {activeSection === 'sites' && Boolean(siteDeleteCandidate) && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeDeleteSiteConfirm}>
          <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Confirmer la suppression</h2>
            <p className="admin-section-help">
              Voulez-vous vraiment supprimer le site <strong>{siteDeleteCandidate?.name}</strong> ?
            </p>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={closeDeleteSiteConfirm}
                disabled={siteSubmitting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-danger"
                onClick={handleDeleteSiteConfirmed}
                disabled={siteSubmitting}
              >
                {siteSubmitting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function PropertyInput({
  disabled,
  id,
  label,
  name,
  onChange,
  placeholder,
  type = 'text',
  value,
  ...inputProps
}) {
  return (
    <div className="admin-field-block">
      <label className="admin-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...inputProps}
      />
    </div>
  );
}

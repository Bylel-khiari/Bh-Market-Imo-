import React from 'react';
import AdminModalShell, { AdminFieldInput } from './AdminModalShell';

export default function AdminPropertyModal({
  editingPropertyId,
  handlePropertyFormChange,
  handlePropertySubmit,
  openCreatePropertyPanel,
  propertyFormData,
  propertyFormMessage,
  propertyFormMode,
  propertySubmitting,
  resetPropertyForm,
}) {
  return (
    <AdminModalShell
      disabled={propertySubmitting}
      onClose={resetPropertyForm}
      title={
        propertyFormMode === 'create'
          ? 'Nouveau bien'
          : `Modifier le bien ${propertyFormData.title || `#${editingPropertyId}`}`
      }
      wide
    >
      <p className="admin-section-help">
        Les champs ci-dessous correspondent aux colonnes principales de la table canonique properties.
      </p>
      <form className="admin-user-form admin-user-form-compact" onSubmit={handlePropertySubmit}>
        <AdminFieldInput id="property-title" name="title" label="Titre (colonne title)" placeholder="Ex. : Appartement S+2 à Tunis" value={propertyFormData.title} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-price-raw" name="price_raw" label="Prix texte (colonne price_raw)" placeholder="Ex: 320 000 DT" value={propertyFormData.price_raw} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-price-value" name="price_value" type="number" min="0" step="0.01" label="Prix numérique (colonne price_value)" placeholder="Ex: 320000" value={propertyFormData.price_value} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-location-raw" name="location_raw" label="Localisation brute (colonne location_raw)" placeholder="Ex: La Marsa, Tunis" value={propertyFormData.location_raw} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-city" name="city" label="Ville (colonne city)" placeholder="Ex: Tunis" value={propertyFormData.city} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-country" name="country" label="Pays (colonne country)" placeholder="Ex: Tunisie" value={propertyFormData.country} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-image" name="image" label="Image principale (colonne image)" placeholder="Ex: https://site.com/photo.jpg" value={propertyFormData.image} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-source" name="source" label="Source (colonne source)" placeholder="Ex: mubawab ou admin" value={propertyFormData.source} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-url" name="url" label="Lien source (colonne url)" placeholder="Ex: https://site.com/bien/123" value={propertyFormData.url} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <AdminFieldInput id="property-scraped-at" name="scraped_at" type="datetime-local" label="Date de collecte (colonne scraped_at)" value={propertyFormData.scraped_at} onChange={handlePropertyFormChange} disabled={propertySubmitting} />
        <div className="admin-field-block">
          <label className="admin-field-label" htmlFor="property-description">
            Description (colonne description)
          </label>
          <textarea
            id="property-description"
            name="description"
            placeholder="Description complète du bien immobilier."
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
          <span>Bien actif pour l’espace client</span>
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
    </AdminModalShell>
  );
}

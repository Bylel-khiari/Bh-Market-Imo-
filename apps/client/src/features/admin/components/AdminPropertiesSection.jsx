import React from 'react';
import { FaBan, FaCheckCircle, FaMapMarkerAlt, FaPlus, FaSyncAlt } from 'react-icons/fa';

export default function AdminPropertiesSection({
  statusFilterOptions,
  propertyPagination,
  propertyLoading,
  propertyError,
  propertyFormMessage,
  propertySearch,
  setPropertySearch,
  propertyStatusFilter,
  setPropertyStatusFilter,
  propertyVisibleRangeStart,
  propertyVisibleRangeEnd,
  paginatedAdminProperties,
  propertyTotalPages,
  currentPropertyPage,
  setCurrentPropertyPage,
  propertyVisiblePageNumbers,
  propertySubmitting,
  editingPropertyId,
  openCreatePropertyPanel,
  handleTogglePropertyStatus,
  startEditProperty,
  requestDeleteProperty,
  formatPropertyPrice,
  formatDate,
}) {
  return (
    <div className="admin-content-grid admin-content-single">
      <section className="admin-analytics-column">
        <div className="admin-card admin-properties-card">
          <div className="admin-users-header">
            <h2>Biens immobiliers</h2>
            <div className="admin-users-header-actions">
              <span className="admin-users-count">{propertyPagination.total}</span>
              <button type="button" className="admin-refresh" onClick={openCreatePropertyPanel}>
                <FaPlus /> Nouveau bien
              </button>
            </div>
          </div>

          <p className="admin-section-help">
            Ajoutez, modifiez, supprimez ou activez/desactivez les biens immobiliers.
            Les changements admin restent prioritaires sur les donnees importees.
          </p>

          {!propertyLoading && propertyPagination.total > 0 && (
            <p className="admin-section-help">
              Affichage de {propertyVisibleRangeStart} a {propertyVisibleRangeEnd} sur{' '}
              {propertyPagination.total} biens.
            </p>
          )}

          <div className="admin-users-toolbar admin-toolbar-row">
            <input
              className="admin-search-input"
              placeholder="Rechercher par titre, ville, source ou URL"
              value={propertySearch}
              onChange={(event) => setPropertySearch(event.target.value)}
            />
            <div className="admin-filter-chips" aria-label="Filtrer les biens par statut">
              {statusFilterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`admin-filter-chip ${propertyStatusFilter === option.value ? 'is-active' : ''}`}
                  onClick={() => setPropertyStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {propertyFormMessage && (
            <p
              className={`admin-form-message ${propertyFormMessage.toLowerCase().includes('erreur') ? 'admin-form-message--error' : ''}`}
            >
              {propertyFormMessage}
            </p>
          )}
          {propertyError && (
            <p className="admin-form-message admin-form-message--error">{propertyError}</p>
          )}

          {propertyLoading ? (
            <div className="admin-state admin-state--inline">
              <FaSyncAlt className="spin" />
              <p>Chargement des biens...</p>
            </div>
          ) : propertyPagination.total === 0 ? (
            <p className="empty">Aucun bien trouve.</p>
          ) : (
            <>
              <div className="admin-properties-grid">
                {paginatedAdminProperties.map((property) => (
                  <article
                    key={property.id}
                    className={`admin-property-card ${property.is_active ? 'is-active' : 'is-inactive'} ${editingPropertyId === property.id ? 'is-editing' : ''}`}
                  >
                    <div className="admin-property-media">
                      {property.image ? (
                        <img
                          src={property.image}
                          alt={property.title || 'Bien immobilier'}
                          className="admin-property-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="admin-property-image-placeholder">
                          Image non disponible
                        </div>
                      )}
                      <div className="admin-property-badges">
                        <span className={`admin-site-status ${property.is_active ? 'is-active' : 'is-inactive'}`}>
                          {property.is_active ? <FaCheckCircle /> : <FaBan />}
                          {property.is_active ? 'Active' : 'Desactivee'}
                        </span>
                        {property.created_by_admin && (
                          <span className="admin-property-origin admin-property-origin--created">
                            Ajoutee par admin
                          </span>
                        )}
                        {property.has_manual_changes && !property.created_by_admin && (
                          <span className="admin-property-origin">Modifiee</span>
                        )}
                      </div>
                      <span className="admin-property-source-badge">
                        {property.source || 'source inconnue'}
                      </span>
                    </div>

                    <div className="admin-property-card-body">
                      <p className="admin-property-location">
                        <FaMapMarkerAlt />
                        <span>{property.location_raw || property.city || 'Localisation non disponible'}</span>
                      </p>
                      <h3>{property.title || 'Titre non disponible'}</h3>
                      <p className="admin-property-description">
                        {property.description || 'Aucune description renseignee pour ce bien.'}
                      </p>
                      <div className="admin-property-footer-row">
                        <p className="admin-property-price">{formatPropertyPrice(property)}</p>
                        <span className="admin-property-id-badge">ID #{property.id}</span>
                      </div>
                      <div className="admin-property-meta">
                        <span>
                          <strong>Ville:</strong> {property.city || '-'}
                        </span>
                        <span>
                          <strong>Mise a jour:</strong>{' '}
                          {formatDate(property.admin_updated_at || property.scraped_at)}
                        </span>
                      </div>

                      <div className="admin-table-actions admin-property-actions">
                        <button
                          type="button"
                          className={`admin-toggle-btn ${property.is_active ? 'is-active' : 'is-inactive'}`}
                          onClick={() => handleTogglePropertyStatus(property)}
                          disabled={propertySubmitting}
                          aria-pressed={property.is_active}
                          aria-label={property.is_active ? 'Desactiver ce bien' : 'Activer ce bien'}
                        >
                          <span className="admin-toggle-track">
                            <span className="admin-toggle-thumb" />
                          </span>
                          <span className="admin-toggle-copy">
                            <strong>{property.is_active ? 'Active' : 'Inactive'}</strong>
                            <small>
                              {property.is_active ? 'Cliquer pour desactiver' : 'Cliquer pour activer'}
                            </small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => startEditProperty(property)}
                          disabled={propertySubmitting}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="admin-danger"
                          onClick={() => requestDeleteProperty(property)}
                          disabled={propertySubmitting}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {propertyTotalPages > 1 && (
                <nav className="admin-pagination" aria-label="Pagination des biens admin">
                  <button
                    type="button"
                    className="admin-pagination-btn admin-pagination-btn--nav"
                    onClick={() => setCurrentPropertyPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPropertyPage === 1}
                  >
                    Precedent
                  </button>

                  <div className="admin-pagination-pages">
                    {propertyVisiblePageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`admin-pagination-btn ${pageNumber === currentPropertyPage ? 'is-active' : ''}`}
                        onClick={() => setCurrentPropertyPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="admin-pagination-btn admin-pagination-btn--nav"
                    onClick={() => setCurrentPropertyPage((prev) => Math.min(propertyTotalPages, prev + 1))}
                    disabled={currentPropertyPage === propertyTotalPages}
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

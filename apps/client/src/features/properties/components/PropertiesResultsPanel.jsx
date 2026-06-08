import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import PropertiesGrid from './PropertiesGrid';

export default function PropertiesResultsPanel({
  authSession,
  currentPage,
  currentUserRole,
  error,
  favoriteError,
  favoriteIdSet,
  favoriteIds,
  favoriteLoading,
  favoriteNotice,
  favoritePendingId,
  favoritesOnly,
  fetchProperties,
  filteredProperties,
  focusedId,
  loading,
  onReportProperty,
  onSelectProperty,
  onToggleFavorite,
  paginatedProperties,
  reportError,
  reportNotice,
  selectedProperty,
  setCurrentPage,
  totalPages,
  visiblePageNumbers,
  visibleRangeEnd,
  visibleRangeStart,
}) {
  return (
    <section className="cards-panel">
      <header className="cards-header">
        <div>
          <p className="cards-title-label">Bien immobilier</p>
          <h1>{favoritesOnly ? 'Vos biens favoris' : 'Explorez les meilleurs biens'}</h1>
          <p>
            {loading
              ? 'Chargement des données...'
              : `${visibleRangeStart}-${visibleRangeEnd} sur ${filteredProperties.length} bien(s)`}
          </p>
        </div>

        <div className="cards-header-actions">
          <button type="button" onClick={fetchProperties} className="refresh-btn">
            <FaSyncAlt /> Actualiser
          </button>
        </div>
      </header>

      {error && <div className="properties-warning">{error}</div>}
      {favoriteError && <div className="properties-error">{favoriteError}</div>}
      {favoriteNotice && <div className="properties-success">{favoriteNotice}</div>}
      {reportError && <div className="properties-error">{reportError}</div>}
      {reportNotice && <div className="properties-success">{reportNotice}</div>}
      {!loading && favoritesOnly && !authSession?.token && (
        <div className="properties-warning">
          Connectez-vous pour retrouver vos biens favoris sauvegardés.
        </div>
      )}
      {!loading && favoritesOnly && authSession?.token && currentUserRole !== 'client' && (
        <div className="properties-warning">
          Les favoris sont actuellement disponibles pour les comptes client.
        </div>
      )}
      {loading && <div className="properties-loading">Chargement des biens disponibles...</div>}

      {!loading && filteredProperties.length > 0 && (
        <PropertiesGrid
          currentPage={currentPage}
          favoriteIdSet={favoriteIdSet}
          favoritePendingId={favoritePendingId}
          focusedId={focusedId}
          onReportProperty={onReportProperty}
          onSelectProperty={onSelectProperty}
          onToggleFavorite={onToggleFavorite}
          paginatedProperties={paginatedProperties}
          selectedProperty={selectedProperty}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          visiblePageNumbers={visiblePageNumbers}
        />
      )}

      {!loading && favoriteLoading && currentUserRole === 'client' && !favoriteIds.length && (
        <div className="properties-loading">Chargement de vos favoris...</div>
      )}

      {!loading && filteredProperties.length === 0 && (
        <div className="properties-empty">
          {favoritesOnly
            ? 'Aucun bien favori trouvé pour le moment.'
            : 'Aucun bien ne correspond à votre recherche.'}
        </div>
      )}
    </section>
  );
}

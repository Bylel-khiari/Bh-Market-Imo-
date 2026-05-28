import React from 'react';
import {
  FaBath,
  FaBed,
  FaExternalLinkAlt,
  FaFlag,
  FaHeart,
  FaRegHeart,
  FaRulerCombined,
} from 'react-icons/fa';
import {
  formatPropertyDate,
  formatPropertyPrice,
  getPropertyImages,
  inferRoomsFromTitle,
} from '../utils/propertyFormatters';

export default function PropertiesMapSection({
  favoriteIdSet,
  favoritePendingId,
  onOpenSimulation,
  onReportProperty,
  onToggleFavorite,
  selectedProperty,
}) {
  if (!selectedProperty) {
    return (
      <aside className="details-panel">
        <div className="properties-empty">Aucun bien sélectionné pour le moment.</div>
      </aside>
    );
  }

  const selectedImages = getPropertyImages(selectedProperty);
  const selectedCoverImage = selectedImages[0] || '';
  const selectedThumbs = selectedImages.length ? selectedImages.slice(0, 3) : [null, null, null];
  const isFavorite = favoriteIdSet.has(String(selectedProperty.id));

  return (
    <aside className="details-panel">
      <div className="details-media">
        {selectedCoverImage ? (
          <img src={selectedCoverImage} alt={selectedProperty.title || 'Bien immobilier'} className="details-main-image" />
        ) : (
          <div className="details-main-image image-fallback">Image non disponible</div>
        )}
        <div className="details-thumbs">
          {selectedThumbs.map((imageUrl, index) => (
            <div className="thumb" key={`${selectedProperty.id}-${index}`}>
              {imageUrl ? (
                <img src={imageUrl} alt={`thumb-${index + 1}`} />
              ) : (
                <span>-</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="details-headline">
        <h2>{selectedProperty.title || 'Titre du bien'}</h2>
        <p>{selectedProperty.location_raw || selectedProperty.city || 'Localisation non disponible'}</p>
        <div className="details-price">{formatPropertyPrice(selectedProperty)}</div>
        <div className="details-favorite-row">
          <button
            type="button"
            className={`details-favorite-btn ${isFavorite ? 'is-active' : ''}`}
            onClick={(event) => onToggleFavorite(event, selectedProperty)}
            disabled={favoritePendingId === String(selectedProperty.id)}
          >
            {isFavorite ? <FaHeart /> : <FaRegHeart />}
            <span>
              {isFavorite
                ? 'Enregistré dans vos favoris'
                : 'Ajouter aux favoris'}
            </span>
          </button>
          <button
            type="button"
            className="details-report-btn"
            onClick={(event) => onReportProperty(selectedProperty, event)}
          >
            <FaFlag />
            <span>Signaler un problème</span>
          </button>
        </div>
      </div>

      <div className="details-tabs">
        <span className="is-active">Aperçu</span>
        <span>Avis</span>
        <span>À propos</span>
      </div>

      <div className="details-description">
        <h4>Description</h4>
        <p>{selectedProperty.description || 'Description non disponible pour ce bien.'}</p>
      </div>

      <div className="details-stats">
        <span><FaBed /> {inferRoomsFromTitle(selectedProperty.title, 2, 4)} chambres</span>
        <span><FaBath /> {inferRoomsFromTitle(selectedProperty.title, 1, 3)} salles de bain</span>
        <span><FaRulerCombined /> {inferRoomsFromTitle(selectedProperty.title, 90, 150)} m2</span>
      </div>

      <div className="details-actions">
        {selectedProperty.url ? (
          <a href={selectedProperty.url} target="_blank" rel="noreferrer" className="btn-light">
            Voir la source <FaExternalLinkAlt />
          </a>
        ) : (
          <span className="btn-light is-disabled">Source non disponible</span>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={() => onOpenSimulation(selectedProperty)}
        >
          Simuler
        </button>
      </div>

      <div className="mini-map">
        <span className="pin pin-a" />
        <span className="pin pin-b" />
        <span className="pin pin-c" />
        <span className="map-label">{selectedProperty.city || 'Tunisie'}</span>
      </div>
      <p className="details-date">Mis à jour : {formatPropertyDate(selectedProperty.scraped_at)}</p>
    </aside>
  );
}

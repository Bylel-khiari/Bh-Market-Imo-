import React from 'react';
import { FaFlag, FaHeart, FaMapMarkerAlt, FaRegHeart, FaStar } from 'react-icons/fa';
import {
  buildRating,
  formatPropertyPrice,
  getPropertyImages,
  inferTypeFromTitle,
} from '../utils/propertyFormatters';

export default function PropertyCard({
  active,
  focused,
  isFavorite,
  isFavoritePending,
  onReport,
  onSelect,
  onToggleFavorite,
  property,
}) {
  const type = inferTypeFromTitle(property.title);
  const propertyImages = getPropertyImages(property);
  const coverImage = propertyImages[0] || '';

  return (
    <article
      className={`property-card compact-card ${active ? 'is-active' : ''} ${focused ? 'property-card--focused' : ''}`}
      data-property-id={property.id}
      onClick={onSelect}
    >
      <div className="property-card-image-wrap">
        {coverImage ? (
          <img src={coverImage} alt={property.title || 'Bien immobilier'} className="property-card-image" loading="lazy" />
        ) : (
          <div className="property-card-image-placeholder">Image non disponible</div>
        )}
        <span className="property-badge">{type}</span>
        <button
          type="button"
          className={`favorite-toggle-btn ${isFavorite ? 'is-active' : ''} ${isFavoritePending ? 'is-loading' : ''}`}
          onClick={onToggleFavorite}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={isFavorite}
          disabled={isFavoritePending}
        >
          {isFavorite ? <FaHeart /> : <FaRegHeart />}
        </button>
        <button
          type="button"
          className="report-toggle-btn"
          onClick={onReport}
          aria-label="Signaler cette annonce"
        >
          <FaFlag />
        </button>
      </div>

      <div className="property-card-body">
        <h3>{property.title || 'Titre non disponible'}</h3>
        <p className="property-card-location">
          <FaMapMarkerAlt /> {property.location_raw || property.city || 'Localisation non disponible'}
        </p>
        <div className="property-card-footer-row">
          <p className="property-card-price">{formatPropertyPrice(property)}</p>
          <span className="rating-pill"><FaStar /> {buildRating(property.id)}</span>
        </div>
      </div>
    </article>
  );
}

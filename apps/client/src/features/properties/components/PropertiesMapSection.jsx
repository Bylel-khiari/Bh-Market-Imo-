import React, { useState } from 'react';
import {
  FaBath,
  FaBed,
  FaExternalLinkAlt,
  FaFlag,
  FaHeart,
  FaMapMarkerAlt,
  FaRegHeart,
  FaRulerCombined,
  FaStar,
} from 'react-icons/fa';
import {
  buildRating,
  formatPropertyDate,
  formatPropertyPrice,
  getPropertyImages,
  inferRoomsFromTitle,
} from '../shared/propertyFormatters';

const DETAIL_TABS = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'reviews', label: 'Avis' },
  { id: 'about', label: 'À propos' },
];

const NUMBER_WORDS = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
};

function toPositiveInteger(value) {
  if (value == null || value === '') return null;
  const normalizedValue = NUMBER_WORDS[String(value).trim().toLowerCase()] ?? value;
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue) : null;
}

function getFirstPositiveInteger(property, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = toPositiveInteger(property?.[fieldName]);
    if (value) return value;
  }
  return null;
}

function extractPositiveInteger(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    const value = toPositiveInteger(match?.[1]);
    if (value) return value;
  }
  return null;
}

function getTextSignature(value) {
  return String(value || '')
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
}

function buildPropertyFacts(property) {
  const searchableText = [property.title, property.description].filter(Boolean).join(' ');
  const bedrooms =
    getFirstPositiveInteger(property, ['bedrooms', 'bedroom_count', 'rooms', 'room_count', 'pieces']) ||
    extractPositiveInteger(searchableText, [
      /(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*chambres?/i,
    ]) ||
    inferRoomsFromTitle(property.title, 2, 3);
  const bathrooms =
    getFirstPositiveInteger(property, ['bathrooms', 'bathroom_count', 'bath_count']) ||
    extractPositiveInteger(searchableText, [
      /(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*salles?\s+de\s+bain/i,
      /(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*sdb/i,
    ]) ||
    Math.max(1, Math.min(2, Math.ceil(bedrooms / 2)));
  const surface =
    getFirstPositiveInteger(property, ['surface', 'surface_m2', 'area', 'area_m2', 'size_m2']) ||
    extractPositiveInteger(searchableText, [
      /(\d{2,4})\s*(?:m2|m²|metres?\s*carres?)/i,
    ]) ||
    (110 + bedrooms * 10 + (getTextSignature(property.title) % 25));

  return [
    {
      icon: <FaBed />,
      label: `${bedrooms} chambre${bedrooms > 1 ? 's' : ''}`,
    },
    {
      icon: <FaBath />,
      label: `${bathrooms} salle${bathrooms > 1 ? 's' : ''} de bain`,
    },
    {
      icon: <FaRulerCombined />,
      label: `${surface} m2`,
    },
  ];
}

export default function PropertiesMapSection({
  favoriteIdSet,
  favoritePendingId,
  onOpenSimulation,
  onReportProperty,
  onToggleFavorite,
  selectedProperty,
}) {
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview');

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
  const propertyFacts = buildPropertyFacts(selectedProperty);
  const propertyRating = buildRating(selectedProperty.id);

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

      <div className="details-tabs" role="tablist" aria-label="Informations du bien">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`details-tab ${activeDetailsTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveDetailsTab(tab.id)}
            role="tab"
            aria-selected={activeDetailsTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeDetailsTab === 'overview' && (
        <div className="details-tab-panel">
          <div className="details-description">
            <h4>Description</h4>
            <p>{selectedProperty.description || 'Description non disponible pour ce bien.'}</p>
          </div>

          <div className="details-facts" aria-label="Caractéristiques du bien">
            {propertyFacts.map((fact) => (
              <div className="detail-fact-pill" key={fact.label}>
                {fact.icon}
                <span>{fact.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeDetailsTab === 'reviews' && (
        <div className="details-tab-panel">
          <div className="details-review-summary">
            <span className="details-review-score"><FaStar /> {propertyRating}</span>
            <strong>Avis des visiteurs</strong>
            <p>Aucun avis public n'a encore été ajouté pour ce bien.</p>
          </div>
        </div>
      )}

      {activeDetailsTab === 'about' && (
        <div className="details-tab-panel">
          <dl className="details-about-list">
            <div>
              <dt>Source</dt>
              <dd>{selectedProperty.source || 'Source non disponible'}</dd>
            </div>
            <div>
              <dt>Localisation</dt>
              <dd>
                <FaMapMarkerAlt />
                {selectedProperty.location_raw || selectedProperty.city || 'Localisation non disponible'}
              </dd>
            </div>
            <div>
              <dt>Mise à jour</dt>
              <dd>{formatPropertyDate(selectedProperty.scraped_at)}</dd>
            </div>
          </dl>
        </div>
      )}

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
          className="btn-primary details-simulation-btn"
          onClick={() => onOpenSimulation(selectedProperty)}
        >
          Simuler
        </button>
      </div>

      <p className="details-date">Mis à jour : {formatPropertyDate(selectedProperty.scraped_at)}</p>
    </aside>
  );
}

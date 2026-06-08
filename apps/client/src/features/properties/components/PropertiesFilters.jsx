import React from 'react';
import { FaMapMarkerAlt, FaSearch, FaSlidersH, FaTimes } from 'react-icons/fa';
import { DEFAULT_PROPERTY_SORT, formatCompactPrice } from '../shared/propertyFormatters';

export default function PropertiesFilters({
  activeFilterCount,
  clearPropertyFilters,
  filteredCount,
  maxPriceInput,
  minPriceInput,
  priceStats,
  searchKeywordValue,
  searchLocationValue,
  sortOrder,
  updatePropertyFilter,
}) {
  return (
    <aside className="filters-panel" aria-label="Filtres des biens">
      <div className="panel-title-row">
        <div>
          <span className="filter-eyebrow"><FaSlidersH /> Filtres</span>
          <h2>Affiner les biens</h2>
        </div>
        <button
          type="button"
          className="clear-btn"
          onClick={clearPropertyFilters}
          disabled={activeFilterCount === 0 && sortOrder === DEFAULT_PROPERTY_SORT}
        >
          <FaTimes /> Reset
        </button>
      </div>

      <div className="filter-summary">
        <strong>{filteredCount}</strong>
        <span>bien(s) trouves</span>
        {activeFilterCount > 0 && <em>{activeFilterCount} filtre(s)</em>}
      </div>

      <div className="filter-card">
        <h3>Recherche</h3>
        <label className="filter-label" htmlFor="property-keyword">Mot cle</label>
        <div className="location-search-input">
          <FaSearch />
          <input
            id="property-keyword"
            type="search"
            value={searchKeywordValue}
            onChange={(event) => updatePropertyFilter('q', event.target.value)}
            placeholder="Titre, ville, source"
          />
        </div>

        <label className="filter-label" htmlFor="property-location">Localisation</label>
        <div className="location-search-input">
          <FaMapMarkerAlt />
          <input
            id="property-location"
            type="search"
            value={searchLocationValue}
            onChange={(event) => updatePropertyFilter('location', event.target.value)}
            placeholder="Ville ou region"
          />
        </div>
      </div>

      <div className="filter-card">
        <h3>Budget</h3>
        <div className="budget-values">
          <span>{formatCompactPrice(priceStats.min)}</span>
          <span>{formatCompactPrice(priceStats.max)}</span>
        </div>
        <div className="filter-input-grid">
          <label className="filter-label" htmlFor="property-min-price">
            Min
            <input
              id="property-min-price"
              className="filter-number-input"
              type="number"
              min="0"
              step="1000"
              value={minPriceInput}
              onChange={(event) => updatePropertyFilter('minPrice', event.target.value)}
              placeholder="0"
            />
          </label>
          <label className="filter-label" htmlFor="property-max-price">
            Max
            <input
              id="property-max-price"
              className="filter-number-input"
              type="number"
              min="0"
              step="1000"
              value={maxPriceInput}
              onChange={(event) => updatePropertyFilter('maxPrice', event.target.value)}
              placeholder="900000"
            />
          </label>
        </div>
      </div>
    </aside>
  );
}

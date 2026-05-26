import React from 'react';
import { FaMapMarkerAlt, FaSearch, FaSlidersH, FaTimes } from 'react-icons/fa';
import { DEFAULT_PROPERTY_SORT, PROPERTY_SORT_OPTIONS, formatCompactPrice } from '../utils/propertyFormatters';

export default function PropertiesFilters({
  activeFilterCount,
  clearPropertyFilters,
  currentUserRole,
  favoritesOnly,
  filteredCount,
  hasImageOnly,
  maxPriceInput,
  minPriceInput,
  priceStats,
  propertyTypeOptions,
  searchKeywordValue,
  searchLocationValue,
  selectedPropertyType,
  selectedSource,
  sortOrder,
  sourceOptions,
  updateFavoritesFilter,
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
        <h3>Type de bien</h3>
        <div className="filter-type-list">
          {propertyTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-type-btn ${
                (option.value === 'all' && !selectedPropertyType) ||
                selectedPropertyType.toLowerCase() === option.value.toLowerCase()
                  ? 'is-active'
                  : ''
              }`}
              onClick={() => updatePropertyFilter('type', option.value)}
            >
              <span>{option.label}</span>
              <strong>{option.count}</strong>
            </button>
          ))}
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

      <div className="filter-card">
        <h3>Source</h3>
        <select
          className="filter-select"
          value={selectedSource || 'all'}
          onChange={(event) => updatePropertyFilter('source', event.target.value)}
        >
          <option value="all">Toutes les sources</option>
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-card">
        <h3>Options</h3>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={hasImageOnly}
            onChange={(event) => updatePropertyFilter('hasImage', event.target.checked ? '1' : '')}
          />
          <span>Avec images</span>
        </label>

        {currentUserRole === 'client' && (
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => updateFavoritesFilter(event.target.checked)}
            />
            <span>Mes favoris</span>
          </label>
        )}
      </div>

      <div className="filter-card">
        <h3>Tri</h3>
        <select
          className="filter-select"
          value={sortOrder}
          onChange={(event) => updatePropertyFilter('sort', event.target.value)}
        >
          {PROPERTY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaBath, FaBed, FaExternalLinkAlt, FaMapMarkerAlt, FaRulerCombined, FaSearch, FaStar, FaSyncAlt } from 'react-icons/fa';
import '../styles/Properties.css';

const TYPE_LABELS = ['Appartement', 'Villa', 'Maison', 'Terrain', 'Studio', 'Bureau'];
const DEFAULT_AMENITIES = ['Garden', 'Gym', 'Garage', 'Pool'];
const PROPERTIES_PER_PAGE = 25;
const DEMO_PROPERTIES = [
  {
    id: 'demo-1',
    title: 'Villa moderne avec jardin',
    price_value: 452000,
    price_raw: '452000 DT',
    location_raw: 'Ariana, Tunisie',
    city: 'Ariana',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    description: 'Villa lumineuse avec 4 chambres, garage et grand jardin.',
    source: 'demo',
    url: '#',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Appartement standing proche centre',
    price_value: 278000,
    price_raw: '278000 DT',
    location_raw: 'La Marsa, Tunis',
    city: 'Tunis',
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=80',
    description: 'Appartement bien situe avec balcon et cuisine equipee.',
    source: 'demo',
    url: '#',
    scraped_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Maison familiale avec terrasse',
    price_value: 367000,
    price_raw: '367000 DT',
    location_raw: 'Sousse, Tunisie',
    city: 'Sousse',
    image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80',
    description: 'Maison confortable avec espace exterieur et bonne orientation.',
    source: 'demo',
    url: '#',
    scraped_at: new Date().toISOString(),
  },
];

const inferTypeFromTitle = (title) => {
  const lower = (title || '').toLowerCase();
  if (lower.includes('appartement')) return 'Appartement';
  if (lower.includes('villa')) return 'Villa';
  if (lower.includes('maison')) return 'Maison';
  if (lower.includes('terrain')) return 'Terrain';
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('bureau') || lower.includes('local')) return 'Bureau';
  return 'Maison';
};

const inferRoomsFromTitle = (title, min, max) => {
  const base = Math.max(1, Number(min || 1));
  const span = Math.max(1, Number(max || min || 1));
  const source = (title || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return base + (source % span);
};

const buildRating = (id) => {
  const base = Number(String(id || 1).replace(/\D/g, '').slice(-2) || 1);
  const rating = 4 + ((base % 10) / 20);
  return Math.min(4.9, Math.max(4.0, rating)).toFixed(1);
};

const Properties = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusedId, setFocusedId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [locationKeyword, setLocationKeyword] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [activeAmenities, setActiveAmenities] = useState(['Garden']);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000000);
  const [currentPage, setCurrentPage] = useState(1);

  const apiBaseUrl =
    process.env.REACT_APP_API_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : 'http://localhost:5000');

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${apiBaseUrl}/api/properties?limit=5000`, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      setProperties(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setProperties(DEMO_PROPERTIES);
      setError('Mode demo actif: backend indisponible (port 5000).');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();
  const searchLocation = (searchParams.get('location') || '').trim().toLowerCase();
  const searchType = (searchParams.get('type') || '').trim().toLowerCase();
  const focusId = (searchParams.get('focusId') || '').trim();

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const rawLocation = (property.location_raw || '').toLowerCase();
      const source = (property.source || '').toLowerCase();
      const type = inferTypeFromTitle(property.title);
      const priceValue = Number(property.price_value);
      const normalizedPrice = Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null;

      const matchesQuery =
        !searchQuery ||
        title.includes(searchQuery) ||
        city.includes(searchQuery) ||
        rawLocation.includes(searchQuery) ||
        source.includes(searchQuery);

      const matchesLocation =
        !searchLocation ||
        city.includes(searchLocation) ||
        rawLocation.includes(searchLocation);

      const matchesType = !searchType || title.includes(searchType);
      const matchesSidebarLocation =
        !locationKeyword ||
        city.includes(locationKeyword.toLowerCase()) ||
        rawLocation.includes(locationKeyword.toLowerCase());

      const matchesSidebarCity =
        selectedCities.length === 0 ||
        selectedCities.some((selectedCity) => city === selectedCity.toLowerCase());

      const matchesSidebarType = selectedTypes.length === 0 || selectedTypes.includes(type);

      const matchesPrice =
        !normalizedPrice || (normalizedPrice >= priceMin && normalizedPrice <= priceMax);

      return (
        matchesQuery &&
        matchesLocation &&
        matchesType &&
        matchesSidebarLocation &&
        matchesSidebarCity &&
        matchesSidebarType &&
        matchesPrice
      );
    });
  }, [
    properties,
    searchQuery,
    searchLocation,
    searchType,
    locationKeyword,
    selectedCities,
    selectedTypes,
    priceMin,
    priceMax,
  ]);

  const totalPages = useMemo(() => {
    if (!filteredProperties.length) return 1;
    return Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  }, [filteredProperties.length]);

  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * PROPERTIES_PER_PAGE;
    return filteredProperties.slice(start, start + PROPERTIES_PER_PAGE);
  }, [currentPage, filteredProperties]);

  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfWindow);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = endPage - maxVisiblePages + 1;
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [currentPage, totalPages]);

  const visibleRangeStart = filteredProperties.length === 0 ? 0 : (currentPage - 1) * PROPERTIES_PER_PAGE + 1;
  const visibleRangeEnd = Math.min(currentPage * PROPERTIES_PER_PAGE, filteredProperties.length);

  const allPriceValues = useMemo(() => {
    return properties
      .map((item) => Number(item.price_value))
      .filter((value) => Number.isFinite(value) && value > 0);
  }, [properties]);

  const maxDetectedPrice = useMemo(() => {
    if (allPriceValues.length === 0) return 1000000;
    return Math.max(...allPriceValues, 1000000);
  }, [allPriceValues]);

  const cityOptions = useMemo(() => {
    const map = new Map();
    filteredProperties.forEach((property) => {
      const city = (property.city || property.location_raw || '').trim();
      if (!city) return;
      const key = city.toLowerCase();
      if (!map.has(key)) map.set(key, city);
    });
    return Array.from(map.values()).slice(0, 8);
  }, [filteredProperties]);

  const selectedProperty = useMemo(() => {
    if (!paginatedProperties.length) return null;
    const found = paginatedProperties.find((property) => String(property.id) === String(selectedPropertyId));
    return found || paginatedProperties[0];
  }, [paginatedProperties, selectedPropertyId]);

  useEffect(() => {
    if (selectedProperty) {
      setSelectedPropertyId(selectedProperty.id);
    }
  }, [selectedProperty]);

  useEffect(() => {
    setCurrentPage(1);
  }, [location.search, locationKeyword, selectedCities, selectedTypes, priceMin, priceMax]);

  useEffect(() => {
    setPriceMin(0);
    setPriceMax(maxDetectedPrice);
  }, [maxDetectedPrice]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (loading || !focusId) return;

    const focusedPropertyIndex = filteredProperties.findIndex(
      (property) => String(property.id) === String(focusId),
    );

    if (focusedPropertyIndex === -1) return;

    const focusPage = Math.floor(focusedPropertyIndex / PROPERTIES_PER_PAGE) + 1;
    if (focusPage !== currentPage) {
      setCurrentPage(focusPage);
      return;
    }

    const selector = `[data-property-id="${focusId}"]`;
    const target = document.querySelector(selector);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedId(String(focusId));
    setSelectedPropertyId(focusId);

    const timeoutId = setTimeout(() => setFocusedId(null), 2200);
    return () => clearTimeout(timeoutId);
  }, [currentPage, filteredProperties, focusId, loading]);

  const formatPrice = (property) => {
    const numeric = Number(property.price_value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
    }
    return property.price_raw || 'Prix non communique';
  };

  const formatDate = (value) => {
    if (!value) return 'Date non disponible';
    return new Date(value).toLocaleDateString('fr-TN');
  };

  const formatBudget = (value) => {
    return `${new Intl.NumberFormat('fr-TN').format(Math.round(value || 0))} DT`;
  };

  const openSimulationForProperty = (property) => {
    const params = new URLSearchParams();
    if (property.id) params.set('propertyId', String(property.id));
    if (property.title) params.set('title', property.title);
    if (property.location_raw || property.city) params.set('location', property.location_raw || property.city);
    if (property.price_value) params.set('price', String(property.price_value));
    navigate(`/credit-simulation?${params.toString()}`);
  };

  const toggleCity = (city) => {
    setSelectedCities((prev) => {
      const exists = prev.some((item) => item.toLowerCase() === city.toLowerCase());
      if (exists) return prev.filter((item) => item.toLowerCase() !== city.toLowerCase());
      return [...prev, city];
    });
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) return prev.filter((item) => item !== type);
      return [...prev, type];
    });
  };

  const toggleAmenity = (amenity) => {
    setActiveAmenities((prev) => {
      if (prev.includes(amenity)) return prev.filter((item) => item !== amenity);
      return [...prev, amenity];
    });
  };

  return (
    <div className="properties-page marketplace-mode">
      <div className="marketplace-shell">
        <aside className="filters-panel">
          <div className="panel-title-row">
            <h2>Custom Filter</h2>
            <button type="button" className="clear-btn" onClick={() => {
              setSelectedCities([]);
              setSelectedTypes([]);
              setActiveAmenities(['Garden']);
              setLocationKeyword('');
              setPriceMin(0);
              setPriceMax(maxDetectedPrice);
            }}>
              Clear all
            </button>
          </div>

          <div className="filter-card">
            <h3>Location</h3>
            <div className="location-search-input">
              <FaSearch />
              <input
                type="text"
                value={locationKeyword}
                onChange={(event) => setLocationKeyword(event.target.value)}
                placeholder="Type city or area"
              />
            </div>
            <div className="checkbox-list">
              {cityOptions.length === 0 && <span className="muted">No city detected</span>}
              {cityOptions.map((city) => (
                <label key={city} className="check-row">
                  <input
                    type="checkbox"
                    checked={selectedCities.some((item) => item.toLowerCase() === city.toLowerCase())}
                    onChange={() => toggleCity(city)}
                  />
                  <span>{city}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-card">
            <h3>Price Range</h3>
            <div className="budget-values">
              <span>{formatBudget(priceMin)}</span>
              <span>{formatBudget(priceMax)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={maxDetectedPrice}
              value={priceMin}
              className="range-input"
              onChange={(event) => {
                const next = Number(event.target.value);
                setPriceMin(next <= priceMax ? next : priceMax);
              }}
            />
            <input
              type="range"
              min="0"
              max={maxDetectedPrice}
              value={priceMax}
              className="range-input"
              onChange={(event) => {
                const next = Number(event.target.value);
                setPriceMax(next >= priceMin ? next : priceMin);
              }}
            />
          </div>

          <div className="filter-card">
            <h3>Type Of Places</h3>
            <div className="checkbox-list">
              {TYPE_LABELS.map((type) => (
                <label key={type} className="check-row">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-card">
            <h3>Amenities</h3>
            <div className="chip-row">
              {DEFAULT_AMENITIES.map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  className={`amenity-chip ${activeAmenities.includes(amenity) ? 'is-active' : ''}`}
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="cards-panel">
          <header className="cards-header">
            <div>
              <p className="cards-title-label">Bien immobilier</p>
              <h1>Explore the best properties</h1>
              <p>
                {loading
                  ? 'Loading data...'
                  : `${visibleRangeStart}-${visibleRangeEnd} of ${filteredProperties.length} property card(s)`}
              </p>
            </div>
            <button type="button" onClick={fetchProperties} className="refresh-btn">
              <FaSyncAlt /> Refresh
            </button>
          </header>

          {error && <div className="properties-warning">{error}</div>}
          {loading && <div className="properties-loading">Chargement des biens nettoyes...</div>}

          {!loading && filteredProperties.length > 0 && (
            <>
              <div className="properties-grid new-grid">
                {paginatedProperties.map((property) => {
                  const type = inferTypeFromTitle(property.title);
                  const active = String(selectedProperty?.id) === String(property.id);
                  return (
                    <article
                      className={`property-card compact-card ${active ? 'is-active' : ''} ${focusedId === String(property.id) ? 'property-card--focused' : ''}`}
                      key={property.id}
                      data-property-id={property.id}
                      onClick={() => setSelectedPropertyId(property.id)}
                    >
                      <div className="property-card-image-wrap">
                        {property.image ? (
                          <img src={property.image} alt={property.title || 'Bien immobilier'} className="property-card-image" loading="lazy" />
                        ) : (
                          <div className="property-card-image-placeholder">Image non disponible</div>
                        )}
                        <span className="property-badge">{type}</span>
                      </div>

                      <div className="property-card-body">
                        <h3>{property.title || 'Titre non disponible'}</h3>
                        <p className="property-card-location">
                          <FaMapMarkerAlt /> {property.location_raw || property.city || 'Localisation non disponible'}
                        </p>
                        <div className="property-card-footer-row">
                          <p className="property-card-price">{formatPrice(property)}</p>
                          <span className="rating-pill"><FaStar /> {buildRating(property.id)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav className="properties-pagination" aria-label="Property pagination">
                  <button
                    type="button"
                    className="pagination-btn pagination-btn--nav"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <div className="pagination-pages">
                    {visiblePageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`pagination-btn ${pageNumber === currentPage ? 'is-active' : ''}`}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="pagination-btn pagination-btn--nav"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}

          {!loading && filteredProperties.length === 0 && (
            <div className="properties-empty">Aucun bien ne correspond a votre recherche.</div>
          )}
        </section>

        <aside className="details-panel">
          {selectedProperty ? (
            <>
              <div className="details-media">
                {selectedProperty.image ? (
                  <img src={selectedProperty.image} alt={selectedProperty.title || 'Bien immobilier'} className="details-main-image" />
                ) : (
                  <div className="details-main-image image-fallback">Image non disponible</div>
                )}
                <div className="details-thumbs">
                  {[1, 2, 3].map((index) => (
                    <div className="thumb" key={`${selectedProperty.id}-${index}`}>
                      {selectedProperty.image ? (
                        <img src={selectedProperty.image} alt={`thumb-${index}`} />
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="details-headline">
                <h2>{selectedProperty.title || 'Property title'}</h2>
                <p>{selectedProperty.location_raw || selectedProperty.city || 'Location not available'}</p>
                <div className="details-price">{formatPrice(selectedProperty)}</div>
              </div>

              <div className="details-tabs">
                <span className="is-active">Overview</span>
                <span>Reviews</span>
                <span>About</span>
              </div>

              <div className="details-description">
                <h4>Description</h4>
                <p>{selectedProperty.description || 'Description non disponible pour ce bien.'}</p>
              </div>

              <div className="details-stats">
                <span><FaBed /> {inferRoomsFromTitle(selectedProperty.title, 2, 4)} Beds</span>
                <span><FaBath /> {inferRoomsFromTitle(selectedProperty.title, 1, 3)} Baths</span>
                <span><FaRulerCombined /> {inferRoomsFromTitle(selectedProperty.title, 90, 150)} m2</span>
              </div>

              <div className="details-actions">
                {selectedProperty.url ? (
                  <a href={selectedProperty.url} target="_blank" rel="noreferrer" className="btn-light">
                    View Source <FaExternalLinkAlt />
                  </a>
                ) : (
                  <span className="btn-light is-disabled">Source not available</span>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openSimulationForProperty(selectedProperty)}
                >
                  Simulate
                </button>
              </div>

              <div className="mini-map">
                <span className="pin pin-a" />
                <span className="pin pin-b" />
                <span className="pin pin-c" />
                <span className="map-label">{selectedProperty.city || 'Tunisie'}</span>
              </div>
              <p className="details-date">Updated: {formatDate(selectedProperty.scraped_at)}</p>
            </>
          ) : (
            <div className="properties-empty">No property selected yet.</div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Properties;

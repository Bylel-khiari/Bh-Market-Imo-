import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaSyncAlt } from 'react-icons/fa';
import { addFavoriteApi, removeFavoriteApi, submitPropertyReportApi } from '../../lib/auth';
import PropertiesFilters from './components/PropertiesFilters';
import PropertiesGrid from './components/PropertiesGrid';
import PropertiesMapSection from './components/PropertiesMapSection';
import useProperties from './hooks/useProperties';
import {
  DEFAULT_PROPERTY_SORT,
  PROPERTY_SORT_OPTIONS,
  PROPERTY_TYPE_ORDER,
  PROPERTIES_PER_PAGE,
  REPORT_CATEGORY_OPTIONS,
  getPropertyImages,
  inferTypeFromTitle,
  toPositiveNumberFilter,
} from './utils/propertyFormatters';
import '../../styles/Properties.css';

const Properties = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    authSession,
    currentUserRole,
    error,
    favoriteError,
    favoriteIds,
    favoriteLoading,
    favoriteNotice,
    fetchProperties,
    loading,
    properties,
    setFavoriteError,
    setFavoriteIds,
    setFavoriteNotice,
  } = useProperties();
  const [focusedId, setFocusedId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [favoritePendingId, setFavoritePendingId] = useState(null);
  const [reportModalProperty, setReportModalProperty] = useState(null);
  const [reportCategory, setReportCategory] = useState('cannot_open_site');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchKeywordValue = (searchParams.get('q') || '').trim();
  const searchLocationValue = (searchParams.get('location') || '').trim();
  const selectedPropertyType = (searchParams.get('type') || '').trim();
  const selectedSource = (searchParams.get('source') || '').trim();
  const minPriceInput = (searchParams.get('minPrice') || '').trim();
  const maxPriceInput = (searchParams.get('maxPrice') || '').trim();
  const searchQuery = searchKeywordValue.toLowerCase();
  const searchLocation = searchLocationValue.toLowerCase();
  const searchType = selectedPropertyType.toLowerCase();
  const sourceFilter = selectedSource.toLowerCase();
  const minPriceFilter = toPositiveNumberFilter(minPriceInput);
  const maxPriceFilter = toPositiveNumberFilter(maxPriceInput);
  const hasImageOnly = searchParams.get('hasImage') === '1';
  const requestedSortOrder = searchParams.get('sort') || DEFAULT_PROPERTY_SORT;
  const sortOrder = PROPERTY_SORT_OPTIONS.some((option) => option.value === requestedSortOrder)
    ? requestedSortOrder
    : DEFAULT_PROPERTY_SORT;
  const focusId = (searchParams.get('focusId') || '').trim();
  const favoritesOnly = searchParams.get('favorites') === '1';

  const favoriteIdSet = useMemo(
    () => new Set(favoriteIds.map((id) => String(id))),
    [favoriteIds],
  );

  const updatePropertyFilter = useCallback((key, value) => {
    const params = new URLSearchParams(location.search);
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    params.delete('focusId');

    if (
      normalizedValue === '' ||
      normalizedValue == null ||
      normalizedValue === false ||
      normalizedValue === 'all' ||
      (key === 'sort' && normalizedValue === DEFAULT_PROPERTY_SORT)
    ) {
      params.delete(key);
    } else {
      params.set(key, String(normalizedValue));
    }

    const query = params.toString();
    navigate(query ? `/properties?${query}` : '/properties', { replace: true });
  }, [location.search, navigate]);

  const clearPropertyFilters = useCallback(() => {
    navigate('/properties', { replace: true });
  }, [navigate]);

  const propertyTypeOptions = useMemo(() => {
    const counts = new Map();
    properties.forEach((property) => {
      const type = inferTypeFromTitle(property.title);
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    const orderedTypes = [
      ...PROPERTY_TYPE_ORDER,
      ...Array.from(counts.keys()).filter((type) => !PROPERTY_TYPE_ORDER.includes(type)),
    ];

    return [
      { value: 'all', label: 'Tous', count: properties.length },
      ...orderedTypes
        .filter((type) => counts.has(type))
        .map((type) => ({ value: type, label: type, count: counts.get(type) })),
    ];
  }, [properties]);

  const sourceOptions = useMemo(() => {
    const counts = new Map();
    properties.forEach((property) => {
      const source = String(property.source || 'Source inconnue').trim();
      counts.set(source, (counts.get(source) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort(([sourceA], [sourceB]) => sourceA.localeCompare(sourceB, 'fr'))
      .map(([source, count]) => ({ value: source, label: source, count }));
  }, [properties]);

  const priceStats = useMemo(() => {
    const prices = properties
      .map((property) => Number(property.price_value))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (!prices.length) {
      return { min: null, max: null };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [properties]);

  const activeFilterCount = [
    searchKeywordValue,
    searchLocationValue,
    selectedPropertyType,
    selectedSource,
    minPriceInput,
    maxPriceInput,
    hasImageOnly,
    favoritesOnly,
  ].filter(Boolean).length;

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const rawLocation = (property.location_raw || '').toLowerCase();
      const source = (property.source || '').toLowerCase();
      const type = inferTypeFromTitle(property.title).toLowerCase();
      const numericPrice = Number(property.price_value);
      const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;
      const hasImages = getPropertyImages(property).length > 0;

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

      const matchesType = !searchType || type === searchType || title.includes(searchType);
      const matchesSource = !sourceFilter || source === sourceFilter;
      const matchesMinPrice = !minPriceFilter || (hasPrice && numericPrice >= minPriceFilter);
      const matchesMaxPrice = !maxPriceFilter || (hasPrice && numericPrice <= maxPriceFilter);
      const matchesImages = !hasImageOnly || hasImages;
      const matchesFavorites = !favoritesOnly || favoriteIdSet.has(String(property.id));

      return (
        matchesQuery &&
        matchesLocation &&
        matchesType &&
        matchesSource &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesImages &&
        matchesFavorites
      );
    });
  }, [
    properties,
    searchQuery,
    searchLocation,
    searchType,
    sourceFilter,
    minPriceFilter,
    maxPriceFilter,
    hasImageOnly,
    favoritesOnly,
    favoriteIdSet,
  ]);

  const sortedProperties = useMemo(() => {
    const getComparablePrice = (property) => {
      const price = Number(property.price_value);
      return Number.isFinite(price) && price > 0 ? price : null;
    };

    return [...filteredProperties].sort((propertyA, propertyB) => {
      if (sortOrder === 'price_asc' || sortOrder === 'price_desc') {
        const priceA = getComparablePrice(propertyA);
        const priceB = getComparablePrice(propertyB);

        if (priceA == null && priceB == null) return 0;
        if (priceA == null) return 1;
        if (priceB == null) return -1;

        return sortOrder === 'price_asc' ? priceA - priceB : priceB - priceA;
      }

      if (sortOrder === 'title_asc') {
        return String(propertyA.title || '').localeCompare(String(propertyB.title || ''), 'fr');
      }

      if (sortOrder === 'source_asc') {
        const sourceComparison = String(propertyA.source || '').localeCompare(String(propertyB.source || ''), 'fr');
        if (sourceComparison !== 0) return sourceComparison;
      }

      const dateA = new Date(propertyA.scraped_at || 0).getTime();
      const dateB = new Date(propertyB.scraped_at || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredProperties, sortOrder]);

  const totalPages = useMemo(() => {
    if (!filteredProperties.length) return 1;
    return Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  }, [filteredProperties.length]);

  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * PROPERTIES_PER_PAGE;
    return sortedProperties.slice(start, start + PROPERTIES_PER_PAGE);
  }, [currentPage, sortedProperties]);

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
  }, [location.search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (loading || !focusId) return undefined;

    const focusedPropertyIndex = sortedProperties.findIndex(
      (property) => String(property.id) === String(focusId),
    );

    if (focusedPropertyIndex === -1) return undefined;

    const focusPage = Math.floor(focusedPropertyIndex / PROPERTIES_PER_PAGE) + 1;
    if (focusPage !== currentPage) {
      setCurrentPage(focusPage);
      return undefined;
    }

    const selector = `[data-property-id="${focusId}"]`;
    const target = document.querySelector(selector);
    if (!target) return undefined;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedId(String(focusId));
    setSelectedPropertyId(focusId);

    const timeoutId = setTimeout(() => setFocusedId(null), 2200);
    return () => clearTimeout(timeoutId);
  }, [currentPage, focusId, loading, sortedProperties]);

  const openSimulationForProperty = (property) => {
    const params = new URLSearchParams();
    if (property.id) params.set('propertyId', String(property.id));
    if (property.title) params.set('title', property.title);
    if (property.location_raw || property.city) params.set('location', property.location_raw || property.city);
    if (property.price_value) params.set('price', String(property.price_value));
    navigate(`/credit-simulation?${params.toString()}`);
  };

  const updateFavoritesFilter = (nextValue) => {
    updatePropertyFilter('favorites', nextValue ? '1' : '');
  };

  const toggleFavorite = async (event, property) => {
    event.stopPropagation();
    setFavoriteError('');
    setFavoriteNotice('');

    if (!authSession?.token) {
      navigate('/login', { state: { from: `/properties${location.search}` } });
      return;
    }

    if (currentUserRole !== 'client') {
      setFavoriteError('Les favoris sont disponibles uniquement pour les comptes client.');
      return;
    }

    const propertyId = String(property.id);
    const isFavorite = favoriteIdSet.has(propertyId);
    setFavoritePendingId(propertyId);

    setFavoriteIds((prev) => {
      if (isFavorite) {
        return prev.filter((id) => String(id) !== propertyId);
      }

      return prev.some((id) => String(id) === propertyId) ? prev : [...prev, propertyId];
    });

    try {
      if (isFavorite) {
        await removeFavoriteApi(property.id, authSession.token);
      } else {
        await addFavoriteApi(property.id, authSession.token);
      }

      setFavoriteNotice(
        isFavorite
          ? 'Le bien a Ã©tÃ© retirÃ© de vos favoris.'
          : 'Le bien a Ã©tÃ© ajoutÃ© Ã  vos favoris.',
      );
    } catch (err) {
      console.error('Impossible de mettre Ã  jour le favori :', err);

      setFavoriteIds((prev) => {
        if (isFavorite) {
          return prev.some((id) => String(id) === propertyId) ? prev : [...prev, propertyId];
        }

        return prev.filter((id) => String(id) !== propertyId);
      });

      setFavoriteError(err.message || 'Impossible de mettre Ã  jour ce favori.');
    } finally {
      setFavoritePendingId(null);
    }
  };

  const openReportModal = (property, event) => {
    if (event) {
      event.stopPropagation();
    }

    setReportError('');
    setReportNotice('');

    if (!authSession?.token) {
      navigate('/login', { state: { from: `/properties${location.search}` } });
      return;
    }

    if (currentUserRole !== 'client') {
      setReportError('Le signalement est disponible uniquement pour les comptes client.');
      return;
    }

    setReportCategory('cannot_open_site');
    setReportMessage('');
    setReportModalProperty(property);
  };

  const closeReportModal = () => {
    if (reportSubmitting) return;
    setReportModalProperty(null);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportModalProperty) return;

    const trimmedMessage = reportMessage.trim();
    if (trimmedMessage.length < 6) {
      setReportError('Veuillez dÃ©crire le problÃ¨me avec au moins 6 caractÃ¨res.');
      return;
    }

    try {
      setReportSubmitting(true);
      setReportError('');

      await submitPropertyReportApi(
        reportModalProperty.id,
        {
          category: reportCategory,
          message: trimmedMessage,
        },
        authSession.token,
      );

      setReportNotice('Votre signalement a Ã©tÃ© envoyÃ© Ã  lâ€™Ã©quipe admin.');
      setReportModalProperty(null);
      setReportMessage('');
      setReportCategory('cannot_open_site');
    } catch (err) {
      console.error('Impossible dâ€™envoyer le signalement :', err);
      setReportError(err.message || 'Impossible dâ€™envoyer le signalement.');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="properties-page marketplace-mode">
      <div className="marketplace-shell">
        <PropertiesFilters
          activeFilterCount={activeFilterCount}
          clearPropertyFilters={clearPropertyFilters}
          currentUserRole={currentUserRole}
          favoritesOnly={favoritesOnly}
          filteredCount={filteredProperties.length}
          hasImageOnly={hasImageOnly}
          maxPriceInput={maxPriceInput}
          minPriceInput={minPriceInput}
          priceStats={priceStats}
          propertyTypeOptions={propertyTypeOptions}
          searchKeywordValue={searchKeywordValue}
          searchLocationValue={searchLocationValue}
          selectedPropertyType={selectedPropertyType}
          selectedSource={selectedSource}
          sortOrder={sortOrder}
          sourceOptions={sourceOptions}
          updateFavoritesFilter={updateFavoritesFilter}
          updatePropertyFilter={updatePropertyFilter}
        />

        <section className="cards-panel">
          <header className="cards-header">
            <div>
              <p className="cards-title-label">Bien immobilier</p>
              <h1>{favoritesOnly ? 'Vos biens favoris' : 'Explorez les meilleurs biens'}</h1>
              <p>
                {loading
                  ? 'Chargement des donnÃ©es...'
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
              Connectez-vous pour retrouver vos biens favoris sauvegardÃ©s.
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
              onReportProperty={openReportModal}
              onSelectProperty={setSelectedPropertyId}
              onToggleFavorite={toggleFavorite}
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
                ? 'Aucun bien favori trouvÃ© pour le moment.'
                : 'Aucun bien ne correspond Ã  votre recherche.'}
            </div>
          )}
        </section>

        <PropertiesMapSection
          favoriteIdSet={favoriteIdSet}
          favoritePendingId={favoritePendingId}
          onOpenSimulation={openSimulationForProperty}
          onReportProperty={openReportModal}
          onToggleFavorite={toggleFavorite}
          selectedProperty={selectedProperty}
        />
      </div>

      {reportModalProperty && (
        <div className="properties-modal-backdrop" role="dialog" aria-modal="true" onClick={closeReportModal}>
          <div className="properties-report-modal" onClick={(event) => event.stopPropagation()}>
            <div className="properties-report-head">
              <h3>Signaler un problÃ¨me</h3>
              <button
                type="button"
                className="properties-report-close"
                onClick={closeReportModal}
                disabled={reportSubmitting}
                aria-label="Fermer"
              >
                x
              </button>
            </div>

            <p className="properties-report-context">
              Bien concernÃ© : <strong>{reportModalProperty.title || `#${reportModalProperty.id}`}</strong>
            </p>

            <form className="properties-report-form" onSubmit={submitReport}>
              <label htmlFor="report-category">CatÃ©gorie du problÃ¨me</label>
              <select
                id="report-category"
                value={reportCategory}
                onChange={(event) => setReportCategory(event.target.value)}
                disabled={reportSubmitting}
              >
                {REPORT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="report-message">DÃ©tails</label>
              <textarea
                id="report-message"
                rows={5}
                value={reportMessage}
                onChange={(event) => setReportMessage(event.target.value)}
                placeholder="Expliquez le probleme rencontre avec cette annonce."
                disabled={reportSubmitting}
              />

              {reportError && <p className="properties-report-error">{reportError}</p>}

              <div className="properties-report-actions">
                <button
                  type="button"
                  className="btn-light"
                  onClick={closeReportModal}
                  disabled={reportSubmitting}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={reportSubmitting}>
                  {reportSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DEFAULT_PROPERTY_SORT,
  PROPERTY_SORT_OPTIONS,
  PROPERTY_TYPE_ORDER,
  PROPERTIES_PER_PAGE,
  getPropertyImages,
  inferTypeFromTitle,
  toPositiveNumberFilter,
} from '../utils/propertyFormatters';

export default function usePropertyCatalog({ favoriteIds, loading, properties }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [focusedId, setFocusedId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const updateFavoritesFilter = useCallback((nextValue) => {
    updatePropertyFilter('favorites', nextValue ? '1' : '');
  }, [updatePropertyFilter]);

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

  const openSimulationForProperty = useCallback((property) => {
    const params = new URLSearchParams();
    if (property.id) params.set('propertyId', String(property.id));
    if (property.title) params.set('title', property.title);
    if (property.location_raw || property.city) params.set('location', property.location_raw || property.city);
    if (property.price_value) params.set('price', String(property.price_value));
    navigate(`/credit-simulation?${params.toString()}`);
  }, [navigate]);

  return {
    activeFilterCount,
    clearPropertyFilters,
    currentPage,
    favoriteIdSet,
    favoritesOnly,
    filteredProperties,
    focusedId,
    hasImageOnly,
    locationSearch: location.search,
    maxPriceInput,
    minPriceInput,
    openSimulationForProperty,
    paginatedProperties,
    priceStats,
    propertyTypeOptions,
    searchKeywordValue,
    searchLocationValue,
    selectedProperty,
    selectedPropertyType,
    selectedSource,
    setCurrentPage,
    setSelectedPropertyId,
    sortOrder,
    sourceOptions,
    totalPages,
    updateFavoritesFilter,
    updatePropertyFilter,
    visiblePageNumbers,
    visibleRangeEnd,
    visibleRangeStart,
  };
}

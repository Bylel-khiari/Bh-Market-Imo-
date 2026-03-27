import { useEffect, useMemo, useState } from 'react';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { groupListingsByGovernorate, normalizeGovernorateName } from '../lib/mapDataAdapter';

const FALLBACK_GEOJSON_URL =
  'https://raw.githubusercontent.com/riatelab/tunisie/refs/heads/master/data/TN-gouvernorats.geojson';

function getFeatureName(feature) {
  const props = feature?.properties ?? {};
  return (
    props.name ||
    props.NAME_1 ||
    props.nom ||
    props.governorate ||
    props.lib ||
    props.shapeName ||
    props.NAME ||
    'Unknown'
  );
}

function computeMarkerOffsets(items) {
  return items.map((item, index) => {
    const angle = (index / Math.max(1, items.length)) * Math.PI * 2;
    const radius = Math.min(16, 4 + index * 2.6);
    return {
      ...item,
      offsetX: Math.cos(angle) * radius,
      offsetY: Math.sin(angle) * radius,
    };
  });
}

export default function TunisiaDynastyMap({
  geoJsonUrl = FALLBACK_GEOJSON_URL,
  listings = [],
  width = 980,
  height = 700,
  title = 'Tunisia Prime Residences',
  subtitle = 'Dynasty-inspired real estate atlas',
  selectedGovernorate: selectedGovernorateProp,
  onGovernorateSelect,
  onListingSelect,
}) {
  const [geoJson, setGeoJson] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hoveredGovernorate, setHoveredGovernorate] = useState(null);
  const [selectedGovernorateState, setSelectedGovernorateState] = useState(null);

  const selectedGovernorate = selectedGovernorateProp ?? selectedGovernorateState;

  useEffect(() => {
    const controller = new AbortController();

    async function loadGeoJson() {
      try {
        setStatus('loading');
        setErrorMessage('');

        const response = await fetch(geoJsonUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`GeoJSON request failed with ${response.status}`);
        }

        const data = await response.json();
        if (!data?.features?.length) {
          throw new Error('GeoJSON loaded but no features were found.');
        }

        setGeoJson(data);
        setStatus('ready');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setStatus('error');
        setErrorMessage(error.message || 'Unable to load Tunisia GeoJSON.');
      }
    }

    loadGeoJson();
    return () => controller.abort();
  }, [geoJsonUrl]);

  const listingsByGovernorate = useMemo(() => groupListingsByGovernorate(listings), [listings]);

  const mapModel = useMemo(() => {
    if (!geoJson) return null;

    const projection = geoMercator().fitExtent(
      [
        [36, 28],
        [width - 36, height - 42],
      ],
      geoJson
    );

    const pathGenerator = geoPath(projection);

    const features = geoJson.features.map((feature) => {
      const rawName = getFeatureName(feature);
      const normalizedName = normalizeGovernorateName(rawName);
      const centroid = projection(geoCentroid(feature));
      const count = listingsByGovernorate[normalizedName]?.length ?? 0;

      return {
        feature,
        rawName,
        normalizedName,
        centroid,
        count,
        path: pathGenerator(feature),
      };
    });

    return { projection, features };
  }, [geoJson, width, height, listingsByGovernorate]);

  const selectedGovernorateData = useMemo(() => {
    if (!selectedGovernorate) return null;
    return mapModel?.features.find((item) => item.normalizedName === selectedGovernorate) || null;
  }, [mapModel, selectedGovernorate]);

  const visibleListings = useMemo(() => {
    if (!selectedGovernorate) return listings.slice(0, 8);
    return listingsByGovernorate[selectedGovernorate] || [];
  }, [listings, listingsByGovernorate, selectedGovernorate]);

  const markers = useMemo(() => {
    if (!mapModel) return [];

    return mapModel.features.flatMap((featureEntry) => {
      const items = listingsByGovernorate[featureEntry.normalizedName] || [];
      const spreadItems = computeMarkerOffsets(items);

      return spreadItems.map((item) => ({
        ...item,
        x: featureEntry.centroid?.[0] ?? width / 2,
        y: featureEntry.centroid?.[1] ?? height / 2,
      }));
    });
  }, [mapModel, listingsByGovernorate, width, height]);

  const totalGovernorates = mapModel?.features.length ?? 24;

  return (
    <div className="dynasty-layout">
      <section className="map-panel">
        <header className="map-header">
          <div>
            <p className="eyebrow">{subtitle}</p>
            <h1>{title}</h1>
          </div>
          <div className="stats-row">
            <div className="stat-card">
              <span>Governorates</span>
              <strong>{totalGovernorates}</strong>
            </div>
            <div className="stat-card">
              <span>Listings loaded</span>
              <strong>{listings.length}</strong>
            </div>
          </div>
        </header>

        <div className="map-stage">
          {status === 'loading' && <div className="state-panel">Loading Tunisia GeoJSON…</div>}
          {status === 'error' && (
            <div className="state-panel state-panel--error">
              <strong>Map failed to load.</strong>
              <p>{errorMessage}</p>
              <code>{geoJsonUrl}</code>
            </div>
          )}

          {status === 'ready' && mapModel && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="tunisia-map"
              role="img"
              aria-label="Interactive static Tunisia real estate map"
            >
              <defs>
                <filter id="cyanGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect x="0" y="0" width={width} height={height} rx="24" className="map-bg" />

              {mapModel.features.map((item) => {
                const isHovered = hoveredGovernorate === item.normalizedName;
                const isSelected = selectedGovernorate === item.normalizedName;
                const hasListings = item.count > 0;

                return (
                  <g key={item.normalizedName}>
                    <path
                      d={item.path}
                      className={`gov-path ${hasListings ? 'gov-path--has-listings' : ''} ${
                        isHovered ? 'gov-path--hovered' : ''
                      } ${isSelected ? 'gov-path--selected' : ''}`}
                      onMouseEnter={() => setHoveredGovernorate(item.normalizedName)}
                      onMouseLeave={() => setHoveredGovernorate(null)}
                      onClick={() => {
                        if (selectedGovernorateProp == null) {
                          setSelectedGovernorateState(item.normalizedName);
                        }
                        onGovernorateSelect?.(item);
                      }}
                    />
                    {item.centroid && (
                      <text
                        x={item.centroid[0]}
                        y={item.centroid[1]}
                        className="gov-label"
                        textAnchor="middle"
                      >
                        {item.rawName}
                      </text>
                    )}
                  </g>
                );
              })}

              {markers.map((marker) => (
                <g
                  key={marker.id}
                  transform={`translate(${marker.x + marker.offsetX}, ${marker.y + marker.offsetY})`}
                  className="listing-marker"
                  onClick={() => onListingSelect?.(marker)}
                >
                  <circle r="8.5" className="listing-marker__ring" filter="url(#cyanGlow)" />
                  <circle r="4.2" className="listing-marker__dot" />
                </g>
              ))}
            </svg>
          )}
        </div>
      </section>

      <aside className="side-panel">
        <div className="side-card">
          <p className="eyebrow">Selection</p>
          <h2>{selectedGovernorateData?.rawName || 'All Tunisia'}</h2>
          <p className="muted">
            This component is UI-only now. Filtering, dedupe and business rules should happen in
            your scraper agent, service layer or backend before the data reaches the map.
          </p>
        </div>

        <div className="side-card">
          <div className="feed-header">
            <p className="eyebrow">Live inventory</p>
            <span>{visibleListings.length} shown</span>
          </div>

          <div className="listing-feed">
            {visibleListings.map((listing) => (
              <button
                key={listing.id}
                className="listing-card"
                onClick={() => onListingSelect?.(listing)}
                type="button"
              >
                <span className="listing-card__source">{listing.source || 'source'}</span>
                <strong>{listing.title || listing.reference || `Listing #${listing.id}`}</strong>
                <span>{listing.location || listing.city || listing.governorate}</span>
                <div className="listing-card__meta">
                  <span>{listing.rooms ?? '-'} rooms</span>
                  <span>{formatPrice(listing.price, listing.currency)}</span>
                </div>
              </button>
            ))}

            {!visibleListings.length && <div className="empty-feed">No listings in this governorate.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatPrice(price, currency = 'TND') {
  if (price == null || Number.isNaN(Number(price))) return 'Price N/A';
  return `${Number(price).toLocaleString()} ${currency}`;
}

import { useEffect, useMemo, useState } from 'react';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { adaptDatabaseListings, groupListingsByGovernorate, normalizeGovernorateName } from '../lib/mapDataAdapter';
import '../styles/TunisiaMapHome.css';

const GEOJSON_URL =
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

function formatPrice(price, currency = 'TND') {
  if (price == null || Number.isNaN(Number(price))) return 'Price N/A';
  return `${Number(price).toLocaleString()} ${currency}`;
}

export default function TunisiaMapHome({ width = 980, height = 700 }) {
  const [geoJson, setGeoJson] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [hoveredGovernorate, setHoveredGovernorate] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGeoJson() {
      try {
        setStatus('loading');
        setErrorMessage('');

        const response = await fetch(GEOJSON_URL, { signal: controller.signal });
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
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiBaseUrl}/api/properties?limit=200`);

        if (!response.ok) {
          throw new Error(`Listings request failed with ${response.status}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : payload.data || payload.items || [];
        const adapted = adaptDatabaseListings(rows);

        if (!ignore) {
          setListings(adapted);
        }
      } catch (error) {
        if (!ignore) {
          setListings([]);
        }
      }
    }

    loadListings();
    return () => {
      ignore = true;
    };
  }, []);

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
        rawName,
        normalizedName,
        centroid,
        count,
        path: pathGenerator(feature),
      };
    });

    return { features };
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
    <div className="tn-full-layout">
      <section className="tn-full-map-panel">
        <header className="tn-full-header">
          <div>
            <p className="tn-full-eyebrow">Interactive view</p>
            <h3>Tunisia Real Estate Map</h3>
          </div>
          <div className="tn-full-stats-row">
            <div className="tn-full-stat-card">
              <span>Governorates</span>
              <strong>{totalGovernorates}</strong>
            </div>
            <div className="tn-full-stat-card">
              <span>Listings loaded</span>
              <strong>{listings.length}</strong>
            </div>
          </div>
        </header>

        <div className="tn-full-map-stage">
          {status === 'loading' && <div className="tn-full-state-panel">Loading Tunisia GeoJSON...</div>}
          {status === 'error' && (
            <div className="tn-full-state-panel tn-full-state-panel--error">
              <strong>Map failed to load.</strong>
              <p>{errorMessage}</p>
            </div>
          )}

          {status === 'ready' && mapModel && (
            <svg viewBox={`0 0 ${width} ${height}`} className="tn-full-map" role="img" aria-label="Interactive Tunisia real estate map">
              <rect x="0" y="0" width={width} height={height} rx="24" className="tn-full-map-bg" />

              {mapModel.features.map((item) => {
                const isHovered = hoveredGovernorate === item.normalizedName;
                const isSelected = selectedGovernorate === item.normalizedName;
                const hasListings = item.count > 0;

                return (
                  <g key={item.normalizedName}>
                    <path
                      d={item.path}
                      className={`tn-full-path ${hasListings ? 'tn-full-path--has-listings' : ''} ${
                        isHovered ? 'tn-full-path--hovered' : ''
                      } ${isSelected ? 'tn-full-path--selected' : ''}`}
                      onMouseEnter={() => setHoveredGovernorate(item.normalizedName)}
                      onMouseLeave={() => setHoveredGovernorate(null)}
                      onClick={() => setSelectedGovernorate(item.normalizedName)}
                    />
                    {item.centroid && (
                      <text x={item.centroid[0]} y={item.centroid[1]} className="tn-full-label" textAnchor="middle">
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
                  className="tn-full-marker"
                >
                  <circle r="8" className="tn-full-marker-ring" />
                  <circle r="4" className="tn-full-marker-dot" />
                </g>
              ))}
            </svg>
          )}
        </div>
      </section>

      <aside className="tn-full-side-panel">
        <div className="tn-full-side-card">
          <p className="tn-full-eyebrow">Selection</p>
          <h3>{selectedGovernorateData?.rawName || 'All Tunisia'}</h3>
          <p className="tn-full-muted">Select a governorate on the map to filter listings.</p>
        </div>

        <div className="tn-full-side-card">
          <div className="tn-full-feed-header">
            <p className="tn-full-eyebrow">Live inventory</p>
            <span>{visibleListings.length} shown</span>
          </div>

          <div className="tn-full-listing-feed">
            {visibleListings.map((listing) => (
              <button key={listing.id} className="tn-full-listing-card" type="button">
                <span className="tn-full-listing-source">{listing.source || 'source'}</span>
                <strong>{listing.title || listing.reference || `Listing #${listing.id}`}</strong>
                <span>{listing.location || listing.city || listing.governorate}</span>
                <div className="tn-full-listing-meta">
                  <span>{listing.rooms ?? '-'} rooms</span>
                  <span>{formatPrice(listing.price, listing.currency)}</span>
                </div>
              </button>
            ))}

            {!visibleListings.length && <div className="tn-full-empty-feed">No listings in this governorate.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}

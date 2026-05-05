import { useEffect, useMemo, useState } from 'react';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import {
  groupListingsByGovernorate,
  normalizeGovernorateName,
} from '../lib/mapDataAdapter';
import { safeRecordClientActivity } from '../../../lib/auth';

const LOCAL_GEOJSON_URL = `${process.env.PUBLIC_URL || ''}/tunisia-governorates-full.geojson`;
const FALLBACK_GEOJSON_URL =
  'https://raw.githubusercontent.com/riatelab/tunisie/refs/heads/master/data/TN-gouvernorats.geojson';

const GOVERNORATE_NAME_BY_CODE = {
  'TN-11': 'Tunis',
  'TN-12': 'Ariana',
  'TN-13': 'Ben Arous',
  'TN-14': 'Manouba',
  'TN-21': 'Nabeul',
  'TN-22': 'Zaghouan',
  'TN-23': 'Bizerte',
  'TN-31': 'Beja',
  'TN-32': 'Jendouba',
  'TN-33': 'El Kef',
  'TN-34': 'Siliana',
  'TN-41': 'Kairouan',
  'TN-42': 'Kasserine',
  'TN-43': 'Sidi Bouzid',
  'TN-51': 'Sousse',
  'TN-52': 'Monastir',
  'TN-53': 'Mahdia',
  'TN-61': 'Sfax',
  'TN-71': 'Gafsa',
  'TN-72': 'Tozeur',
  'TN-73': 'Kebili',
  'TN-81': 'Gabes',
  'TN-82': 'Medenine',
  'TN-83': 'Tataouine',
};

function cleanGovernorateLabel(value = '') {
  const replacements = [
    [new RegExp('B\\u00c3\\u00a9ja|B\\u00c3\\u0192\\u00c2\\u00a9ja', 'gi'), 'Beja'],
    [new RegExp('Gab\\u00c3\\u00a8s|Gab\\u00c3\\u0192\\u00c2\\u00a8s', 'gi'), 'Gabes'],
    [new RegExp('K\\u00c3\\u00a9bili|K\\u00c3\\u0192\\u00c2\\u00a9bili', 'gi'), 'Kebili'],
    [new RegExp('M\\u00c3\\u00a9denine|M\\u00c3\\u0192\\u00c2\\u00a9denine', 'gi'), 'Medenine'],
  ];

  const label = replacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    String(value)
  );

  return label.trim();
}

function getFeatureName(feature) {
  const props = feature?.properties ?? {};
  const code = props.shapeISO || props.gouv_id;

  if (code && GOVERNORATE_NAME_BY_CODE[code]) {
    return GOVERNORATE_NAME_BY_CODE[code];
  }

  return cleanGovernorateLabel(
    props.shapeName ||
      props.gouv_fr ||
      props.gouv_ar ||
      props.name ||
      props.NAME_1 ||
      props.nom ||
      props.governorate ||
      props.lib ||
      props.NAME ||
      'Inconnu'
  );
}

function rewindGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) return geometry;

  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) => [...ring].reverse()),
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => [...ring].reverse())),
    };
  }

  return geometry;
}

function normalizeFeatureCollection(data) {
  return {
    ...data,
    features: data.features.map((feature) => ({
      ...feature,
      geometry: rewindGeometry(feature.geometry),
    })),
  };
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

async function fetchGeoJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`La requête GeoJSON a échoué avec le statut ${response.status}`);
  }

  const data = await response.json();
  if (!data?.features?.length) {
    throw new Error('Le GeoJSON est chargé, mais aucune zone n’a été trouvée.');
  }

  return normalizeFeatureCollection(data);
}

export default function TunisiaDynastyMap({
  geoJsonUrl = LOCAL_GEOJSON_URL,
  listings = [],
  width = 980,
  height = 700,
  title = 'Résidences de référence en Tunisie',
  subtitle = 'Atlas immobilier inspiré de Dynasty',
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

        const candidateUrls =
          geoJsonUrl === FALLBACK_GEOJSON_URL ? [geoJsonUrl] : [geoJsonUrl, FALLBACK_GEOJSON_URL];
        let lastError = null;

        for (const candidateUrl of candidateUrls) {
          try {
            const data = await fetchGeoJson(candidateUrl, controller.signal);
            setGeoJson(data);
            setStatus('ready');
            return;
          } catch (error) {
            if (error.name === 'AbortError') return;
            lastError = error;
          }
        }

        throw lastError || new Error('Impossible de charger le GeoJSON de la Tunisie.');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setStatus('error');
        setErrorMessage(error.message || 'Impossible de charger le GeoJSON de la Tunisie.');
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

  const trackGovernorateSelection = (item) => {
    if (!item?.normalizedName) return;

    safeRecordClientActivity({
      event_type: 'map_region_select',
      page: typeof window !== 'undefined' ? window.location.pathname : '/map',
      target_type: 'governorate',
      target_id: item.normalizedName,
      metadata: {
        region_name: item.rawName,
        governorate_name: item.rawName,
        normalized_region: item.normalizedName,
        normalized_governorate: item.normalizedName,
        listings_count: item.count || 0,
        source: 'tunisia_dynasty_map',
      },
    });
  };

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
              <span>Gouvernorats</span>
              <strong>{totalGovernorates}</strong>
            </div>
            <div className="stat-card">
              <span>Annonces chargées</span>
              <strong>{listings.length}</strong>
            </div>
          </div>
        </header>

        <div className="map-stage">
          {status === 'loading' && <div className="state-panel">Chargement du GeoJSON de la Tunisie...</div>}
          {status === 'error' && (
            <div className="state-panel state-panel--error">
              <strong>La carte n’a pas pu être chargée.</strong>
              <p>{errorMessage}</p>
              <code>{geoJsonUrl}</code>
            </div>
          )}

          {status === 'ready' && mapModel && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="tunisia-map"
              role="img"
              aria-label="Carte immobilière interactive de la Tunisie"
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
                        trackGovernorateSelection(item);
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
          <p className="eyebrow">Sélection</p>
          <h2>{selectedGovernorateData?.rawName || 'Toute la Tunisie'}</h2>
          <p className="muted">
            Ce composant reçoit des annonces déjà adaptées et gère uniquement l’affichage de la carte.
          </p>
        </div>

        <div className="side-card">
          <div className="feed-header">
            <p className="eyebrow">Inventaire en direct</p>
            <span>{visibleListings.length} affichée(s)</span>
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
                <strong>{listing.title || listing.reference || `Annonce #${listing.id}`}</strong>
                <span>{listing.location || listing.city || listing.governorate}</span>
                <div className="listing-card__meta">
                  <span>{listing.rooms ?? '-'} pièces</span>
                  <span>{formatPrice(listing.price, listing.currency)}</span>
                </div>
              </button>
            ))}

            {!visibleListings.length && <div className="empty-feed">Aucune annonce dans ce gouvernorat.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatPrice(price, currency = 'TND') {
  if (price == null || Number.isNaN(Number(price))) return 'Prix non renseigné';
  return `${Number(price).toLocaleString()} ${currency}`;
}

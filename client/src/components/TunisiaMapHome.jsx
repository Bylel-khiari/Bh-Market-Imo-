import { useEffect, useMemo, useState } from 'react';
import { geoCentroid, geoMercator, geoPath, geoArea } from 'd3-geo';
import { adaptDatabaseListings, normalizeGovernorateName, normalizeText } from '../lib/mapDataAdapter';
import '../styles/TunisiaMapHome.css';

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
  return String(value)
    .replace(/BÃ©ja/gi, 'Beja')
    .replace(/GabÃ¨s/gi, 'Gabes')
    .replace(/KÃ©bili/gi, 'Kebili')
    .replace(/MÃ©denine/gi, 'Medenine')
    .trim();
}

function canonicalGovernorateKey(value = '') {
  const base = normalizeGovernorateName(cleanGovernorateLabel(value));
  const aliasMap = {
    'le kef': 'kef',
    'el kef': 'kef',
    kef: 'kef',
    mannouba: 'manouba',
    manouba: 'manouba',
    mednine: 'medenine',
    medenine: 'medenine',
    jandouba: 'jendouba',
    'sidi bou zid': 'sidi bouzid',
  };

  return aliasMap[base] || base;
}

function getFeatureName(feature) {
  const props = feature?.properties ?? {};
  const code = props.shapeISO || props.gouv_id;
  if (code && GOVERNORATE_NAME_BY_CODE[code]) {
    return GOVERNORATE_NAME_BY_CODE[code];
  }

  const raw =
    props.shapeName ||
    props.gouv_fr ||
    props.gouv_ar ||
    props.name ||
    props.NAME_1 ||
    props.nom ||
    props.governorate ||
    props.lib ||
    props.shapeName ||
    props.NAME ||
    'Unknown';

  return cleanGovernorateLabel(raw);
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

function formatPrice(price, currency = 'TND') {
  if (price == null || Number.isNaN(Number(price))) return 'Price N/A';
  return `${Number(price).toLocaleString()} ${currency}`;
}

export default function TunisiaMapHome({ width = 980, height = 820, rows = null }) {
  const [geoJson, setGeoJson] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [hoveredGovernorate, setHoveredGovernorate] = useState(null);
  const usesExternalRows = Array.isArray(rows);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGeoJson() {
      try {
        setStatus('loading');
        setErrorMessage('');

        let data = null;

        try {
          const localResponse = await fetch(LOCAL_GEOJSON_URL, { signal: controller.signal });
          if (!localResponse.ok) {
            throw new Error(`Local GeoJSON request failed with ${localResponse.status}`);
          }
          data = await localResponse.json();
        } catch {
          const fallbackResponse = await fetch(FALLBACK_GEOJSON_URL, { signal: controller.signal });
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback GeoJSON request failed with ${fallbackResponse.status}`);
          }
          data = await fallbackResponse.json();
        }

        if (!data?.features?.length) {
          throw new Error('GeoJSON loaded but no features were found.');
        }

        const rewoundData = {
          ...data,
          features: data.features.map((feature) => ({
            ...feature,
            geometry: rewindGeometry(feature.geometry),
          })),
        };

        setGeoJson(rewoundData);
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
    if (!usesExternalRows) return;

    const adapted = adaptDatabaseListings(rows);
    setListings(adapted);
  }, [rows, usesExternalRows]);

  useEffect(() => {
    if (usesExternalRows) return;

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
  }, [usesExternalRows]);

  const mapFeatures = useMemo(() => {
    if (!geoJson) return null;

    const projection = geoMercator().fitExtent(
      [
        [18, 18],
        [width - 18, height - 18],
      ],
      geoJson
    );

    const pathGenerator = geoPath(projection);

    return geoJson.features.map((feature) => {
      const props = feature?.properties ?? {};
      const governorateCode = props.shapeISO || props.gouv_id || null;
      const rawName = getFeatureName(feature);
      const normalizedName = canonicalGovernorateKey(rawName);
      const centroid = projection(geoCentroid(feature));

      return {
        feature,
        governorateCode,
        rawName,
        normalizedName,
        centroid,
        path: pathGenerator(feature),
      };
    });
  }, [geoJson, width, height]);

  const governorateLabels = useMemo(() => {
    if (!mapFeatures?.length) return [];

    const byGovernorate = new Map();

    mapFeatures.forEach((entry) => {
      const key = entry.governorateCode || entry.normalizedName || canonicalGovernorateKey(entry.rawName) || entry.rawName;
      if (!key) return;

      const existing = byGovernorate.get(key);
      const area = geoArea(entry.feature);

      if (!existing || area > existing.area) {
        byGovernorate.set(key, {
          key,
          label: GOVERNORATE_NAME_BY_CODE[entry.governorateCode] || entry.rawName,
          x: entry.centroid?.[0],
          y: entry.centroid?.[1],
          area,
        });
      }
    });

    return Array.from(byGovernorate.values());
  }, [mapFeatures]);

  const listingsByGovernorate = useMemo(() => {
    if (!mapFeatures?.length) return {};

    const codeByNormalizedName = mapFeatures.reduce((acc, feature) => {
      if (feature.normalizedName && feature.governorateCode) {
        acc[feature.normalizedName] = feature.governorateCode;
      }
      return acc;
    }, {});

    const byGovernorate = mapFeatures.reduce((acc, feature) => {
      const key = feature.governorateCode || feature.normalizedName;
      if (key) acc[key] = [];
      return acc;
    }, {});

    const findMatchingGovernorate = (listing) => {
      const directCandidates = [
        listing.governorate,
        listing.raw?.city,
        listing.raw?.governorate,
        listing.raw?.region,
      ]
        .map((value) => canonicalGovernorateKey(value || ''))
        .filter(Boolean);

      const directMatch = directCandidates.find((candidate) => codeByNormalizedName[candidate]);
      if (directMatch) return directMatch;

      const searchableText = normalizeText(
        [
          listing.governorate,
          listing.location,
          listing.raw?.city,
          listing.raw?.location_raw,
          listing.raw?.title,
          listing.raw?.description,
        ]
          .filter(Boolean)
          .join(' ')
      );

      if (!searchableText) return null;

      const fuzzyMatch = mapFeatures.find((feature) => {
        if (!feature.normalizedName) return false;
        const tokens = feature.normalizedName.split(' ').filter(Boolean);
        return searchableText.includes(feature.normalizedName) || tokens.every((token) => searchableText.includes(token));
      });

      return fuzzyMatch?.normalizedName || null;
    };

    listings.forEach((listing) => {
      const match = findMatchingGovernorate(listing);
      const key = codeByNormalizedName[match] || null;
      if (key && byGovernorate[key]) {
        byGovernorate[key].push(listing);
      }
    });

    return byGovernorate;
  }, [listings, mapFeatures]);

  const selectedGovernorateData = useMemo(() => {
    if (!selectedGovernorate) return null;
    return mapFeatures?.find((item) => item.governorateCode === selectedGovernorate) || null;
  }, [mapFeatures, selectedGovernorate]);

  const visibleListings = useMemo(() => {
    if (!selectedGovernorate) return listings.slice(0, 8);
    return listingsByGovernorate[selectedGovernorate] || [];
  }, [listings, listingsByGovernorate, selectedGovernorate]);

  const markers = useMemo(() => {
    if (!governorateLabels?.length) return [];

    return governorateLabels
      .map((item) => ({
        key: item.key,
        x: item.x,
        y: item.y,
        count: listingsByGovernorate[item.key]?.length ?? 0,
      }))
      .filter((item) => item.count > 0 && item.x != null && item.y != null);
  }, [governorateLabels, listingsByGovernorate]);

  const totalGovernorates = governorateLabels.length || 24;

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

          {status === 'ready' && mapFeatures && (
            <svg viewBox={`0 0 ${width} ${height}`} className="tn-full-map" role="img" aria-label="Interactive Tunisia real estate map">
              <rect x="0" y="0" width={width} height={height} rx="24" className="tn-full-map-bg" />

              {mapFeatures.map((item, index) => {
                const isHovered = hoveredGovernorate === item.governorateCode;
                const isSelected = selectedGovernorate === item.governorateCode;
                const count = listingsByGovernorate[item.governorateCode]?.length ?? 0;
                const hasListings = count > 0;

                return (
                  <g key={`${item.governorateCode || item.normalizedName || 'gov'}-${index}`}>
                    <path
                      d={item.path}
                      className={`tn-full-path ${hasListings ? 'tn-full-path--has-listings' : ''} ${
                        isHovered ? 'tn-full-path--hovered' : ''
                      } ${isSelected ? 'tn-full-path--selected' : ''}`}
                      onMouseEnter={() => setHoveredGovernorate(item.governorateCode)}
                      onMouseLeave={() => setHoveredGovernorate(null)}
                      onClick={() => setSelectedGovernorate(item.governorateCode)}
                    />
                  </g>
                );
              })}

              {governorateLabels.map((item) => {
                const count = listingsByGovernorate[item.key]?.length ?? 0;
                if (item.x == null || item.y == null) return null;

                return (
                  <g key={`label-${item.key}`}>
                    <text x={item.x} y={item.y} className="tn-full-label" textAnchor="middle">
                      {item.label}
                    </text>
                    <text x={item.x} y={item.y + 12} className="tn-full-label tn-full-label--count" textAnchor="middle">
                      {count}
                    </text>
                  </g>
                );
              })}

              {markers.map((marker) => (
                <g
                  key={marker.key}
                  transform={`translate(${marker.x}, ${marker.y - 6})`}
                  className="tn-full-marker"
                >
                  <path
                    className="tn-full-marker-pin"
                    d="M0 -10 C5 -10 9 -6 9 -1 C9 5 3 10 0 15 C-3 10 -9 5 -9 -1 C-9 -6 -5 -10 0 -10 Z"
                  />
                  <circle r="3" cy="-2" className="tn-full-marker-hole" />
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

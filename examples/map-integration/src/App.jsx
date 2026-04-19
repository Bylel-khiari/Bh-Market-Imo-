import { useEffect, useState } from 'react';
import TunisiaDynastyMap from './components/TunisiaDynastyMap';
import { adaptDatabaseListings } from './lib/mapDataAdapter';

export default function App() {
  const [listings, setListings] = useState([]);
  const [apiState, setApiState] = useState('loading');
  const [apiError, setApiError] = useState('');
  const apiBaseUrl =
    import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : 'http://localhost:5000');

  useEffect(() => {
    let ignore = false;

    async function loadFromBackend() {
      try {
        setApiState('loading');
        setApiError('');

        const response = await fetch(`${apiBaseUrl}/api/properties?limit=5000`);
        if (!response.ok) {
          throw new Error(`API request failed with ${response.status}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : payload.data || payload.items || [];
        const adapted = adaptDatabaseListings(rows);

        if (!ignore) {
          setListings(adapted);
          setApiState('live');
        }
      } catch (error) {
        if (!ignore) {
          setListings([]);
          setApiState('error');
          setApiError(error.message || 'Failed to load /api/properties');
        }
      }
    }

    loadFromBackend();
    return () => {
      ignore = true;
    };
  }, [apiBaseUrl]);

  return (
    <div className="app-shell">
      <div className="integration-banner">
        <strong>Data source:</strong>{' '}
        {apiState === 'live'
          ? 'Live backend'
          : apiState === 'loading'
            ? 'Loading backend...'
            : 'Backend unavailable'}
        {apiError ? <span className="integration-error">{apiError}</span> : null}
      </div>

      <TunisiaDynastyMap
        listings={listings}
        geoJsonUrl="https://raw.githubusercontent.com/riatelab/tunisie/refs/heads/master/data/TN-gouvernorats.geojson"
        onGovernorateSelect={(gov) => console.log('Governorate selected:', gov)}
        onListingSelect={(listing) => console.log('Listing selected:', listing)}
      />
    </div>
  );
}

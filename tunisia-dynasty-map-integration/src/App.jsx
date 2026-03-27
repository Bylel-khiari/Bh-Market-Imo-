import { useEffect, useState } from 'react';
import TunisiaDynastyMap from './components/TunisiaDynastyMap';
import { exampleDbResponse } from './data/exampleDbResponse';
import { adaptDatabaseListings } from './lib/mapDataAdapter';

export default function App() {
  const [listings, setListings] = useState(() => adaptDatabaseListings(exampleDbResponse));
  const [apiState, setApiState] = useState('mock');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadFromBackend() {
      try {
        setApiState('loading');
        setApiError('');

        const response = await fetch('/api/properties');
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
          setApiState('mock');
          setApiError(error.message || 'Failed to load /api/properties');
        }
      }
    }

    loadFromBackend();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <div className="integration-banner">
        <strong>Data source:</strong> {apiState === 'live' ? 'Live backend' : apiState === 'loading' ? 'Loading backend…' : 'Mock fallback'}
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

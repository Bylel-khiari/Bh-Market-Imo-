import { useEffect, useState } from 'react';
import TunisiaDynastyMap from '../components/TunisiaDynastyMap';
import { adaptDatabaseListings } from '../lib/mapDataAdapter';
import { fetchPropertyRows } from '../../../lib/properties';
import '../styles/TunisiaDynastyMap.css';

export default function MapPage() {
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadListings() {
      try {
        setStatus('loading');
        setError('');

        const rows = await fetchPropertyRows({
          limit: 5000,
          signal: controller.signal,
        });

        if (!ignore) {
          setListings(adaptDatabaseListings(rows));
          setStatus('ready');
        }
      } catch (err) {
        if (!ignore && err.name !== 'AbortError') {
          setListings([]);
          setStatus('error');
          setError('Impossible de charger les biens depuis le backend.');
        }
      }
    }

    loadListings();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  return (
    <main className="map-page">
      {status === 'loading' && (
        <div className="integration-banner">Chargement de la carte...</div>
      )}

      {status === 'error' && (
        <div className="integration-banner integration-error">
          {error}
        </div>
      )}

      <TunisiaDynastyMap
        listings={listings}
        title="BH Market Immo"
        subtitle="Carte interactive des biens immobiliers en Tunisie"
      />
    </main>
  );
}

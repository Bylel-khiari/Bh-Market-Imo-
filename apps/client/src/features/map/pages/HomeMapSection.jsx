import { useEffect, useState } from 'react';
import TunisiaMapHome from '../components/TunisiaMapHome';
import { adaptDatabaseListings } from '../lib/mapDataAdapter';
import { fetchPropertyRows } from '../../../lib/properties';
import '../styles/TunisiaMapHome.css';

export default function HomeMapSection() {
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
          setError('Impossible de charger les biens pour la carte.');
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
    <div className="home-map-section">
      {status === 'loading' && <div className="tn-home-map-status">Chargement de la carte...</div>}
      {status === 'error' && <div className="tn-home-map-status tn-home-map-status--error">{error}</div>}
      <TunisiaMapHome listings={listings} />
    </div>
  );
}

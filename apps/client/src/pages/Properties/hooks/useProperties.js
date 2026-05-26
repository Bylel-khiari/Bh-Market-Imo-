import { useCallback, useEffect, useState } from 'react';
import { fetchFavoritesApi, getAuthSession } from '../../../lib/auth';
import { fetchPropertyRows } from '../../../lib/properties';

export default function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  const [favoriteNotice, setFavoriteNotice] = useState('');

  const currentUserRole = authSession?.user?.role || null;
  const isClientSession = Boolean(authSession?.token && currentUserRole === 'client');

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const rows = await fetchPropertyRows({ all: true, signal: controller.signal });
      setProperties(rows);
    } catch (err) {
      console.error('Impossible de charger les biens :', err);
      if (err.name !== 'AbortError') {
        setProperties([]);
        setError('Impossible de charger les biens nettoyÃ©s depuis le serveur.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!isClientSession) {
      setFavoriteIds([]);
      setFavoriteLoading(false);
      setFavoriteError('');
      setFavoriteNotice('');
      return;
    }

    setFavoriteLoading(true);

    try {
      const payload = await fetchFavoritesApi(authSession.token);
      const nextIds = Array.isArray(payload.propertyIds)
        ? payload.propertyIds
        : Array.isArray(payload.data)
          ? payload.data.map((item) => item.id)
          : [];

      setFavoriteIds(nextIds.map((id) => String(id)));
      setFavoriteError('');
    } catch (err) {
      console.error('Impossible de charger les favoris :', err);
      setFavoriteError(err.message || 'Impossible de charger vos favoris.');
      setFavoriteIds([]);
    } finally {
      setFavoriteLoading(false);
    }
  }, [authSession?.token, isClientSession]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    const syncAuthSession = () => setAuthSession(getAuthSession());
    window.addEventListener('storage', syncAuthSession);
    return () => window.removeEventListener('storage', syncAuthSession);
  }, []);

  return {
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
  };
}

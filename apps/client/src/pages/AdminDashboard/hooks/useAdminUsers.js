import { useCallback, useState } from 'react';
import { fetchAdminUsersApi, requireAuthToken } from '../../../lib/auth';

export default function useAdminUsers(handleAuthFailure) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const token = requireAuthToken();
      setLoading(true);
      setError('');
      const payload = await fetchAdminUsersApi(token, 100);
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

  return {
    error,
    fetchUsers,
    loading,
    setError,
    setLoading,
    setUsers,
    users,
  };
}

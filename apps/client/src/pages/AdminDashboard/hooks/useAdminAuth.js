import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, isAuthError } from '../../../lib/auth';

export default function useAdminAuth() {
  const navigate = useNavigate();

  const goToHomePage = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const redirectToLogin = useCallback(() => {
    clearAuthSession();
    navigate('/login', { replace: true, state: { from: '/admin/dashboard' } });
  }, [navigate]);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleAuthFailure = useCallback((requestError) => {
    if (!isAuthError(requestError)) {
      return false;
    }

    redirectToLogin();
    return true;
  }, [redirectToLogin]);

  return {
    goToHomePage,
    handleAuthFailure,
    handleLogout,
  };
}

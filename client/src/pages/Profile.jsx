import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession, meApi } from '../lib/auth';
import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      const session = getAuthSession();
      if (!session?.token) {
        navigate('/login');
        return;
      }

      try {
        const payload = await meApi(session.token);
        if (!ignore) {
          setUser(payload.user || null);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          clearAuthSession();
          setError('Session invalide, veuillez vous reconnecter.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <div className="profile-page">
      <div className="container">
        <h1>Mon Profil</h1>
        <div className="profile-actions">
          <button type="button" className="profile-logout-btn" onClick={handleLogout}>Se deconnecter</button>
        </div>

        {loading && <div className="profile-section"><p>Chargement du profil...</p></div>}
        {!loading && error && <div className="profile-section"><p>{error}</p></div>}

        <div className="profile-content">
          <div className="profile-section">
            <h2>Informations personnelles</h2>
            <p>Nom: {user?.name || 'N/A'}</p>
            <p>Email: {user?.email || 'N/A'}</p>
            <p>Role: {user?.role || 'N/A'}</p>
          </div>
          <div className="profile-section">
            <h2>Mes demandes de crédit</h2>
            <p>Consultez l'état de vos demandes de crédit immobilier</p>
          </div>
          <div className="profile-section">
            <h2>Mes biens favoris</h2>
            <p>Retrouvez les biens immobiliers que vous avez sauvegardés</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

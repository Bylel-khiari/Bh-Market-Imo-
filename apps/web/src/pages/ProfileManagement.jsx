import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession, meApi } from '../lib/auth';
import '../styles/ProfileManagement.css';

const ProfileManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
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
          setError('Session invalide. Veuillez vous reconnecter.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadUser();
    return () => {
      ignore = true;
    };
  }, [navigate]);

  return (
    <div className="profile-management-page">
      <div className="profile-management-container">
        <div className="profile-management-head">
          <h1>Gestion du profil</h1>
        </div>

        {loading && <div className="pm-card"><p>Chargement du profil...</p></div>}
        {!loading && error && <div className="pm-card"><p>{error}</p></div>}

        {!loading && !error && (
          <>
            <section className="pm-card">
              <h2>Informations du compte</h2>
              <div className="pm-grid">
                <div className="pm-field">
                  <label>Nom</label>
                  <input type="text" value={user?.name || ''} readOnly />
                </div>
                <div className="pm-field">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} readOnly />
                </div>
                <div className="pm-field">
                  <label>Role</label>
                  <input type="text" value={user?.role || ''} readOnly />
                </div>
              </div>
            </section>

            <section className="pm-card">
              <h2>Parametres</h2>
              <p>
                Cette section est prete pour la modification de profil (nom, mot de passe, preferences)
                quand les endpoints de mise a jour seront ajoutes.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileManagement;

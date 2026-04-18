import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaExternalLinkAlt, FaHeart, FaMapMarkerAlt } from 'react-icons/fa';
import {
  clearAuthSession,
  fetchFavoritesApi,
  getAuthSession,
  meApi,
} from '../lib/auth';
import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesError, setFavoritesError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      const session = getAuthSession();
      if (!session?.token) {
        navigate('/login');
        return;
      }

      try {
        const userPayload = await meApi(session.token);
        const nextUser = userPayload.user || null;

        let favoriteRows = [];
        if (nextUser?.role === 'client') {
          try {
            const favoritesPayload = await fetchFavoritesApi(session.token);
            favoriteRows = Array.isArray(favoritesPayload.data) ? favoritesPayload.data : [];
            if (!ignore) {
              setFavoritesError('');
            }
          } catch (favoriteErr) {
            favoriteRows = [];
            if (!ignore) {
              setFavoritesError(favoriteErr.message || 'Impossible de charger les favoris.');
            }
          }
        }

        if (!ignore) {
          setUser(nextUser);
          setFavorites(favoriteRows);
          setError('');
          if (nextUser?.role !== 'client') {
            setFavoritesError('');
          }
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

  const formatPrice = (property) => {
    const numeric = Number(property.price_value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
    }
    return property.price_raw || 'Prix non communique';
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

        {!loading && !error && (
          <div className="profile-content">
            <div className="profile-section">
              <h2>Informations personnelles</h2>
              <p>Nom: {user?.name || 'N/A'}</p>
              <p>Email: {user?.email || 'N/A'}</p>
              <p>Role: {user?.role || 'N/A'}</p>
            </div>

            <div className="profile-section">
              <h2>Mes demandes de credit</h2>
              <p>Consultez l'etat de vos demandes de credit immobilier.</p>
            </div>

            {user?.role === 'client' && (
              <div className="profile-section">
                <div className="profile-section-head">
                  <div>
                    <h2>Mes biens favoris</h2>
                    <p className="profile-section-copy">
                      Retrouvez ici les biens sauvegardes avec votre compte.
                    </p>
                  </div>
                  <Link to="/properties?favorites=1" className="profile-favorites-link">
                    <FaHeart /> Voir tous mes favoris
                  </Link>
                </div>

                {favoritesError ? (
                  <p>{favoritesError}</p>
                ) : favorites.length === 0 ? (
                  <p>Vous n'avez pas encore ajoute de bien a vos favoris.</p>
                ) : (
                  <div className="profile-favorites-grid">
                    {favorites.slice(0, 6).map((property) => (
                      <article key={property.id} className="profile-favorite-card">
                        {property.image ? (
                          <img
                            src={property.image}
                            alt={property.title || 'Bien immobilier'}
                            className="profile-favorite-image"
                          />
                        ) : (
                          <div className="profile-favorite-image profile-favorite-image--placeholder">
                            Image non disponible
                          </div>
                        )}

                        <div className="profile-favorite-body">
                          <h3>{property.title || 'Bien immobilier'}</h3>
                          <p className="profile-favorite-location">
                            <FaMapMarkerAlt /> {property.location_raw || property.city || 'Localisation non disponible'}
                          </p>
                          <p className="profile-favorite-price">{formatPrice(property)}</p>
                          <div className="profile-favorite-actions">
                            <Link
                              to={`/properties?favorites=1&focusId=${property.id}`}
                              className="profile-favorite-link-secondary"
                            >
                              Ouvrir le bien
                            </Link>
                            {property.url ? (
                              <a
                                href={property.url}
                                target="_blank"
                                rel="noreferrer"
                                className="profile-favorite-link-secondary"
                              >
                                Source <FaExternalLinkAlt />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

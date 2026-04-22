import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaExternalLinkAlt, FaHeart, FaMapMarkerAlt } from 'react-icons/fa';
import {
  clearAuthSession,
  fetchClientCreditApplicationsApi,
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
  const [creditApplications, setCreditApplications] = useState([]);
  const [creditApplicationsError, setCreditApplicationsError] = useState('');

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
        let creditApplicationRows = [];
        if (nextUser?.role === 'client') {
          try {
            const favoritesPayload = await fetchFavoritesApi(session.token);
            favoriteRows = Array.isArray(favoritesPayload.data) ? favoritesPayload.data : [];
            if (!ignore) {
              setFavoritesError('');
            }
          } catch (favoriteErr) {
            if (!ignore) {
              setFavoritesError(favoriteErr.message || 'Impossible de charger les favoris.');
            }
          }

          try {
            const creditApplicationsPayload = await fetchClientCreditApplicationsApi(session.token, 20);
            creditApplicationRows = Array.isArray(creditApplicationsPayload.applications)
              ? creditApplicationsPayload.applications
              : [];

            if (!ignore) {
              setCreditApplicationsError('');
            }
          } catch (creditErr) {
            if (!ignore) {
              setCreditApplicationsError(creditErr.message || 'Impossible de charger vos demandes de credit.');
            }
          }
        }

        if (!ignore) {
          setUser(nextUser);
          setFavorites(favoriteRows);
          setCreditApplications(creditApplicationRows);
          setError('');
          if (nextUser?.role !== 'client') {
            setFavoritesError('');
            setCreditApplicationsError('');
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

  const formatCreditApplicationStatus = (status) => {
    if (status === 'submitted') return 'Nouveau dossier';
    if (status === 'under_review') return 'En analyse';
    if (status === 'documents_pending') return 'Pieces manquantes';
    if (status === 'approved') return 'Accepte';
    if (status === 'rejected') return 'Refuse';
    return status || 'Inconnu';
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

            {user?.role === 'client' && (
              <>
                <div className="profile-section">
                  <div className="profile-section-head">
                    <div>
                      <h2>Mes demandes de credit</h2>
                      <p className="profile-section-copy">
                        Suivez ici l avancement des dossiers traites par l agent bancaire.
                      </p>
                    </div>
                  </div>

                  {creditApplicationsError ? (
                    <p>{creditApplicationsError}</p>
                  ) : creditApplications.length === 0 ? (
                    <p>Vous n'avez pas encore depose de demande de credit.</p>
                  ) : (
                    <div className="profile-credit-list">
                      {creditApplications.map((application) => (
                        <article key={application.id} className="profile-credit-card">
                          <div className="profile-credit-head">
                            <div>
                              <h3>{application.property_title || `Dossier #${application.id}`}</h3>
                              <p>
                                Depose le {new Date(application.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <span className={`profile-credit-status status-${application.status}`}>
                              {formatCreditApplicationStatus(application.status)}
                            </span>
                          </div>

                          <div className="profile-credit-grid">
                            <span>
                              <strong>Montant demande</strong>
                              <small>{formatPrice({ price_value: application.requested_amount })}</small>
                            </span>
                            <span>
                              <strong>Mensualite estimee</strong>
                              <small>{formatPrice({ price_value: application.estimated_monthly_payment })}</small>
                            </span>
                            <span>
                              <strong>Taux d endettement</strong>
                              <small>
                                {Number.isFinite(Number(application.debt_ratio))
                                  ? `${Number(application.debt_ratio).toFixed(1)}%`
                                  : 'Non renseigne'}
                              </small>
                            </span>
                            <span>
                              <strong>Conformite</strong>
                              <small>{application.compliance_score ?? 'A evaluer'}</small>
                            </span>
                          </div>

                          {(application.agent_note || application.compliance_summary) && (
                            <p className="profile-credit-note">
                              <strong>Retour banque:</strong> {application.agent_note || application.compliance_summary}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

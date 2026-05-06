import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaBath,
  FaBed,
  FaExternalLinkAlt,
  FaFlag,
  FaHeart,
  FaMapMarkerAlt,
  FaRegHeart,
  FaRulerCombined,
  FaStar,
  FaSyncAlt,
} from 'react-icons/fa';
import {
  addFavoriteApi,
  fetchFavoritesApi,
  getAuthSession,
  removeFavoriteApi,
  submitPropertyReportApi,
} from '../lib/auth';
import { fetchPropertyRows } from '../lib/properties';
import '../styles/Properties.css';

const PROPERTIES_PER_PAGE = 25;
const REPORT_CATEGORY_OPTIONS = [
  { value: 'cannot_open_site', label: 'Impossible d ouvrir le site source' },
  { value: 'bad_owner_experience', label: 'Mauvaise experience avec le proprietaire' },
  { value: 'bad_agency_experience', label: 'Mauvaise experience avec l agence' },
  { value: 'scam_suspicion', label: 'Suspicion d arnaque' },
  { value: 'incorrect_information', label: 'Informations incorrectes' },
  { value: 'other', label: 'Autre problème' },
];
const inferTypeFromTitle = (title) => {
  const lower = (title || '').toLowerCase();
  if (lower.includes('appartement')) return 'Appartement';
  if (lower.includes('villa')) return 'Villa';
  if (lower.includes('maison')) return 'Maison';
  if (lower.includes('terrain')) return 'Terrain';
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('bureau') || lower.includes('local')) return 'Bureau';
  return 'Maison';
};

const inferRoomsFromTitle = (title, min, max) => {
  const base = Math.max(1, Number(min || 1));
  const span = Math.max(1, Number(max || min || 1));
  const source = (title || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return base + (source % span);
};

const buildRating = (id) => {
  const base = Number(String(id || 1).replace(/\D/g, '').slice(-2) || 1);
  const rating = 4 + ((base % 10) / 20);
  return Math.min(4.9, Math.max(4.0, rating)).toFixed(1);
};

const Properties = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusedId, setFocusedId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoritePendingId, setFavoritePendingId] = useState(null);
  const [favoriteError, setFavoriteError] = useState('');
  const [favoriteNotice, setFavoriteNotice] = useState('');
  const [reportModalProperty, setReportModalProperty] = useState(null);
  const [reportCategory, setReportCategory] = useState('cannot_open_site');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  const currentUserRole = authSession?.user?.role || null;
  const isClientSession = Boolean(authSession?.token && currentUserRole === 'client');

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const rows = await fetchPropertyRows({ limit: 5000, signal: controller.signal });
      setProperties(rows);
    } catch (err) {
      console.error('Impossible de charger les biens :', err);
      if (err.name !== 'AbortError') {
        setProperties([]);
        setError('Impossible de charger les biens nettoyés depuis le serveur.');
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

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();
  const searchLocation = (searchParams.get('location') || '').trim().toLowerCase();
  const searchType = (searchParams.get('type') || '').trim().toLowerCase();
  const focusId = (searchParams.get('focusId') || '').trim();
  const favoritesOnly = searchParams.get('favorites') === '1';

  const favoriteIdSet = useMemo(
    () => new Set(favoriteIds.map((id) => String(id))),
    [favoriteIds],
  );

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const rawLocation = (property.location_raw || '').toLowerCase();
      const source = (property.source || '').toLowerCase();

      const matchesQuery =
        !searchQuery ||
        title.includes(searchQuery) ||
        city.includes(searchQuery) ||
        rawLocation.includes(searchQuery) ||
        source.includes(searchQuery);

      const matchesLocation =
        !searchLocation ||
        city.includes(searchLocation) ||
        rawLocation.includes(searchLocation);

      const matchesType = !searchType || title.includes(searchType);

      const matchesFavorites = !favoritesOnly || favoriteIdSet.has(String(property.id));

      return (
        matchesQuery &&
        matchesLocation &&
        matchesType &&
        matchesFavorites
      );
    });
  }, [
    properties,
    searchQuery,
    searchLocation,
    searchType,
    favoritesOnly,
    favoriteIdSet,
  ]);

  const totalPages = useMemo(() => {
    if (!filteredProperties.length) return 1;
    return Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  }, [filteredProperties.length]);

  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * PROPERTIES_PER_PAGE;
    return filteredProperties.slice(start, start + PROPERTIES_PER_PAGE);
  }, [currentPage, filteredProperties]);

  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfWindow);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = endPage - maxVisiblePages + 1;
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [currentPage, totalPages]);

  const visibleRangeStart = filteredProperties.length === 0 ? 0 : (currentPage - 1) * PROPERTIES_PER_PAGE + 1;
  const visibleRangeEnd = Math.min(currentPage * PROPERTIES_PER_PAGE, filteredProperties.length);

  const selectedProperty = useMemo(() => {
    if (!paginatedProperties.length) return null;
    const found = paginatedProperties.find((property) => String(property.id) === String(selectedPropertyId));
    return found || paginatedProperties[0];
  }, [paginatedProperties, selectedPropertyId]);

  useEffect(() => {
    if (selectedProperty) {
      setSelectedPropertyId(selectedProperty.id);
    }
  }, [selectedProperty]);

  useEffect(() => {
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (loading || !focusId) return;

    const focusedPropertyIndex = filteredProperties.findIndex(
      (property) => String(property.id) === String(focusId),
    );

    if (focusedPropertyIndex === -1) return;

    const focusPage = Math.floor(focusedPropertyIndex / PROPERTIES_PER_PAGE) + 1;
    if (focusPage !== currentPage) {
      setCurrentPage(focusPage);
      return;
    }

    const selector = `[data-property-id="${focusId}"]`;
    const target = document.querySelector(selector);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedId(String(focusId));
    setSelectedPropertyId(focusId);

    const timeoutId = setTimeout(() => setFocusedId(null), 2200);
    return () => clearTimeout(timeoutId);
  }, [currentPage, filteredProperties, focusId, loading]);

  const formatPrice = (property) => {
    const numeric = Number(property.price_value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
    }
    return property.price_raw || 'Prix non communiqué';
  };

  const formatDate = (value) => {
    if (!value) return 'Date non disponible';
    return new Date(value).toLocaleDateString('fr-TN');
  };

  const openSimulationForProperty = (property) => {
    const params = new URLSearchParams();
    if (property.id) params.set('propertyId', String(property.id));
    if (property.title) params.set('title', property.title);
    if (property.location_raw || property.city) params.set('location', property.location_raw || property.city);
    if (property.price_value) params.set('price', String(property.price_value));
    navigate(`/credit-simulation?${params.toString()}`);
  };

  const updateFavoritesFilter = (nextValue) => {
    const params = new URLSearchParams(location.search);
    if (nextValue) {
      params.set('favorites', '1');
    } else {
      params.delete('favorites');
    }

    const query = params.toString();
    navigate(query ? `/properties?${query}` : '/properties');
  };

  const toggleFavorite = async (event, property) => {
    event.stopPropagation();
    setFavoriteError('');
    setFavoriteNotice('');

    if (!authSession?.token) {
      navigate('/login', { state: { from: `/properties${location.search}` } });
      return;
    }

    if (currentUserRole !== 'client') {
      setFavoriteError('Les favoris sont disponibles uniquement pour les comptes client.');
      return;
    }

    const propertyId = String(property.id);
    const isFavorite = favoriteIdSet.has(propertyId);
    setFavoritePendingId(propertyId);

    setFavoriteIds((prev) => {
      if (isFavorite) {
        return prev.filter((id) => String(id) !== propertyId);
      }

      return prev.some((id) => String(id) === propertyId) ? prev : [...prev, propertyId];
    });

    try {
      if (isFavorite) {
        await removeFavoriteApi(property.id, authSession.token);
      } else {
        await addFavoriteApi(property.id, authSession.token);
      }

      setFavoriteNotice(
        isFavorite
          ? 'Le bien a été retiré de vos favoris.'
          : 'Le bien a été ajouté à vos favoris.',
      );
    } catch (err) {
      console.error('Impossible de mettre à jour le favori :', err);

      setFavoriteIds((prev) => {
        if (isFavorite) {
          return prev.some((id) => String(id) === propertyId) ? prev : [...prev, propertyId];
        }

        return prev.filter((id) => String(id) !== propertyId);
      });

      setFavoriteError(err.message || 'Impossible de mettre à jour ce favori.');
    } finally {
      setFavoritePendingId(null);
    }
  };

  const openReportModal = (property, event) => {
    if (event) {
      event.stopPropagation();
    }

    setReportError('');
    setReportNotice('');

    if (!authSession?.token) {
      navigate('/login', { state: { from: `/properties${location.search}` } });
      return;
    }

    if (currentUserRole !== 'client') {
      setReportError('Le signalement est disponible uniquement pour les comptes client.');
      return;
    }

    setReportCategory('cannot_open_site');
    setReportMessage('');
    setReportModalProperty(property);
  };

  const closeReportModal = () => {
    if (reportSubmitting) return;
    setReportModalProperty(null);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportModalProperty) return;

    const trimmedMessage = reportMessage.trim();
    if (trimmedMessage.length < 6) {
      setReportError('Veuillez décrire le problème avec au moins 6 caractères.');
      return;
    }

    try {
      setReportSubmitting(true);
      setReportError('');

      await submitPropertyReportApi(
        reportModalProperty.id,
        {
          category: reportCategory,
          message: trimmedMessage,
        },
        authSession.token,
      );

      setReportNotice('Votre signalement a été envoyé à l’équipe admin.');
      setReportModalProperty(null);
      setReportMessage('');
      setReportCategory('cannot_open_site');
    } catch (err) {
      console.error('Impossible d’envoyer le signalement :', err);
      setReportError(err.message || 'Impossible d’envoyer le signalement.');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="properties-page marketplace-mode">
      <div className="marketplace-shell">
        <section className="cards-panel">
          <header className="cards-header">
            <div>
              <p className="cards-title-label">Bien immobilier</p>
              <h1>{favoritesOnly ? 'Vos biens favoris' : 'Explorez les meilleurs biens'}</h1>
              <p>
                {loading
                  ? 'Chargement des données...'
                  : `${visibleRangeStart}-${visibleRangeEnd} sur ${filteredProperties.length} bien(s)`}
              </p>
            </div>

            <div className="cards-header-actions">
              {currentUserRole === 'client' && (
                <button
                  type="button"
                  className={`favorites-filter-btn ${favoritesOnly ? 'is-active' : ''}`}
                  onClick={() => updateFavoritesFilter(!favoritesOnly)}
                >
                  {favoritesOnly ? <FaHeart /> : <FaRegHeart />}
                  <span>{favoritesOnly ? 'Tous les biens' : `Mes favoris (${favoriteIds.length})`}</span>
                </button>
              )}
              <button type="button" onClick={fetchProperties} className="refresh-btn">
                <FaSyncAlt /> Actualiser
              </button>
            </div>
          </header>

          {error && <div className="properties-warning">{error}</div>}
          {favoriteError && <div className="properties-error">{favoriteError}</div>}
          {favoriteNotice && <div className="properties-success">{favoriteNotice}</div>}
          {reportError && <div className="properties-error">{reportError}</div>}
          {reportNotice && <div className="properties-success">{reportNotice}</div>}
          {!loading && favoritesOnly && !authSession?.token && (
            <div className="properties-warning">
              Connectez-vous pour retrouver vos biens favoris sauvegardés.
            </div>
          )}
          {!loading && favoritesOnly && authSession?.token && currentUserRole !== 'client' && (
            <div className="properties-warning">
              Les favoris sont actuellement disponibles pour les comptes client.
            </div>
          )}
          {loading && <div className="properties-loading">Chargement des biens disponibles...</div>}

          {!loading && filteredProperties.length > 0 && (
            <>
              <div className="properties-grid new-grid">
                {paginatedProperties.map((property) => {
                  const type = inferTypeFromTitle(property.title);
                  const active = String(selectedProperty?.id) === String(property.id);
                  const propertyId = String(property.id);
                  const isFavorite = favoriteIdSet.has(propertyId);
                  const isFavoritePending = favoritePendingId === propertyId;

                  return (
                    <article
                      className={`property-card compact-card ${active ? 'is-active' : ''} ${focusedId === String(property.id) ? 'property-card--focused' : ''}`}
                      key={property.id}
                      data-property-id={property.id}
                      onClick={() => setSelectedPropertyId(property.id)}
                    >
                      <div className="property-card-image-wrap">
                        {property.image ? (
                          <img src={property.image} alt={property.title || 'Bien immobilier'} className="property-card-image" loading="lazy" />
                        ) : (
                          <div className="property-card-image-placeholder">Image non disponible</div>
                        )}
                        <span className="property-badge">{type}</span>
                        <button
                          type="button"
                          className={`favorite-toggle-btn ${isFavorite ? 'is-active' : ''} ${isFavoritePending ? 'is-loading' : ''}`}
                          onClick={(event) => toggleFavorite(event, property)}
                          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          aria-pressed={isFavorite}
                          disabled={isFavoritePending}
                        >
                          {isFavorite ? <FaHeart /> : <FaRegHeart />}
                        </button>
                        <button
                          type="button"
                          className="report-toggle-btn"
                          onClick={(event) => openReportModal(property, event)}
                          aria-label="Signaler cette annonce"
                        >
                          <FaFlag />
                        </button>
                      </div>

                      <div className="property-card-body">
                        <h3>{property.title || 'Titre non disponible'}</h3>
                        <p className="property-card-location">
                          <FaMapMarkerAlt /> {property.location_raw || property.city || 'Localisation non disponible'}
                        </p>
                        <div className="property-card-footer-row">
                          <p className="property-card-price">{formatPrice(property)}</p>
                          <span className="rating-pill"><FaStar /> {buildRating(property.id)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav className="properties-pagination" aria-label="Pagination des biens">
                  <button
                    type="button"
                    className="pagination-btn pagination-btn--nav"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Précédent
                  </button>

                  <div className="pagination-pages">
                    {visiblePageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`pagination-btn ${pageNumber === currentPage ? 'is-active' : ''}`}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="pagination-btn pagination-btn--nav"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </>
          )}

          {!loading && favoriteLoading && currentUserRole === 'client' && !favoriteIds.length && (
            <div className="properties-loading">Chargement de vos favoris...</div>
          )}

          {!loading && filteredProperties.length === 0 && (
            <div className="properties-empty">
              {favoritesOnly
                ? 'Aucun bien favori trouvé pour le moment.'
                : 'Aucun bien ne correspond à votre recherche.'}
            </div>
          )}
        </section>

        <aside className="details-panel">
          {selectedProperty ? (
            <>
              <div className="details-media">
                {selectedProperty.image ? (
                  <img src={selectedProperty.image} alt={selectedProperty.title || 'Bien immobilier'} className="details-main-image" />
                ) : (
                  <div className="details-main-image image-fallback">Image non disponible</div>
                )}
                <div className="details-thumbs">
                  {[1, 2, 3].map((index) => (
                    <div className="thumb" key={`${selectedProperty.id}-${index}`}>
                      {selectedProperty.image ? (
                        <img src={selectedProperty.image} alt={`thumb-${index}`} />
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="details-headline">
                <h2>{selectedProperty.title || 'Titre du bien'}</h2>
                <p>{selectedProperty.location_raw || selectedProperty.city || 'Localisation non disponible'}</p>
                <div className="details-price">{formatPrice(selectedProperty)}</div>
                <div className="details-favorite-row">
                  <button
                    type="button"
                    className={`details-favorite-btn ${favoriteIdSet.has(String(selectedProperty.id)) ? 'is-active' : ''}`}
                    onClick={(event) => toggleFavorite(event, selectedProperty)}
                    disabled={favoritePendingId === String(selectedProperty.id)}
                  >
                    {favoriteIdSet.has(String(selectedProperty.id)) ? <FaHeart /> : <FaRegHeart />}
                    <span>
                      {favoriteIdSet.has(String(selectedProperty.id))
                        ? 'Enregistré dans vos favoris'
                        : 'Ajouter aux favoris'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="details-report-btn"
                    onClick={(event) => openReportModal(selectedProperty, event)}
                  >
                    <FaFlag />
                    <span>Signaler un problème</span>
                  </button>
                </div>
              </div>

              <div className="details-tabs">
                <span className="is-active">Aperçu</span>
                <span>Avis</span>
                <span>À propos</span>
              </div>

              <div className="details-description">
                <h4>Description</h4>
                <p>{selectedProperty.description || 'Description non disponible pour ce bien.'}</p>
              </div>

              <div className="details-stats">
                <span><FaBed /> {inferRoomsFromTitle(selectedProperty.title, 2, 4)} chambres</span>
                <span><FaBath /> {inferRoomsFromTitle(selectedProperty.title, 1, 3)} salles de bain</span>
                <span><FaRulerCombined /> {inferRoomsFromTitle(selectedProperty.title, 90, 150)} m2</span>
              </div>

              <div className="details-actions">
                {selectedProperty.url ? (
                  <a href={selectedProperty.url} target="_blank" rel="noreferrer" className="btn-light">
                    Voir la source <FaExternalLinkAlt />
                  </a>
                ) : (
                  <span className="btn-light is-disabled">Source non disponible</span>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openSimulationForProperty(selectedProperty)}
                >
                  Simuler
                </button>
              </div>

              <div className="mini-map">
                <span className="pin pin-a" />
                <span className="pin pin-b" />
                <span className="pin pin-c" />
                <span className="map-label">{selectedProperty.city || 'Tunisie'}</span>
              </div>
              <p className="details-date">Mis à jour : {formatDate(selectedProperty.scraped_at)}</p>
            </>
          ) : (
            <div className="properties-empty">Aucun bien sélectionné pour le moment.</div>
          )}
        </aside>
      </div>

      {reportModalProperty && (
        <div className="properties-modal-backdrop" role="dialog" aria-modal="true" onClick={closeReportModal}>
          <div className="properties-report-modal" onClick={(event) => event.stopPropagation()}>
            <div className="properties-report-head">
              <h3>Signaler un problème</h3>
              <button
                type="button"
                className="properties-report-close"
                onClick={closeReportModal}
                disabled={reportSubmitting}
                aria-label="Fermer"
              >
                x
              </button>
            </div>

            <p className="properties-report-context">
              Bien concerné : <strong>{reportModalProperty.title || `#${reportModalProperty.id}`}</strong>
            </p>

            <form className="properties-report-form" onSubmit={submitReport}>
              <label htmlFor="report-category">Catégorie du problème</label>
              <select
                id="report-category"
                value={reportCategory}
                onChange={(event) => setReportCategory(event.target.value)}
                disabled={reportSubmitting}
              >
                {REPORT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="report-message">Détails</label>
              <textarea
                id="report-message"
                rows={5}
                value={reportMessage}
                onChange={(event) => setReportMessage(event.target.value)}
                placeholder="Expliquez le probleme rencontre avec cette annonce."
                disabled={reportSubmitting}
              />

              {reportError && <p className="properties-report-error">{reportError}</p>}

              <div className="properties-report-actions">
                <button
                  type="button"
                  className="btn-light"
                  onClick={closeReportModal}
                  disabled={reportSubmitting}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={reportSubmitting}>
                  {reportSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;

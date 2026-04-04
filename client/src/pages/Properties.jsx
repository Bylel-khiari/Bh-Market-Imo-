import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaExternalLinkAlt, FaSyncAlt } from 'react-icons/fa';
import '../styles/Properties.css';

const Properties = () => {
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/properties?limit=100`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      setProperties(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Impossible de charger les biens pour le moment. Verifiez que le serveur API est lance.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();
  const searchLocation = (searchParams.get('location') || '').trim().toLowerCase();
  const searchType = (searchParams.get('type') || '').trim().toLowerCase();

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

      return matchesQuery && matchesLocation && matchesType;
    });
  }, [properties, searchQuery, searchLocation, searchType]);

  const formatPrice = (property) => {
    const numeric = Number(property.price_value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
    }
    return property.price_raw || 'Prix non communique';
  };

  const formatDate = (value) => {
    if (!value) return 'Date non disponible';
    return new Date(value).toLocaleDateString('fr-TN');
  };

  return (
    <div className="properties-page">
      <section className="properties-hero">
        <div className="properties-hero-content">
          <span className="properties-tag">Catalogue immobilier</span>
          <h1>Biens disponibles</h1>
          <p>
            Parcourez les annonces avec photos et prix. La recherche se fait depuis la barre de navigation.
          </p>

          <div className="properties-toolbar">
            <button type="button" onClick={fetchProperties} className="properties-refresh-btn">
              <FaSyncAlt /> Actualiser
            </button>
          </div>
        </div>
      </section>

      <div className="properties-content">
        <section className="properties-list-header">
          <h2>Selection de biens</h2>
          <p>Affichage catalogue style ecommerce avec image, prix, localisation et source.</p>
        </section>

        <div className="properties-summary">
          <span>{loading ? 'Chargement...' : `${filteredProperties.length} bien(s) affiches`}</span>
          {!loading && (searchQuery || searchLocation || searchType) && (
            <span>
              Filtres actifs: {searchQuery || '-'} | {searchLocation || '-'} | {searchType || '-'}
            </span>
          )}
        </div>

        {error && (
          <div className="properties-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="properties-grid">
            {filteredProperties.map((property) => (
              <article className="property-card" key={property.id}>
                <div className="property-card-image-wrap">
                  {property.image ? (
                    <img src={property.image} alt={property.title || 'Bien immobilier'} className="property-card-image" loading="lazy" />
                  ) : (
                    <div className="property-card-image-placeholder">Image non disponible</div>
                  )}
                  <span className="property-card-source">{property.source || 'Source N/A'}</span>
                </div>

                <div className="property-card-body">
                  <h3>{property.title || 'Titre non disponible'}</h3>
                  <p className="property-card-location">{property.location_raw || property.city || 'Localisation non disponible'}</p>
                  <div className="property-card-meta">
                    <span>{property.city || 'Ville N/A'}</span>
                    <span>{formatDate(property.scraped_at)}</span>
                  </div>
                  <p className="property-card-price">{formatPrice(property)}</p>

                  {property.url ? (
                    <a href={property.url} target="_blank" rel="noreferrer" className="property-card-link">
                      Voir le detail <FaExternalLinkAlt />
                    </a>
                  ) : (
                    <span className="property-card-link-disabled">Lien indisponible</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {loading && (
          <div className="properties-loading">Chargement des biens nettoyes...</div>
        )}

        {!loading && !error && filteredProperties.length === 0 && (
          <div className="properties-empty">
            Aucun bien ne correspond a votre recherche.
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;

import React, { useEffect, useMemo, useState } from 'react';
import { FaMapMarkerAlt, FaExternalLinkAlt, FaSearch, FaSyncAlt } from 'react-icons/fa';
import '../styles/Properties.css';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchProperties = async () => {
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
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;

    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const location = (property.location_raw || '').toLowerCase();
      const source = (property.source || '').toLowerCase();
      return title.includes(q) || city.includes(q) || location.includes(q) || source.includes(q);
    });
  }, [properties, query]);

  const formatPrice = (property) => {
    const numeric = Number(property.price_value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
    }
    return property.price_raw || 'Prix non communique';
  };

  const resolveImage = (property) => {
    const imageUrl = (property.image || '').trim();
    if (!imageUrl) {
      return 'https://images.unsplash.com/photo-1560185008-b033106af5c3?w=1200&auto=format&fit=crop';
    }
    return imageUrl;
  };

  return (
    <div className="properties-page">
      <section className="properties-hero">
        <div className="properties-hero-content">
          <span className="properties-tag">Catalogue test</span>
          <h1>Biens depuis la table clean_listings</h1>
          <p>
            Cette page charge directement les donnees nettoyees depuis votre base MySQL
            pour valider l integration frontend/backend.
          </p>

          <div className="properties-toolbar">
            <div className="properties-search">
              <FaSearch />
              <input
                type="text"
                placeholder="Rechercher par titre, ville, localisation, source..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button type="button" onClick={fetchProperties} className="properties-refresh-btn">
              <FaSyncAlt /> Actualiser
            </button>
          </div>
        </div>
      </section>

      <div className="properties-content">
        <div className="properties-summary">
          <span>{loading ? 'Chargement...' : `${filteredProperties.length} bien(s) affiches`}</span>
          {query && <span>Filtre actif: "{query}"</span>}
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
                <div className="property-media">
                  <img src={resolveImage(property)} alt={property.title || 'Bien immobilier'} loading="lazy" />
                  <span className="property-price">{formatPrice(property)}</span>
                </div>

                <div className="property-body">
                  <h3>{property.title || 'Titre non disponible'}</h3>
                  <p className="property-location">
                    <FaMapMarkerAlt /> {property.location_raw || property.city || 'Localisation non disponible'}
                  </p>
                  <p className="property-description">
                    {(property.description || 'Description non disponible').slice(0, 160)}
                    {(property.description || '').length > 160 ? '...' : ''}
                  </p>

                  <div className="property-meta">
                    <span>{property.city || 'Ville N/A'}</span>
                    <span>{property.source || 'Source N/A'}</span>
                  </div>

                  {property.url && (
                    <a href={property.url} target="_blank" rel="noreferrer" className="property-link">
                      Voir l annonce <FaExternalLinkAlt />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {loading && (
          <div className="properties-loading-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="property-skeleton" key={index} />
            ))}
          </div>
        )}

        {!loading && !error && filteredProperties.length === 0 && (
          <div className="properties-empty">
            Aucun resultat pour ce filtre.
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;

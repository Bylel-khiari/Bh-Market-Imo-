import React, { useEffect, useMemo, useState } from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaCalendarAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { fetchPropertyRows } from '../lib/properties';
import '../styles/PropertyCarousel.css';

const PropertyCarousel = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeaturedProperties() {
      setLoading(true);
      setError('');

      try {
        const rows = await fetchPropertyRows({ limit: 8, signal: controller.signal });
        setProperties(rows.filter((row) => row.image || row.title));
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load featured properties:', err);
          setError('Impossible de charger les biens a la une pour le moment.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadFeaturedProperties();
    return () => controller.abort();
  }, []);

  const hasProperties = useMemo(() => properties.length > 0, [properties]);

  const formatPrice = (property) => {
    const numeric = Number(property.price_value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `${new Intl.NumberFormat('fr-TN').format(Math.round(numeric))} DT`;
    }
    return property.price_raw || 'Prix non communique';
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Date non disponible';
    return new Date(dateValue).toLocaleDateString('fr-TN');
  };

  const settings = {
    dots: true,
    infinite: hasProperties && properties.length > 3,
    speed: 500,
    slidesToShow: hasProperties ? Math.min(3, properties.length) : 1,
    slidesToScroll: 1,
    autoplay: hasProperties,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ]
  };

  if (loading) {
    return (
      <section className="properties-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">A la une</span>
            <h2 className="section-title">Biens immobiliers selectionnes</h2>
            <p className="section-desc">Chargement des biens depuis la base de donnees...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || !hasProperties) {
    return (
      <section className="properties-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">A la une</span>
            <h2 className="section-title">Biens immobiliers selectionnes</h2>
            <p className="section-desc">{error || 'Aucun bien n est disponible pour le moment.'}</p>
            <Link to="/properties" className="btn btn-primary">Voir le catalogue complet</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="properties-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">A la une</span>
          <h2 className="section-title">Biens immobiliers selectionnes</h2>
          <p className="section-desc">Decouvrez les dernieres annonces nettoyees et publiees par le backend</p>
        </div>
        <Slider {...settings}>
          {properties.map(property => (
            <div key={property.id} className="property-card-wrapper">
              <div className="property-card">
                <div className="property-image">
                  {property.image ? (
                    <img src={property.image} alt={property.title || 'Bien immobilier'} loading="lazy" />
                  ) : (
                    <div className="property-image-placeholder">Image non disponible</div>
                  )}
                  <span className="property-price">{formatPrice(property)}</span>
                </div>
                <div className="property-info">
                  <h3>{property.title || 'Bien immobilier'}</h3>
                  <p className="property-location">
                    <FaMapMarkerAlt /> {property.location_raw || property.city || 'Localisation non disponible'}
                  </p>
                  <div className="property-features">
                    <span><FaCalendarAlt /> {formatDate(property.scraped_at)}</span>
                    <span>{property.city || 'Ville N/A'}</span>
                    <span>{property.source || 'Source N/A'}</span>
                  </div>
                  {property.url ? (
                    <a href={property.url} target="_blank" rel="noreferrer" className="btn btn-primary">
                      Voir details <FaExternalLinkAlt />
                    </a>
                  ) : (
                    <Link to="/properties" className="btn btn-primary">Voir details</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
};

export default PropertyCarousel;

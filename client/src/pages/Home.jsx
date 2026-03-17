import React from 'react';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import { FaHome, FaChartLine, FaRobot, FaFileAlt, FaArrowRight, FaShieldAlt, FaUsers, FaBuilding, FaCheckCircle, FaMapMarkerAlt, FaBed, FaBath, FaArrowsAlt } from 'react-icons/fa';
import '../styles/Home.css';

const Home = () => {
  const properties = [
    {
      id: 1,
      title: 'Appartement luxueux',
      location: 'Les Berges du Lac, Tunis',
      price: '450 000 DT',
      rooms: 4,
      baths: 3,
      area: '180 m\u00B2',
      image: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=500'
    },
    {
      id: 2,
      title: 'Villa avec piscine',
      location: 'Gammarth, Tunis',
      price: '850 000 DT',
      rooms: 6,
      baths: 4,
      area: '350 m\u00B2',
      image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500'
    },
    {
      id: 3,
      title: 'Appartement moderne',
      location: 'Ennasr, Ariana',
      price: '320 000 DT',
      rooms: 3,
      baths: 2,
      area: '120 m\u00B2',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500'
    },
    {
      id: 4,
      title: 'Bureau commercial',
      location: 'Centre Urbain Nord, Tunis',
      price: '280 000 DT',
      rooms: 2,
      baths: 2,
      area: '100 m\u00B2',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=500'
    }
  ];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } }
    ]
  };

  return (
    <div className="home">

      {/* ── Hero Section ── */}
      <div className="hero-section">
        <div className="hero-container">
          <div className="hero-badge">
            <FaShieldAlt /> Plateforme certifiee BH Bank
          </div>
          <h1>Votre Marketplace <span className="hero-accent">Immobilier</span> de Confiance</h1>
          <p className="hero-subtitle">
            Decouvrez, simulez et financez votre projet immobilier en toute securite
            avec BH Bank, leader du credit immobilier en Tunisie.
          </p>
          <div className="hero-actions">
            <Link to="/credit-simulation" className="btn-hero-primary">
              Simuler mon credit <FaArrowRight />
            </Link>
            <Link to="/properties" className="btn-hero-secondary">
              Explorer les biens
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">15K+</span>
            <span className="stat-label">Clients actifs</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">3 200+</span>
            <span className="stat-label">Biens disponibles</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">98%</span>
            <span className="stat-label">Satisfaction</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">24h</span>
            <span className="stat-label">Reponse garantie</span>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="content-wrapper">

        {/* ── Services Section ── */}
        <div className="services-section">
          <div className="section-header">
            <div>
              <div className="section-tag">Nos services</div>
              <h2>Solutions Immobilieres</h2>
            </div>
          </div>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon"><FaHome /></div>
              <div className="service-text">
                <h3>Marketplace Immobiliere</h3>
                <p>Consultez des milliers de biens immobiliers actualises quotidiennement sur tout le territoire</p>
              </div>
              <Link to="/properties" className="service-action"><FaArrowRight /></Link>
            </div>
            <div className="service-card">
              <div className="service-icon"><FaRobot /></div>
              <div className="service-text">
                <h3>Assistant Virtuel</h3>
                <p>Un chatbot intelligent disponible 24/7 pour vous accompagner dans toutes vos demarches</p>
              </div>
              <button className="service-action"><FaArrowRight /></button>
            </div>
            <div className="service-card">
              <div className="service-icon"><FaChartLine /></div>
              <div className="service-text">
                <h3>Tableaux de Bord</h3>
                <p>Suivez les KPI et l'evolution du marche immobilier avec des analyses en temps reel</p>
              </div>
              <Link to="/dashboard" className="service-action"><FaArrowRight /></Link>
            </div>
            <div className="service-card">
              <div className="service-icon"><FaFileAlt /></div>
              <div className="service-text">
                <h3>Credit Immobilier</h3>
                <p>Processus d'octroi simplifie et automatise avec des taux competitifs garantis</p>
              </div>
              <Link to="/credit-simulation" className="service-action"><FaArrowRight /></Link>
            </div>
          </div>
        </div>

        {/* ── Properties Carousel ── */}
        <div className="properties-section-home">
          <div className="section-header">
            <div>
              <div className="section-tag">A la une</div>
              <h2>Biens Immobiliers</h2>
            </div>
            <Link to="/properties" className="properties-view-all">
              Voir tout <FaArrowRight />
            </Link>
          </div>
          <Slider {...sliderSettings}>
            {properties.map(property => (
              <div key={property.id} className="prop-card-wrap">
                <div className="prop-card">
                  <div className="prop-image">
                    <img src={property.image} alt={property.title} />
                    <span className="prop-price">{property.price}</span>
                  </div>
                  <div className="prop-info">
                    <h3>{property.title}</h3>
                    <p className="prop-location">
                      <FaMapMarkerAlt /> {property.location}
                    </p>
                    <div className="prop-features">
                      <span><FaBed /> {property.rooms} ch</span>
                      <span><FaBath /> {property.baths} sdb</span>
                      <span><FaArrowsAlt /> {property.area}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>

        {/* ── Trust Section ── */}
        <div className="trust-section">
          <div className="trust-grid">
            <div className="trust-item">
              <FaShieldAlt /> <span>Transactions securisees</span>
            </div>
            <div className="trust-item">
              <FaUsers /> <span>Accompagnement personnalise</span>
            </div>
            <div className="trust-item">
              <FaBuilding /> <span>Biens verifies</span>
            </div>
            <div className="trust-item">
              <FaCheckCircle /> <span>Garantie BH Bank</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;

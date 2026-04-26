import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaRobot, FaFileAlt, FaArrowRight, FaShieldAlt, FaUsers, FaBuilding, FaCheckCircle } from 'react-icons/fa';
import HomeMapSection from '../features/map/pages/HomeMapSection';
import PropertyCarousel from '../components/PropertyCarousel';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home">

      {/* ── Hero Section ── */}
      <div className="hero-section">
        <div className="hero-container">
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

      {/* ── Main Content ── */}
      <div className="content-wrapper">

        {/* ── Tunisia Map Section ── */}
        <div className="map-section-home">
          <div className="section-header">
            <div>
              <div className="section-tag">Carte interactive</div>
              <h2>Carte des gouvernorats</h2>
            </div>
          </div>
          <HomeMapSection />
        </div>

        <PropertyCarousel />

        {/* ── Services Section ── */}
        <div className="services-section">
          <div className="section-header">
            <div>
              <div className="section-tag">Nos services</div>
              <h2>Solutions Immobilieres</h2>
            </div>
          </div>
          <div className="services-grid services-grid--client">
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
              <div className="service-icon"><FaFileAlt /></div>
              <div className="service-text">
                <h3>Credit Immobilier</h3>
                <p>Processus d'octroi simplifie et automatise avec des taux competitifs garantis</p>
              </div>
              <Link to="/credit-simulation" className="service-action"><FaArrowRight /></Link>
            </div>
          </div>
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

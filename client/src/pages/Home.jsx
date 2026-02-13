import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaChartLine, FaRobot, FaFileAlt } from 'react-icons/fa';
import PropertyCarousel from '../components/PropertyCarousel';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home">
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1> BH  MARKET IMO </h1>
            <p>Vous voulez suivre et gérer vos comptes, assurer vos transactions à distance  Plus besoin de passer par votre point de vente.</p>
            <p>La BH Bank s'approche encore plus de vous et met à votre disposition une panoplie de services en ligne dédiés dans le but de faciliter votre quotidien en toute sécurité.</p>
            <div className="hero-actions">
              <Link to="/credit-simulation" className="btn btn-primary">
                Simuler mon crédit
              </Link>
              <Link to="/properties" className="btn btn-secondary">
                Voir les biens
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaHome />
              </div>
              <h3>Marketplace Immobilière</h3>
              <p>Consultez des milliers de biens immobiliers actualisés quotidiennement</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaRobot />
              </div>
              <h3>Assistant Virtuel</h3>
              <p>Un chatbot intelligent pour vous accompagner dans vos démarches</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3>Tableaux de Bord</h3>
              <p>Suivez les KPI et l'évolution du marché immobilier</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaFileAlt />
              </div>
              <h3>Crédit Immobilier</h3>
              <p>Processus d'octroi simplifié et automatisé</p>
            </div>
          </div>
        </div>
      </section>
      <PropertyCarousel />
    </div>
  );
};

export default Home;

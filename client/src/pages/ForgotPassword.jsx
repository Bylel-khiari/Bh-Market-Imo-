import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaHome, FaCalculator, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import logo from '../assets/favicon.ico';
import '../styles/Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-brand">
            <img src={logo} alt="BH Bank" className="login-logo" />
            <div className="login-brand-line"></div>
            <h2 className="login-subtitle">MARKETPLACE IMMOBILIER</h2>
          </div>

          <p className="login-tagline">
            Recuperez l'acces a votre espace en toute securite et recevez un lien
            de reinitialisation directement par email.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaHome /></div>
              <div className="login-feature-text">
                <strong>Immobilier</strong>
                <span>Decouvrez les meilleures opportunites</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaCalculator /></div>
              <div className="login-feature-text">
                <strong>Simulation de Credit</strong>
                <span>Pilotez votre projet en quelques clics</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaChartLine /></div>
              <div className="login-feature-text">
                <strong>Suivi en Temps Reel</strong>
                <span>Retrouvez vos demandes dans votre espace</span>
              </div>
            </div>
          </div>

          <div className="login-trust">
            <div className="login-trust-stats">
              <div className="login-stat">
                <strong>15K+</strong>
                <span>Clients</span>
              </div>
              <div className="login-stat-divider"></div>
              <div className="login-stat">
                <strong>3K+</strong>
                <span>Biens</span>
              </div>
              <div className="login-stat-divider"></div>
              <div className="login-stat">
                <strong>98%</strong>
                <span>Satisfaction</span>
              </div>
            </div>
            <div className="login-trust-badge">
              <FaShieldAlt />
              <span>Reinitialisation securisee - Donnees protegees</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Mot de passe oublie</h2>
            <p>Recevez un lien de reinitialisation par email</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="login-input-icon">
                <FaEnvelope />
              </div>
              <input
                type="email"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="login-submit-btn">
              Envoyer le lien
            </button>

            <div className="login-divider">
              <span>ou</span>
            </div>

            <div className="login-register">
              <p>
                Vous vous souvenez de votre mot de passe ? <Link to="/login">Se connecter</Link>
              </p>
            </div>
          </form>

          <div className="login-back-home">
            <Link to="/">← Retour a l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaHome, FaCalculator, FaChartLine } from 'react-icons/fa';
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
            <h2 className="login-subtitle">Plateforme immobilière</h2>
          </div>

          <p className="login-tagline">
            Récupérez l'accès à votre espace en toute sécurité et recevez un lien
            de réinitialisation directement par e-mail.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaHome /></div>
              <div className="login-feature-text">
                <strong>Immobilier</strong>
                <span>Découvrez les meilleures opportunités</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaCalculator /></div>
              <div className="login-feature-text">
                <strong>Simulation de crédit</strong>
                <span>Pilotez votre projet en quelques clics</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaChartLine /></div>
              <div className="login-feature-text">
                <strong>Suivi en temps réel</strong>
                <span>Retrouvez vos demandes dans votre espace</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Mot de passe oublié</h2>
            <p>Recevez un lien de réinitialisation par e-mail</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="login-input-icon">
                <FaEnvelope />
              </div>
              <input
                type="email"
                placeholder="Adresse e-mail"
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

            <div className="login-account-note">
              <p>
                Vous vous souvenez de votre mot de passe ? <Link to="/login">Se connecter</Link>
              </p>
            </div>
          </form>

          <div className="login-back-home">
            <Link to="/">← Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

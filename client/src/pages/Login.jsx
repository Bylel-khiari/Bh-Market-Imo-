import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaHome, FaCalculator, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import logo from '../assets/favicon.ico';
import '../styles/Login.css';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="login-page">
      {/* Left Panel - Branding */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-brand">
            <img src={logo} alt="BH Bank" className="login-logo" />
            <div className="login-brand-line"></div>
            <h2 className="login-subtitle">MARKETPLACE IMMOBILIER</h2>
          </div>

          <p className="login-tagline">
            La plateforme digitale de reference pour vos investissements immobiliers en Tunisie
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaHome /></div>
              <div className="login-feature-text">
                <strong>Immobilier</strong>
                <span>Achat, vente et estimation de biens</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaCalculator /></div>
              <div className="login-feature-text">
                <strong>Simulation de Credit</strong>
                <span>Calculez vos mensualites en ligne</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaChartLine /></div>
              <div className="login-feature-text">
                <strong>Tableau de Bord</strong>
                <span>Suivi en temps reel de vos projets</span>
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
              <span>Connexion 100% securisee — SSL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Connexion</h2>
            <p>Accédez à votre espace client</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="login-input-icon">
                <FaUser />
              </div>
              <input
                type="text"
                placeholder="Identifiant"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className="login-input-group">
              <div className="login-input-icon">
                <FaLock />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" />
                <span>Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className="login-forgot">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" className="login-submit-btn">
              Se connecter
            </button>

            <div className="login-divider">
              <span>ou</span>
            </div>

            <div className="login-register">
              <p>
                Vous n'avez pas de compte ?{' '}
                <Link to="/register">Créer un compte</Link>
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

export default Login;

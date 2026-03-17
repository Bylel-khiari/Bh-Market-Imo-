import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaHome,
  FaCalculator,
  FaChartLine,
  FaShieldAlt,
} from 'react-icons/fa';
import logo from '../assets/favicon.ico';
import '../styles/Login.css';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
            Creez votre compte pour suivre vos projets immobiliers, simuler vos credits
            et acceder a un accompagnement personnalise.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaHome /></div>
              <div className="login-feature-text">
                <strong>Immobilier</strong>
                <span>Explorez des opportunites partout en Tunisie</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaCalculator /></div>
              <div className="login-feature-text">
                <strong>Simulation de Credit</strong>
                <span>Calculez rapidement vos mensualites</span>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon"><FaChartLine /></div>
              <div className="login-feature-text">
                <strong>Espace Personnel</strong>
                <span>Centralisez vos demandes et votre suivi</span>
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
              <span>Inscription securisee - Protection des donnees</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Creer un compte</h2>
            <p>Inscrivez-vous pour acceder a votre espace client</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="login-input-icon">
                <FaUser />
              </div>
              <input
                type="text"
                placeholder="Nom complet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

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

            <div className="login-input-group">
              <div className="login-input-icon">
                <FaLock />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button type="submit" className="login-submit-btn">
              S'inscrire
            </button>

            <div className="login-divider">
              <span>ou</span>
            </div>

            <div className="login-register">
              <p>
                Vous avez deja un compte ? <Link to="/login">Se connecter</Link>
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

export default Register;

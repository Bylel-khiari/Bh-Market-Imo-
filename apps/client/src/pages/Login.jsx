import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaHome, FaCalculator, FaChartLine } from 'react-icons/fa';
import logo from '../assets/favicon.ico';
import { loginApi, saveAuthSession } from '../lib/auth';
import '../styles/Login.css';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resolveDestination = (user) => {
    if (location.state?.from) {
      return location.state.from;
    }

    if (user?.role === 'admin') {
      return '/admin/dashboard';
    }

    if (user?.role === 'agent_bancaire') {
      return '/agent/dashboard';
    }

    return '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Veuillez saisir votre email et votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = await loginApi({ email: identifier.trim(), password });
      saveAuthSession({ token: payload.token, user: payload.user });
      navigate(resolveDestination(payload.user), { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Echec de connexion.');
    } finally {
      setIsSubmitting(false);
    }
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
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>Connexion</h2>
            <p>Accedez a votre espace client</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="login-input-icon">
                <FaUser />
              </div>
              <input
                type="email"
                placeholder="Adresse email"
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
                Mot de passe oublie ?
              </Link>
            </div>

            <button type="submit" className="login-submit-btn">
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>

            {errorMessage && <p className="login-error-message">{errorMessage}</p>}

            <div className="login-account-note">
              <p>
                Votre compte est cree par l administrateur BH Bank. Contactez votre agence pour recevoir vos identifiants.
              </p>
            </div>
          </form>

          <div className="login-back-home">
            <Link to="/">Retour a l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

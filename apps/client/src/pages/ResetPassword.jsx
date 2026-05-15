import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaCalculator,
  FaChartLine,
  FaEye,
  FaEyeSlash,
  FaHome,
  FaLock,
} from 'react-icons/fa';
import { resetPasswordApi } from '../lib/auth';
import logo from '../assets/favicon.ico';
import '../styles/Login.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!token) {
      return 'Lien de réinitialisation manquant.';
    }

    if (!form.new_password || !form.confirm_password) {
      return 'Veuillez saisir et confirmer votre nouveau mot de passe.';
    }

    if (form.new_password.length < 6) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }

    if (form.new_password !== form.confirm_password) {
      return 'La confirmation ne correspond pas au nouveau mot de passe.';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await resetPasswordApi({
        token,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      setForm({ new_password: '', confirm_password: '' });
      setSuccessMessage('Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.');
    } catch (error) {
      setErrorMessage(error.message || 'Impossible de réinitialiser le mot de passe.');
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
            <h2 className="login-subtitle">Plateforme immobilière</h2>
          </div>

          <p className="login-tagline">
            Définissez un nouveau mot de passe sécurisé pour retrouver l'accès à votre espace.
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
            <h2>Nouveau mot de passe</h2>
            <p>Choisissez un mot de passe différent de l'ancien</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <div className="login-input-icon">
                <FaLock />
              </div>
              <input
                name="new_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nouveau mot de passe"
                value={form.new_password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={isSubmitting || !token || Boolean(successMessage)}
                required
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="login-input-group">
              <div className="login-input-icon">
                <FaLock />
              </div>
              <input
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmer le nouveau mot de passe"
                value={form.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={isSubmitting || !token || Boolean(successMessage)}
                required
              />
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting || !token || Boolean(successMessage)}
            >
              {isSubmitting ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>

            {!token && <p className="login-error-message">Lien de réinitialisation manquant.</p>}
            {errorMessage && <p className="login-error-message">{errorMessage}</p>}
            {successMessage && <p className="login-success-message">{successMessage}</p>}

            <div className="login-divider">
              <span>ou</span>
            </div>

            <div className="login-account-note">
              <p>
                Vous pouvez maintenant revenir à la page de connexion. <Link to="/login">Se connecter</Link>
              </p>
            </div>
          </form>

          <div className="login-back-home">
            <Link to="/">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

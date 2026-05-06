import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaIdBadge,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaUserCircle,
} from 'react-icons/fa';
import {
  changePasswordApi,
  clearAuthSession,
  getAuthSession,
  isAuthError,
  meApi,
} from '../lib/auth';
import '../styles/ProfileManagement.css';

const roleLabels = {
  client: 'Client',
  agent_bancaire: 'Agent bancaire',
  admin: 'Administrateur',
};

const emptyPasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
};

function getInitials(nameOrEmail) {
  const raw = String(nameOrEmail || '').trim();
  if (!raw) return 'BH';

  const parts = raw
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'BH';
}

function getPasswordStrength(password) {
  const value = String(password || '');
  let score = 0;

  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) return { label: 'Aucun', tone: 'empty', score: 0 };
  if (score <= 2) return { label: 'Basique', tone: 'low', score };
  if (score <= 4) return { label: 'Correct', tone: 'medium', score };
  return { label: 'Fort', tone: 'strong', score };
}

function AccountInfoItem({ icon: Icon, label, value }) {
  return (
    <div className="pm-info-item">
      <span className="pm-info-icon">
        <Icon />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value || 'Non renseigné'}</strong>
      </span>
    </div>
  );
}

const ProfileManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(emptyPasswordForm);
  const [visibleFields, setVisibleFields] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      const session = getAuthSession();
      if (!session?.token) {
        navigate('/login');
        return;
      }

      try {
        const payload = await meApi(session.token);
        if (!ignore) {
          setUser(payload.user || null);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          clearAuthSession();
          setError('Session invalide. Veuillez vous reconnecter.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadUser();
    return () => {
      ignore = true;
    };
  }, [navigate]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.new_password),
    [form.new_password],
  );

  const passwordRules = [
    { label: '6 caractères minimum', valid: form.new_password.length >= 6 },
    { label: 'Confirmation identique', valid: form.confirm_password && form.confirm_password === form.new_password },
    { label: 'Différent du mot de passe actuel', valid: form.current_password && form.current_password !== form.new_password },
  ];

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError('');
    setFormSuccess('');
  };

  const toggleFieldVisibility = (fieldName) => {
    setVisibleFields((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }));
  };

  const validateForm = () => {
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      return 'Veuillez remplir les trois champs.';
    }

    if (form.new_password.length < 6) {
      return 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
    }

    if (form.new_password !== form.confirm_password) {
      return 'La confirmation ne correspond pas au nouveau mot de passe.';
    }

    if (form.current_password === form.new_password) {
      return 'Le nouveau mot de passe doit être différent du mot de passe actuel.';
    }

    return '';
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const session = getAuthSession();
    if (!session?.token) {
      navigate('/login');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      setFormSuccess('');

      await changePasswordApi(form, session.token);

      setForm(emptyPasswordForm);
      setVisibleFields({});
      setFormSuccess('Mot de passe mis à jour avec succès.');
    } catch (err) {
      const message = err.message || 'Impossible de mettre à jour le mot de passe.';
      const lowerMessage = message.toLowerCase();

      if (isAuthError(err) && !lowerMessage.includes('mot de passe')) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const accountName = user?.name || user?.email || 'Compte BH';

  return (
    <div className="profile-management-page">
      <div className="profile-management-container">
        <header className="profile-management-head">
          <div>
            <span className="pm-eyebrow">Espace sécurisé</span>
            <h1>Gestion du compte</h1>
            <p>Vos informations sont verrouillées. Seul le mot de passe peut être modifié.</p>
          </div>
        </header>

        {loading && (
          <section className="pm-state-card">
            <FaShieldAlt />
            <p>Chargement du compte...</p>
          </section>
        )}

        {!loading && error && (
          <section className="pm-state-card pm-state-card--error">
            <FaLock />
            <p>{error}</p>
          </section>
        )}

        {!loading && !error && (
          <div className="pm-layout">
            <aside className="pm-account-card">
              <div className="pm-avatar">{getInitials(accountName)}</div>
              <div className="pm-account-title">
                <span>Compte connecté</span>
                <h2>{accountName}</h2>
              </div>

              <div className="pm-account-list">
                <AccountInfoItem icon={FaUserCircle} label="Nom" value={user?.name} />
                <AccountInfoItem icon={FaEnvelope} label="E-mail" value={user?.email} />
                <AccountInfoItem icon={FaIdBadge} label="Rôle" value={roleLabels[user?.role] || user?.role} />
              </div>

              <div className="pm-readonly-notice">
                <FaLock />
                <span>Nom, e-mail et rôle sont gérés par l’administration.</span>
              </div>
            </aside>

            <section className="pm-password-card">
              <div className="pm-card-head">
                <span className="pm-card-icon">
                  <FaKey />
                </span>
                <div>
                  <h2>Changer le mot de passe</h2>
                  <p>La mise à jour prend effet immédiatement après validation.</p>
                </div>
              </div>

              <form className="pm-password-form" onSubmit={handlePasswordSubmit}>
                {[
                  {
                    name: 'current_password',
                    label: 'Mot de passe actuel',
                    autoComplete: 'current-password',
                  },
                  {
                    name: 'new_password',
                    label: 'Nouveau mot de passe',
                    autoComplete: 'new-password',
                  },
                  {
                    name: 'confirm_password',
                    label: 'Confirmer le nouveau mot de passe',
                    autoComplete: 'new-password',
                  },
                ].map((field) => {
                  const isVisible = Boolean(visibleFields[field.name]);

                  return (
                    <label key={field.name} className="pm-password-field">
                      <span>{field.label}</span>
                      <div className="pm-password-input-wrap">
                        <input
                          type={isVisible ? 'text' : 'password'}
                          name={field.name}
                          value={form[field.name]}
                          onChange={handleFieldChange}
                          autoComplete={field.autoComplete}
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          className="pm-password-visibility"
                          onClick={() => toggleFieldVisibility(field.name)}
                          aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        >
                          {isVisible ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </label>
                  );
                })}

                <div className={`pm-strength pm-strength--${passwordStrength.tone}`}>
                  <div className="pm-strength-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(passwordStrength.score, 5) * 20}%` }} />
                  </div>
                  <strong>Sécurité : {passwordStrength.label}</strong>
                </div>

                <div className="pm-password-rules">
                  {passwordRules.map((rule) => (
                    <span key={rule.label} className={rule.valid ? 'is-valid' : ''}>
                      <FaCheckCircle />
                      {rule.label}
                    </span>
                  ))}
                </div>

                {formError ? <p className="pm-form-alert pm-form-alert--error">{formError}</p> : null}
                {formSuccess ? <p className="pm-form-alert pm-form-alert--success">{formSuccess}</p> : null}

                <div className="pm-form-actions">
                  <button type="submit" className="pm-submit-btn" disabled={submitting}>
                    <FaShieldAlt />
                    {submitting ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileManagement;

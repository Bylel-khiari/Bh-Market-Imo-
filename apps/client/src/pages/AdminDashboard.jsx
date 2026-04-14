import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaUserTie,
  FaUserShield,
  FaUser,
  FaSyncAlt,
  FaExclamationTriangle,
  FaChartLine,
  FaCog,
  FaListAlt,
  FaHome,
  FaBell,
  FaEnvelope,
  FaSignOutAlt,
  FaTimes,
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { clearAuthSession, getAuthSession } from '../lib/auth';
import '../styles/AdminDashboard.css';

const ROLE_LABELS = {
  client: 'Client',
  agent_bancaire: 'Agent bancaire',
  responsable_decisionnel: 'Responsable decisionnel',
  admin: 'Admin',
};

const ROLE_COLORS = {
  client: '#0a4d8c',
  agent_bancaire: '#ef7d00',
  responsable_decisionnel: '#2c7a4b',
  admin: '#cc0000',
};

function formatRole(role) {
  return ROLE_LABELS[role] || role || '-';
}

function formatDate(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR');
}

function getInitials(nameOrEmail) {
  const value = String(nameOrEmail || '').trim();
  if (!value) return 'U';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [userSearch, setUserSearch] = useState('');
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [editingUserId, setEditingUserId] = useState(null);
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    address: '',
    phone: '',
    matricule: '',
    department: '',
  });

  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const goToHomePage = () => {
    navigate('/');
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const fetchUsers = useCallback(async () => {
    const token = getAuthSession()?.token;
    if (!token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Impossible de charger les utilisateurs.');
      }

      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (requestError) {
      setError(requestError.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const resetForm = () => {
    setFormMode('create');
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'client',
      address: '',
      phone: '',
      matricule: '',
      department: '',
    });
    setIsEditPanelOpen(false);
  };

  const openCreatePanel = () => {
    setFormMode('create');
    setEditingUserId(null);
    setFormMessage('');
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'client',
      address: '',
      phone: '',
      matricule: '',
      department: '',
    });
    setIsEditPanelOpen(true);
  };

  const startEdit = (user) => {
    setFormMode('edit');
    setEditingUserId(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'client',
      address: '',
      phone: '',
      matricule: '',
      department: '',
    });
    setFormMessage('');
    setIsEditPanelOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    if (formData.password) payload.password = formData.password;
    if (formData.role === 'client') {
      payload.address = formData.address.trim() || null;
      payload.phone = formData.phone.trim() || null;
    }
    if (formData.role === 'agent_bancaire') {
      payload.matricule = formData.matricule.trim() || null;
    }
    if (formData.role === 'responsable_decisionnel') {
      payload.department = formData.department.trim() || null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormMessage('Nom et email sont obligatoires.');
      return;
    }

    if (formMode === 'create' && formData.password.length < 6) {
      setFormMessage('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    const token = getAuthSession()?.token;
    if (!token) {
      setFormMessage('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    setSubmitting(true);
    setFormMessage('');

    try {
      const endpoint =
        formMode === 'create'
          ? `${apiBaseUrl}/api/admin/users`
          : `${apiBaseUrl}/api/admin/users/${editingUserId}`;

      const response = await fetch(endpoint, {
        method: formMode === 'create' ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPayload()),
      });

      const payload =
        response.status === 204 ? {} : await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Operation echouee.');
      }

      setFormMessage(formMode === 'create' ? 'Utilisateur cree.' : 'Utilisateur mis a jour.');
      resetForm();
      await fetchUsers();
    } catch (requestError) {
      setFormMessage(requestError.message || 'Erreur pendant la sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (user) => {
    setDeleteCandidate(user);
  };

  const closeDeleteConfirm = () => {
    setDeleteCandidate(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteCandidate) return;
    const user = deleteCandidate;

    const token = getAuthSession()?.token;
    if (!token) {
      setFormMessage('Session invalide. Veuillez vous reconnecter.');
      closeDeleteConfirm();
      return;
    }

    setSubmitting(true);
    setFormMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload =
        response.status === 204 ? {} : await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Suppression impossible.');
      }

      if (editingUserId === user.id) {
        resetForm();
      }

      setFormMessage('Utilisateur supprime.');
      closeDeleteConfirm();
      await fetchUsers();
    } catch (requestError) {
      setFormMessage(requestError.message || 'Erreur pendant la suppression.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const roleTotals = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const role = user?.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { client: 0, agent_bancaire: 0, responsable_decisionnel: 0, admin: 0 }
    );
  }, [users]);

  const pieData = useMemo(
    () => [
      { key: 'client', name: 'Clients', value: roleTotals.client || 0 },
      { key: 'agent_bancaire', name: 'Agents bancaires', value: roleTotals.agent_bancaire || 0 },
      {
        key: 'responsable_decisionnel',
        name: 'Responsables decisionnels',
        value: roleTotals.responsable_decisionnel || 0,
      },
      { key: 'admin', name: 'Admins', value: roleTotals.admin || 0 },
    ].filter((item) => item.value > 0),
    [roleTotals]
  );

  const barData = useMemo(
    () => [
      { role: 'Clients', total: roleTotals.client || 0 },
      { role: 'Agents', total: roleTotals.agent_bancaire || 0 },
      { role: 'Decisionnels', total: roleTotals.responsable_decisionnel || 0 },
      { role: 'Admins', total: roleTotals.admin || 0 },
    ],
    [roleTotals]
  );

  const usersSorted = useMemo(() => {
    return [...users].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [users]);

  const recentUsers = useMemo(() => usersSorted.slice(0, 8), [usersSorted]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return usersSorted;
    return usersSorted.filter((user) => {
      const haystack = `${user?.name || ''} ${user?.email || ''} ${user?.role || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [userSearch, usersSorted]);

  const menuItems = [
    { key: 'dashboard', label: 'Tableau de bord', icon: FaHome },
    { key: 'users', label: 'Utilisateurs', icon: FaUsers },
    { key: 'activities', label: 'Activites', icon: FaListAlt },
    { key: 'stats', label: 'Statistiques', icon: FaChartLine },
    { key: 'settings', label: 'Parametres', icon: FaCog },
  ];

  const sectionTitles = {
    dashboard: 'Tableau de bord',
    users: 'Gestion des utilisateurs',
    activities: 'Activites recentes',
    stats: 'Statistiques',
    settings: 'Parametres',
  };

  if (loading) {
    return (
      <div className="admin-dashboard admin-dashboard--state">
        <div className="admin-state admin-state--page">
          <FaSyncAlt className="spin" />
          <p>Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard admin-dashboard--state">
        <div className="admin-state admin-state--page error">
          <FaExclamationTriangle />
          <p>{error}</p>
          <button type="button" className="admin-refresh" onClick={fetchUsers}>
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-profile">
            <div className="admin-avatar">A</div>
            <div>
              <h3>Admin BH Bank</h3>
              <p>En ligne</p>
            </div>
          </div>
          <nav className="admin-sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`menu-item ${activeSection === item.key ? 'is-active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                >
                  <Icon /> {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1>{sectionTitles[activeSection]}</h1>
              <p className="admin-subtitle">Pilotage et gestion des utilisateurs</p>
            </div>
            <div className="admin-topbar-actions">
              <button type="button" className="admin-icon-btn" aria-label="Notifications"><FaBell /></button>
              <button type="button" className="admin-icon-btn" aria-label="Messages"><FaEnvelope /></button>
              <button
                type="button"
                className="admin-secondary admin-topbar-btn admin-topbar-btn--home"
                onClick={goToHomePage}
              >
                <FaHome />
                <span>Accueil</span>
              </button>
              <button
                type="button"
                className="admin-refresh admin-topbar-btn admin-topbar-btn--primary"
                onClick={fetchUsers}
                disabled={submitting}
              >
                Actualiser
              </button>
              <button
                type="button"
                className="admin-topbar-btn admin-topbar-btn--logout"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                <span>Deconnexion</span>
              </button>
            </div>
          </div>

          {activeSection === 'dashboard' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="icon"><FaUsers /></div>
                    <div><h3>Utilisateurs</h3><p>{users.length}</p></div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon"><FaUser /></div>
                    <div><h3>Clients</h3><p>{roleTotals.client || 0}</p></div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon"><FaUserTie /></div>
                    <div><h3>Agents bancaires</h3><p>{roleTotals.agent_bancaire || 0}</p></div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="icon"><FaUserShield /></div>
                    <div><h3>Responsables/Admins</h3><p>{(roleTotals.responsable_decisionnel || 0) + (roleTotals.admin || 0)}</p></div>
                  </div>
                </div>
                <div className="admin-card">
                  <h2>Bienvenue</h2>
                  <p className="admin-section-help">Utilisez le menu gauche pour acceder rapidement a chaque module.</p>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'users' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card admin-users-card">
                  <div className="admin-users-header">
                    <h2>Liste des utilisateurs</h2>
                    <div className="admin-users-header-actions">
                      <span className="admin-users-count">{filteredUsers.length}</span>
                      <button type="button" className="admin-refresh" onClick={openCreatePanel}>Nouveau</button>
                    </div>
                  </div>

                  <div className="admin-users-toolbar">
                    <input
                      className="admin-search-input"
                      placeholder="Rechercher par nom, email ou role"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                  </div>

                  <div className="admin-users-table">
                    <div className="admin-user-row admin-user-row-head">
                      <span>Utilisateur</span>
                      <span>Role</span>
                      <span>Date</span>
                      <span>Actions</span>
                    </div>

                    {filteredUsers.length === 0 && <p className="empty">Aucun utilisateur trouve.</p>}

                    {filteredUsers.map((user) => (
                      <article key={user.id} className={`admin-user-row ${editingUserId === user.id ? 'is-editing' : ''}`}>
                        <div className="admin-user-cell user-cell-main">
                          <div className="admin-user-avatar">{getInitials(user.name || user.email)}</div>
                          <div>
                            <p className="admin-user-name">{user.name || '-'}</p>
                            <p className="admin-user-email">{user.email || '-'}</p>
                            <p className="admin-user-id">ID #{user.id}</p>
                          </div>
                        </div>

                        <div className="admin-user-cell">
                          <span className={`role-pill role-${user.role || 'unknown'}`}>{formatRole(user.role)}</span>
                        </div>

                        <div className="admin-user-cell admin-user-date">{formatDate(user.created_at)}</div>

                        <div className="admin-user-cell">
                          <div className="admin-table-actions">
                            <button type="button" className="admin-secondary" onClick={() => startEdit(user)}>Modifier</button>
                            <button type="button" className="admin-danger" onClick={() => requestDelete(user)}>Supprimer</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'users' && isEditPanelOpen && (
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={resetForm}>
              <aside className="admin-card admin-edit-modal" onClick={(event) => event.stopPropagation()}>
                <div className="admin-edit-panel-head">
                  <h2>{formMode === 'create' ? 'Nouveau utilisateur' : `Modifier utilisateur #${editingUserId}`}</h2>
                  <button
                    type="button"
                    className="admin-close-btn"
                    onClick={resetForm}
                    disabled={submitting}
                    aria-label="Fermer"
                  >
                    <FaTimes />
                  </button>
                </div>
                <p className="admin-section-help">Remplissez le formulaire puis validez pour creer ou mettre a jour un compte.</p>
                <form className="admin-user-form admin-user-form-compact" onSubmit={handleSubmit}>
                  <input name="name" placeholder="Nom" value={formData.name} onChange={handleFormChange} disabled={submitting} />
                  <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleFormChange} disabled={submitting} />
                  <input name="password" type="password" placeholder={formMode === 'create' ? 'Mot de passe (min 6)' : 'Nouveau mot de passe (optionnel)'} value={formData.password} onChange={handleFormChange} disabled={submitting} />
                  <select name="role" value={formData.role} onChange={handleFormChange} disabled={submitting}>
                    <option value="client">Client</option>
                    <option value="agent_bancaire">Agent bancaire</option>
                    <option value="responsable_decisionnel">Responsable decisionnel</option>
                    <option value="admin">Admin</option>
                  </select>
                  {formData.role === 'client' && (
                    <>
                      <input name="address" placeholder="Adresse (optionnel)" value={formData.address} onChange={handleFormChange} disabled={submitting} />
                      <input name="phone" placeholder="Telephone (optionnel)" value={formData.phone} onChange={handleFormChange} disabled={submitting} />
                    </>
                  )}
                  {formData.role === 'agent_bancaire' && (
                    <input name="matricule" placeholder="Matricule (optionnel)" value={formData.matricule} onChange={handleFormChange} disabled={submitting} />
                  )}
                  {formData.role === 'responsable_decisionnel' && (
                    <input name="department" placeholder="Departement (optionnel)" value={formData.department} onChange={handleFormChange} disabled={submitting} />
                  )}
                  <div className="admin-form-actions">
                    <button type="submit" className="admin-refresh" disabled={submitting}>
                      {submitting ? 'Traitement...' : formMode === 'create' ? 'Creer' : 'Enregistrer'}
                    </button>
                    <button type="button" className="admin-secondary" onClick={openCreatePanel} disabled={submitting}>Nouveau</button>
                  </div>
                </form>
                {formMessage && <p className="admin-form-message">{formMessage}</p>}
              </aside>
            </div>
          )}

          {activeSection === 'users' && Boolean(deleteCandidate) && (
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" onClick={closeDeleteConfirm}>
              <aside className="admin-card admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
                <h2>Confirmer la suppression</h2>
                <p className="admin-section-help">
                  Voulez-vous vraiment supprimer <strong>{deleteCandidate?.name || deleteCandidate?.email}</strong> ?
                </p>
                <div className="admin-form-actions">
                  <button type="button" className="admin-secondary" onClick={closeDeleteConfirm} disabled={submitting}>
                    Annuler
                  </button>
                  <button type="button" className="admin-danger" onClick={handleDeleteConfirmed} disabled={submitting}>
                    {submitting ? 'Suppression...' : 'Oui, supprimer'}
                  </button>
                </div>
              </aside>
            </div>
          )}

          {activeSection === 'activities' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                  <h2>Dernieres activites utilisateurs</h2>
                  <div className="admin-activity-list">
                    {recentUsers.length === 0 && <p className="empty">Aucune activite.</p>}
                    {recentUsers.map((user) => (
                      <div key={user.id} className="admin-activity-item">
                        <strong>{user.name || user.email}</strong>
                        <span>{formatRole(user.role)}</span>
                        <small>{formatDate(user.created_at)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'stats' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-row">
                  <div className="admin-card">
                    <h2>Repartition des roles</h2>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.key} fill={ROLE_COLORS[entry.key] || '#003366'} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="admin-card">
                    <h2>Volume par role</h2>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="role" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#0b5fa8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="admin-content-grid admin-content-single">
              <section className="admin-analytics-column">
                <div className="admin-card">
                  <h2>Parametres du module admin</h2>
                  <p className="admin-section-help">Configuration actuelle du tableau de bord admin.</p>
                  <ul className="admin-settings-list">
                    <li>API: {apiBaseUrl}</li>
                    <li>Utilisateurs charges: {users.length}</li>
                    <li>Mode edition: {formMode === 'edit' ? 'Actif' : 'Inactif'}</li>
                  </ul>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

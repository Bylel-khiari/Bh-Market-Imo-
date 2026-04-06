import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaUsers,
  FaUserTie,
  FaUserShield,
  FaUser,
  FaSyncAlt,
  FaExclamationTriangle,
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
import { getAuthSession } from '../lib/auth';
import '../styles/AdminDashboard.css';

const ROLE_LABELS = {
  client: 'Client',
  agent_bancaire: 'Agent bancaire',
  responsable_decisionnel: 'Responsable decisionnel',
  admin: 'Admin',
};

const ROLE_COLORS = {
  client: '#0b5fa8',
  agent_bancaire: '#ef7d00',
  responsable_decisionnel: '#1f8f58',
  admin: '#7a2cff',
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

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
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

  const handleDelete = async (user) => {
    const confirmDelete = window.confirm(`Supprimer ${user.name || user.email} ?`);
    if (!confirmDelete) return;

    const token = getAuthSession()?.token;
    if (!token) {
      setFormMessage('Session invalide. Veuillez vous reconnecter.');
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

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="admin-state">
            <FaSyncAlt className="spin" />
            <p>Chargement du dashboard admin...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="admin-state error">
            <FaExclamationTriangle />
            <p>{error}</p>
            <button type="button" className="admin-refresh" onClick={fetchUsers}>
              Reessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1>Dashboard Admin</h1>
            <p className="admin-subtitle">Gestion centralisee des utilisateurs et des roles</p>
          </div>
          <button type="button" className="admin-refresh" onClick={fetchUsers} disabled={submitting}>
            Actualiser
          </button>
        </div>

        <div className="admin-card admin-form-card">
          <h2>{formMode === 'create' ? 'Creer utilisateur' : `Modifier utilisateur #${editingUserId}`}</h2>
          <p className="admin-section-help">
            Renseignez les informations puis validez pour creer ou mettre a jour un compte.
          </p>
          <form className="admin-user-form" onSubmit={handleSubmit}>
            <input
              name="name"
              placeholder="Nom"
              value={formData.name}
              onChange={handleFormChange}
              disabled={submitting}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleFormChange}
              disabled={submitting}
            />
            <input
              name="password"
              type="password"
              placeholder={formMode === 'create' ? 'Mot de passe (min 6)' : 'Nouveau mot de passe (optionnel)'}
              value={formData.password}
              onChange={handleFormChange}
              disabled={submitting}
            />
            <select name="role" value={formData.role} onChange={handleFormChange} disabled={submitting}>
              <option value="client">Client</option>
              <option value="agent_bancaire">Agent bancaire</option>
              <option value="responsable_decisionnel">Responsable decisionnel</option>
              <option value="admin">Admin</option>
            </select>

            {formData.role === 'client' && (
              <>
                <input
                  name="address"
                  placeholder="Adresse (optionnel)"
                  value={formData.address}
                  onChange={handleFormChange}
                  disabled={submitting}
                />
                <input
                  name="phone"
                  placeholder="Telephone (optionnel)"
                  value={formData.phone}
                  onChange={handleFormChange}
                  disabled={submitting}
                />
              </>
            )}

            {formData.role === 'agent_bancaire' && (
              <input
                name="matricule"
                placeholder="Matricule (optionnel)"
                value={formData.matricule}
                onChange={handleFormChange}
                disabled={submitting}
              />
            )}

            {formData.role === 'responsable_decisionnel' && (
              <input
                name="department"
                placeholder="Departement (optionnel)"
                value={formData.department}
                onChange={handleFormChange}
                disabled={submitting}
              />
            )}

            <div className="admin-form-actions">
              <button type="submit" className="admin-refresh" disabled={submitting}>
                {submitting ? 'Traitement...' : formMode === 'create' ? 'Creer' : 'Enregistrer'}
              </button>
              {formMode === 'edit' && (
                <button type="button" className="admin-secondary" onClick={resetForm} disabled={submitting}>
                  Annuler
                </button>
              )}
            </div>
          </form>
          {formMessage && <p className="admin-form-message">{formMessage}</p>}
        </div>

        <div className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <div className="icon"><FaUsers /></div>
            <div>
              <h3>Utilisateurs</h3>
              <p>{users.length}</p>
            </div>
          </div>
          <div className="admin-kpi-card">
            <div className="icon"><FaUser /></div>
            <div>
              <h3>Clients</h3>
              <p>{roleTotals.client || 0}</p>
            </div>
          </div>
          <div className="admin-kpi-card">
            <div className="icon"><FaUserTie /></div>
            <div>
              <h3>Agents bancaires</h3>
              <p>{roleTotals.agent_bancaire || 0}</p>
            </div>
          </div>
          <div className="admin-kpi-card">
            <div className="icon"><FaUserShield /></div>
            <div>
              <h3>Responsables/Admins</h3>
              <p>{(roleTotals.responsable_decisionnel || 0) + (roleTotals.admin || 0)}</p>
            </div>
          </div>
        </div>

        <div className="admin-row">
          <div className="admin-card">
            <h2>Repartition des roles</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
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
            <ResponsiveContainer width="100%" height={300}>
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

        <div className="admin-card admin-table-card">
          <h2>Derniers utilisateurs</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Role</th>
                <th>Date creation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">Aucun utilisateur.</td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="col-id">#{user.id}</td>
                  <td>{user.name || '-'}</td>
                  <td>{user.email || '-'}</td>
                  <td>
                    <span className={`role-pill role-${user.role || 'unknown'}`}>
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" className="admin-secondary" onClick={() => startEdit(user)}>
                        Modifier
                      </button>
                      <button type="button" className="admin-danger" onClick={() => handleDelete(user)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

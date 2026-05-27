import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminUserApi,
  deleteAdminUserApi,
  fetchAdminUsersApi,
  requireAuthToken,
  updateAdminUserApi,
} from '../../../lib/auth';
import {
  createEmptyUserForm,
  generateSecurePassword,
  normalizeRibInput,
} from '../utils/adminFormatters';

export default function useAdminUsers({ fetchDashboardSummary, handleAuthFailure }) {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [editingUserId, setEditingUserId] = useState(null);
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(createEmptyUserForm());

  const fetchUsers = useCallback(async () => {
    try {
      const token = requireAuthToken();
      setLoading(true);
      setError('');
      const payload = await fetchAdminUsersApi(token, 100);
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setError(requestError.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setFormMode('create');
    setEditingUserId(null);
    setFormData(createEmptyUserForm());
    setIsEditPanelOpen(false);
  };

  const openCreatePanel = () => {
    setFormMode('create');
    setEditingUserId(null);
    setFormMessage('');
    setFormData(createEmptyUserForm());
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
      rib_bancaire: user.rib_bancaire || '',
      generate_rib_bancaire: false,
      address: '',
      phone: '',
      matricule: '',
    });
    setFormMessage('');
    setIsEditPanelOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };

      if (name === 'role' && value !== 'client') {
        next.rib_bancaire = '';
        next.generate_rib_bancaire = false;
      }

      if (name === 'generate_rib_bancaire' && checked) {
        next.rib_bancaire = '';
      }

      return next;
    });
  };

  const handleGeneratePassword = () => {
    setFormData((prev) => ({ ...prev, password: generateSecurePassword() }));
    setFormMessage('Mot de passe genere. Pensez a le communiquer au client.');
  };

  const buildPayload = () => {
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    if (formData.password) payload.password = formData.password;
    if (formData.role === 'client') {
      payload.generate_rib_bancaire = Boolean(formData.generate_rib_bancaire);
      if (!payload.generate_rib_bancaire) {
        payload.rib_bancaire = normalizeRibInput(formData.rib_bancaire);
      }
      payload.address = formData.address.trim() || null;
      payload.phone = formData.phone.trim() || null;
    }
    if (formData.role === 'agent_bancaire') {
      payload.matricule = formData.matricule.trim() || null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormMessage('Nom et e-mail sont obligatoires.');
      return;
    }

    if (formMode === 'create' && formData.password.length < 6) {
      setFormMessage('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    if (
      formData.role === 'client' &&
      !formData.generate_rib_bancaire &&
      !normalizeRibInput(formData.rib_bancaire)
    ) {
      setFormMessage('Le RIB bancaire est obligatoire pour un compte client.');
      return;
    }

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setFormMessage('');

      if (formMode === 'create') {
        await createAdminUserApi(buildPayload(), token);
      } else {
        await updateAdminUserApi(editingUserId, buildPayload(), token);
      }

      setFormMessage(formMode === 'create' ? 'Utilisateur crÃƒÂ©ÃƒÂ©.' : 'Utilisateur mis ÃƒÂ  jour.');
      resetForm();
      await Promise.all([fetchUsers(), fetchDashboardSummary({ silent: true })]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

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

    try {
      const token = requireAuthToken();
      setSubmitting(true);
      setFormMessage('');
      await deleteAdminUserApi(user.id, token);

      if (editingUserId === user.id) {
        resetForm();
      }

      setFormMessage('Utilisateur supprime.');
      closeDeleteConfirm();
      await Promise.all([fetchUsers(), fetchDashboardSummary({ silent: true })]);
    } catch (requestError) {
      if (handleAuthFailure(requestError)) {
        return;
      }

      setFormMessage(requestError.message || 'Erreur pendant la suppression.');
    } finally {
      setSubmitting(false);
    }
  };

  const usersSorted = useMemo(() => {
    return [...users].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [users]);

  const recentUsers = useMemo(() => usersSorted.slice(0, 8), [usersSorted]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return usersSorted;
    return usersSorted.filter((user) => {
      const haystack = `${user?.name || ''} ${user?.email || ''} ${user?.rib_bancaire || ''} ${user?.role || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [userSearch, usersSorted]);

  return {
    closeDeleteConfirm,
    deleteCandidate,
    editingUserId,
    error,
    fetchUsers,
    filteredUsers,
    formData,
    formMessage,
    formMode,
    handleDeleteConfirmed,
    handleFormChange,
    handleGeneratePassword,
    handleSubmit,
    isEditPanelOpen,
    loading,
    openCreatePanel,
    recentUsers,
    requestDelete,
    resetForm,
    setUserSearch,
    startEdit,
    submitting,
    userSearch,
  };
}

import React from 'react';
import AdminModalShell from './AdminModalShell';

export default function AdminUserModal({
  editingUserId,
  formData,
  formMessage,
  formMode,
  handleFormChange,
  handleGeneratePassword,
  handleSubmit,
  openCreatePanel,
  resetForm,
  submitting,
}) {
  return (
    <AdminModalShell
      disabled={submitting}
      onClose={resetForm}
      title={formMode === 'create' ? 'Nouvel utilisateur' : `Modifier utilisateur #${editingUserId}`}
    >
      <p className="admin-section-help">
        Remplissez le formulaire puis validez pour crÃƒÂ©er ou mettre ÃƒÂ  jour un compte.
      </p>
      <form className="admin-user-form admin-user-form-compact" onSubmit={handleSubmit}>
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
          placeholder="E-mail"
          value={formData.email}
          onChange={handleFormChange}
          disabled={submitting}
        />
        <input
          name="password"
          type="text"
          placeholder={
            formMode === 'create'
              ? 'Mot de passe (min. 6)'
              : 'Nouveau mot de passe (optionnel)'
          }
          value={formData.password}
          onChange={handleFormChange}
          disabled={submitting}
        />
        <button
          type="button"
          className="admin-secondary"
          onClick={handleGeneratePassword}
          disabled={submitting}
        >
          Generer mot de passe
        </button>
        <select
          name="role"
          value={formData.role}
          onChange={handleFormChange}
          disabled={submitting}
        >
          <option value="client">Client</option>
          <option value="agent_bancaire">Agent bancaire</option>
          <option value="admin">Admin</option>
        </select>
        {formData.role === 'client' && (
          <>
            <label className="admin-field-block">
              <span className="admin-field-label">RIB bancaire</span>
              <input
                name="rib_bancaire"
                placeholder="RIB-000001-8392"
                value={formData.rib_bancaire}
                onChange={handleFormChange}
                disabled={submitting || formData.generate_rib_bancaire}
              />
            </label>
            <label className="admin-checkbox-line">
              <input
                name="generate_rib_bancaire"
                type="checkbox"
                checked={formData.generate_rib_bancaire}
                onChange={handleFormChange}
                disabled={submitting}
              />
              <span>Generer automatiquement le RIB</span>
            </label>
            <input
              name="address"
              placeholder="Adresse (optionnel)"
              value={formData.address}
              onChange={handleFormChange}
              disabled={submitting}
            />
            <input
              name="phone"
              placeholder="TÃƒÂ©lÃƒÂ©phone (optionnel)"
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
        <div className="admin-form-actions">
          <button type="submit" className="admin-refresh" disabled={submitting}>
            {submitting ? 'Traitement...' : formMode === 'create' ? 'CrÃƒÂ©er' : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="admin-secondary"
            onClick={openCreatePanel}
            disabled={submitting}
          >
            Nouveau
          </button>
        </div>
      </form>
      {formMessage && <p className="admin-form-message">{formMessage}</p>}
    </AdminModalShell>
  );
}

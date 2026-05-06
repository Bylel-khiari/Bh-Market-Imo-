import React from 'react';

export default function AdminUsersSection({
  filteredUsers,
  editingUserId,
  userSearch,
  setUserSearch,
  openCreatePanel,
  startEdit,
  requestDelete,
  getInitials,
  formatRole,
  formatDate,
}) {
  return (
    <div className="admin-content-grid admin-content-single">
      <section className="admin-analytics-column">
        <div className="admin-card admin-users-card">
          <div className="admin-users-header">
            <h2>Liste des utilisateurs</h2>
            <div className="admin-users-header-actions">
              <span className="admin-users-count">{filteredUsers.length}</span>
              <button type="button" className="admin-refresh" onClick={openCreatePanel}>
                Nouveau
              </button>
            </div>
          </div>

          <div className="admin-users-toolbar">
            <input
              className="admin-search-input"
              placeholder="Rechercher par nom, e-mail ou rôle"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
          </div>

          <div className="admin-users-table">
            <div className="admin-user-row admin-user-row-head">
              <span>Utilisateur</span>
              <span>Rôle</span>
              <span>Date</span>
              <span>Actions</span>
            </div>

            {filteredUsers.length === 0 && <p className="empty">Aucun utilisateur trouvé.</p>}

            {filteredUsers.map((user) => (
              <article
                key={user.id}
                className={`admin-user-row ${editingUserId === user.id ? 'is-editing' : ''}`}
              >
                <div className="admin-user-cell user-cell-main">
                  <div className="admin-user-avatar">
                    {getInitials(user.name || user.email)}
                  </div>
                  <div>
                    <p className="admin-user-name">{user.name || '-'}</p>
                    <p className="admin-user-email">{user.email || '-'}</p>
                    <p className="admin-user-id">ID #{user.id}</p>
                  </div>
                </div>

                <div className="admin-user-cell">
                  <span className={`role-pill role-${user.role || 'unknown'}`}>
                    {formatRole(user.role)}
                  </span>
                </div>

                <div className="admin-user-cell admin-user-date">
                  {formatDate(user.created_at)}
                </div>

                <div className="admin-user-cell">
                  <div className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => startEdit(user)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="admin-danger"
                      onClick={() => requestDelete(user)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

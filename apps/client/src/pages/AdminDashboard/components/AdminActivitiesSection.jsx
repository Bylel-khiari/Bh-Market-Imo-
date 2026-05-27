import React from 'react';

export default function AdminActivitiesSection({ formatDate, formatRole, recentUsers }) {
  return (
    <div className="admin-content-grid admin-content-single">
      <section className="admin-analytics-column">
        <div className="admin-card">
          <h2>DerniÃƒÂ¨res activitÃƒÂ©s utilisateurs</h2>
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
  );
}

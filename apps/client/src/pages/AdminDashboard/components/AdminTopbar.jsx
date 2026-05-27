import React from 'react';
import { FaEnvelope, FaHome, FaSignOutAlt } from 'react-icons/fa';

export default function AdminTopbar({
  disabled,
  goToHomePage,
  handleLogout,
  refreshDashboardData,
  sectionTitle,
  setActiveSection,
  unreadReportCount,
}) {
  return (
    <div className="admin-topbar">
      <div>
        <h1>{sectionTitle}</h1>
        <p className="admin-subtitle">
          Pilotage des utilisateurs, des biens immobiliers et des sites de collecte
        </p>
      </div>
      <div className="admin-topbar-actions">
        <button
          type="button"
          className="admin-icon-btn admin-icon-btn--notification"
          aria-label="RÃƒÂ©clamations"
          onClick={() => setActiveSection('mail')}
        >
          <FaEnvelope />
          {unreadReportCount > 0 && (
            <span className="admin-notification-badge">
              {unreadReportCount > 99 ? '99+' : unreadReportCount}
            </span>
          )}
        </button>
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
          onClick={refreshDashboardData}
          disabled={disabled}
        >
          Actualiser
        </button>
        <button
          type="button"
          className="admin-topbar-btn admin-topbar-btn--logout"
          onClick={handleLogout}
        >
          <FaSignOutAlt />
          <span>DÃƒÂ©connexion</span>
        </button>
      </div>
    </div>
  );
}

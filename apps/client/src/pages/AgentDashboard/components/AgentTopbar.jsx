import React from 'react';
import { FaHome, FaSignOutAlt, FaSyncAlt } from 'react-icons/fa';

export default function AgentTopbar({
  handleLogout,
  handleRefresh,
  onHome,
  pageCopy,
}) {
  return (
    <header className="admin-topbar">
      <div>
        <h1>{pageCopy.title}</h1>
        <p className="admin-subtitle">{pageCopy.subtitle}</p>
      </div>

      <div className="admin-topbar-actions">
        <button type="button" className="admin-icon-btn" onClick={handleRefresh} aria-label="Rafraichir">
          <FaSyncAlt />
        </button>
        <button type="button" className="admin-icon-btn" onClick={onHome} aria-label="Accueil">
          <FaHome />
        </button>
        <button type="button" className="admin-topbar-btn admin-topbar-btn--logout" onClick={handleLogout}>
          <FaSignOutAlt />
          <span>DÃƒÂ©connexion</span>
        </button>
      </div>
    </header>
  );
}

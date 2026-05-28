import React from 'react';
import { FaChevronDown, FaCog } from 'react-icons/fa';

export default function AdminSidebar({
  activeSection,
  isParameterMenuOpen,
  isParameterSectionActive,
  menuItems,
  parameterMenuItems,
  setActiveSection,
  setIsParameterMenuOpen,
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-profile">
        <div className="admin-avatar">A</div>
        <div>
          <h3>Admin BH Bank</h3>
          <p>En ligne</p>
        </div>
      </div>
      <nav className="admin-sidebar-menu">
        {menuItems.slice(0, 1).map((item) => {
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
        <div className={`menu-section ${isParameterSectionActive ? 'is-active' : ''} ${isParameterMenuOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="menu-section-title"
            onClick={() => setIsParameterMenuOpen((isOpen) => !isOpen)}
            aria-expanded={isParameterMenuOpen}
          >
            <FaCog />
            <span>Paramètre</span>
            <FaChevronDown className="menu-section-chevron" />
          </button>
          {isParameterMenuOpen && (
            <div className="menu-section-list">
              {parameterMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`menu-item menu-item--nested ${activeSection === item.key ? 'is-active' : ''}`}
                    onClick={() => setActiveSection(item.key)}
                  >
                    <Icon /> {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {menuItems.slice(1).map((item) => {
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
  );
}

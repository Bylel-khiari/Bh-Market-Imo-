import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminLayout({
  activeSection,
  children,
  isParameterMenuOpen,
  isParameterSectionActive,
  menuItems,
  modals,
  parameterMenuItems,
  setActiveSection,
  setIsParameterMenuOpen,
  topbarProps,
}) {
  return (
    <div className="admin-dashboard">
      <div className="admin-shell">
        <AdminSidebar
          activeSection={activeSection}
          isParameterMenuOpen={isParameterMenuOpen}
          isParameterSectionActive={isParameterSectionActive}
          menuItems={menuItems}
          parameterMenuItems={parameterMenuItems}
          setActiveSection={setActiveSection}
          setIsParameterMenuOpen={setIsParameterMenuOpen}
        />

        <main className="admin-main">
          <AdminTopbar {...topbarProps} />
          {children}
        </main>
      </div>

      {modals}
    </div>
  );
}

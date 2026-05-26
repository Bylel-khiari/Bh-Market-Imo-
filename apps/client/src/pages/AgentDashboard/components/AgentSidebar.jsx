import React from 'react';
import { FaChartLine, FaDownload, FaFolderOpen } from 'react-icons/fa';
import { getInitials } from '../utils/agentFormatters';

export default function AgentSidebar({
  acceptedCreditApplications,
  activeSection,
  pendingCount,
  profile,
  refusedCreditApplications,
  setActiveSection,
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-profile">
        <div className="admin-avatar">{getInitials(profile?.name || profile?.email)}</div>
        <div>
          <h3>{profile?.name || 'Agent bancaire'}</h3>
          <p>{profile?.matricule ? `Matricule ${profile.matricule}` : 'Traitement des dossiers BH Bank'}</p>
        </div>
      </div>

      <div className="admin-sidebar-menu">
        <button
          type="button"
          className={`menu-item ${activeSection === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <FaChartLine />
          <span>AperÃ§u</span>
        </button>
        <button
          type="button"
          className={`menu-item ${activeSection === 'applications' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('applications')}
        >
          <FaFolderOpen />
          <span>Dossiers</span>
        </button>
        <button
          type="button"
          className={`menu-item ${activeSection === 'platform' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('platform')}
        >
          <FaChartLine />
          <span>KPI plateforme</span>
        </button>
        <button
          type="button"
          className={`menu-item ${activeSection === 'powerbi' ? 'is-active' : ''}`}
          onClick={() => setActiveSection('powerbi')}
        >
          <FaDownload />
          <span>Power BI</span>
        </button>
      </div>

      <div className="agent-sidebar-note">
        <p className="agent-sidebar-kicker">File active</p>
        <strong>{pendingCount} dossiers Ã  suivre</strong>
        <span>{acceptedCreditApplications} accordÃ©s et {refusedCreditApplications} refusÃ©s Ã  date.</span>
      </div>
    </aside>
  );
}

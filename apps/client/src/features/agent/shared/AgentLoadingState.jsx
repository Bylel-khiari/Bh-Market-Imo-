import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';

export default function AgentLoadingState() {
  return (
    <div className="admin-dashboard admin-dashboard--state agent-dashboard">
      <div className="admin-state admin-state--page">
        <FaSyncAlt className="spin" />
        <p>Chargement du tableau de bord agent...</p>
      </div>
    </div>
  );
}

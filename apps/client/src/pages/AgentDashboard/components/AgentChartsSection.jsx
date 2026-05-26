import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function AgentChartsSection({ pieData }) {
  return (
    <div className="admin-row">
      <section className="admin-card agent-platform-card--wide">
        <h2>RÃ©partition des statuts</h2>
        <p className="admin-section-help">
          Vue rapide pour identifier les dossiers Ã  relancer, analyser ou clÃ´turer.
        </p>
        {pieData.length ? (
          <div className="agent-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="admin-state admin-state--inline">
            <FaExclamationTriangle />
            <p>Aucun dossier disponible pour le moment.</p>
          </div>
        )}
      </section>
    </div>
  );
}

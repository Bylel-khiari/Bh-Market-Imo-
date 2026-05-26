import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatTextLabel } from '../utils/agentFormatters';

export default function MarketplaceActivitySection({ topCities }) {
  return (
    <div className="admin-row">
      <section className="admin-card">
        <h2>Villes les plus actives</h2>
        <p className="admin-section-help">Concentration des biens immobiliers valides par bassin geographique.</p>
        {topCities.length ? (
          <div className="agent-chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCities}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="city" tickFormatter={formatTextLabel} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#0d355a" radius={[10, 10, 0, 0]} name="Biens" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty">Aucune ville Ã  afficher.</p>
        )}
      </section>
    </div>
  );
}

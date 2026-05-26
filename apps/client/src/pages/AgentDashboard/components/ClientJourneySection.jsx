import React from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaChartLine } from 'react-icons/fa';
import { ACTIVITY_COLORS, PIE_COLORS } from '../utils/agentFormatters';

export default function ClientJourneySection({
  clientActivityDistribution,
  monthlyActivity,
  monthlyClientEvents,
}) {
  return (
    <>
      <div className="admin-row">
        <section className="admin-card agent-platform-card--wide">
          <h2>Parcours client par mois</h2>
          <p className="admin-section-help">
            Connexions, calculs et dÃ©marrages de demande tracÃ©s par client connectÃ©.
          </p>
          {monthlyClientEvents.length ? (
            <div className="agent-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyClientEvents}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke={ACTIVITY_COLORS.clientEvents}
                    strokeWidth={3}
                    name="Logs client"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty">Aucun log client disponible.</p>
          )}
        </section>

        <section className="admin-card">
          <h2>Ã‰vÃ©nements client</h2>
          <p className="admin-section-help">Repartition des actions suivies dans le tunnel credit.</p>
          {clientActivityDistribution.length ? (
            <div className="agent-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clientActivityDistribution}
                    dataKey="value"
                    nameKey="label"
                    outerRadius={104}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {clientActivityDistribution.map((entry, index) => (
                      <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty">Aucun Ã©vÃ©nement client Ã  afficher.</p>
          )}
        </section>
      </div>

      <div className="admin-row">
        <section className="admin-card agent-platform-card--wide">
          <h2>Activite plateforme par mois</h2>
          <p className="admin-section-help">
            Inscriptions, biens valides, reclamations support et dossiers credit sur la periode selectionnee.
          </p>
          {monthlyActivity.length ? (
            <div className="agent-chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke={ACTIVITY_COLORS.users} strokeWidth={3} name="Utilisateurs" />
                  <Line type="monotone" dataKey="properties" stroke={ACTIVITY_COLORS.properties} strokeWidth={3} name="Biens" />
                  <Line type="monotone" dataKey="requests" stroke={ACTIVITY_COLORS.requests} strokeWidth={3} name="RÃ©clamations" />
                  <Line type="monotone" dataKey="creditApplications" stroke={ACTIVITY_COLORS.clientEvents} strokeWidth={3} name="Dossiers crÃ©dit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="admin-state admin-state--inline">
              <FaChartLine />
              <p>Aucune activite mensuelle disponible.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

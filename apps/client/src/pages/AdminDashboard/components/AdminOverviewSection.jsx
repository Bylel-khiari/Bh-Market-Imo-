import React from 'react';
import AdminChartsSection from './AdminChartsSection';
import AdminStatsCards from './AdminStatsCards';

export default function AdminOverviewSection({
  dashboardSummary,
  propertyTotals,
  roleTotals,
  siteTotals,
}) {
  return (
    <div className="admin-content-grid admin-content-single">
      <section className="admin-analytics-column">
        <AdminStatsCards
          dashboardSummary={dashboardSummary}
          propertyTotals={propertyTotals}
          roleTotals={roleTotals}
          siteTotals={siteTotals}
        />
        <AdminChartsSection propertyTotals={propertyTotals} siteTotals={siteTotals} />
      </section>
    </div>
  );
}

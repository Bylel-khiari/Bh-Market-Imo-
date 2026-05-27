import { useMemo, useState } from 'react';
import {
  STATUS_COLORS,
  STATUS_OPTIONS,
  downloadTextFile,
  escapeCsvCell,
  formatDateTime,
  formatMonthLabel,
} from '../utils/agentFormatters';

export default function useAgentPlatformMetrics({
  applications,
  loadDashboard,
  platformDashboard,
  search,
  statusFilter,
  summary,
}) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const platformSummary = platformDashboard?.summary || {};
  const creditApplicationSummary = platformDashboard?.credit_application_summary || {};
  const totalCreditApplications = Number(
    creditApplicationSummary.total ?? platformSummary.total_credit_applications ?? summary.total ?? 0,
  );
  const pendingCount = Number(
    creditApplicationSummary.pending ??
      platformSummary.pending_credit_applications ??
      summary.SOUMIS + summary.EN_VERIFICATION + summary.DOCUMENTS_MANQUANTS + summary.EN_ETUDE,
  );
  const acceptedCreditApplications = Number(
    creditApplicationSummary.accepted ?? platformSummary.accepted_credit_applications ?? summary.ACCEPTE ?? 0,
  );
  const refusedCreditApplications = Number(
    creditApplicationSummary.refused ?? platformSummary.refused_credit_applications ?? summary.REFUSE ?? 0,
  );
  const approvalRate = Number(
    creditApplicationSummary.approval_rate ??
      platformSummary.credit_approval_rate ??
      (totalCreditApplications > 0 ? Math.round((acceptedCreditApplications / totalCreditApplications) * 100) : 0),
  );
  const averageComplianceScore = Number(
    creditApplicationSummary.average_compliance_score ??
      platformSummary.average_compliance_score ??
      summary.average_compliance_score ??
      0,
  );

  const overviewApplications = useMemo(() => {
    const ranked = applications.filter((application) =>
      ['SOUMIS', 'DOCUMENTS_MANQUANTS', 'EN_VERIFICATION', 'EN_ETUDE'].includes(application.status),
    );

    return (ranked.length ? ranked : applications).slice(0, 4);
  }, [applications]);

  const monthlyActivity = useMemo(() => {
    const series = Array.isArray(platformDashboard?.monthly_activity)
      ? platformDashboard.monthly_activity
      : [];
    const filteredSeries = selectedMonth === 'all'
      ? series
      : series.filter((item) => item.month === selectedMonth);

    return filteredSeries.map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
      creditApplications: Number(item.credit_applications || 0),
    }));
  }, [platformDashboard, selectedMonth]);

  const creditStatusDistribution = useMemo(() => {
    return Array.isArray(platformDashboard?.credit_application_status_distribution)
      ? platformDashboard.credit_application_status_distribution
      : [];
  }, [platformDashboard]);

  const topCities = platformDashboard?.top_cities || [];
  const topSources = platformDashboard?.top_sources || [];
  const latestUsers = platformDashboard?.latest_users || [];
  const latestRequests = platformDashboard?.latest_requests || [];
  const latestCreditApplications = useMemo(() => {
    return Array.isArray(platformDashboard?.latest_credit_applications)
      ? platformDashboard.latest_credit_applications
      : [];
  }, [platformDashboard]);
  const clientActivity = platformDashboard?.client_activity || {};
  const clientActivitySummary = clientActivity.summary || {};
  const creditSubmitConversionRate = Number(
    creditApplicationSummary.submit_conversion_rate ?? platformSummary.credit_submit_conversion_rate ?? 0,
  );
  const clientActivityDistribution = Array.isArray(clientActivity.event_distribution)
    ? clientActivity.event_distribution.filter((item) => Number(item.value || 0) > 0)
    : [];
  const latestClientEvents = Array.isArray(clientActivity.latest_events) ? clientActivity.latest_events : [];
  const topClientActivity = Array.isArray(clientActivity.top_clients) ? clientActivity.top_clients : [];
  const topRegionActivity = Array.isArray(clientActivity.top_regions) ? clientActivity.top_regions : [];
  const monthlyClientEvents = Array.isArray(clientActivity.monthly_events)
    ? clientActivity.monthly_events
        .filter((item) => selectedMonth === 'all' || item.month === selectedMonth)
        .map((item) => ({
          ...item,
          label: formatMonthLabel(item.month),
        }))
    : [];
  const dashboardMonthOptions = useMemo(() => {
    const months = new Set();

    if (Array.isArray(platformDashboard?.monthly_activity)) {
      platformDashboard.monthly_activity.forEach((item) => {
        if (item?.month) {
          months.add(item.month);
        }
      });
    }

    if (Array.isArray(clientActivity.monthly_events)) {
      clientActivity.monthly_events.forEach((item) => {
        if (item?.month) {
          months.add(item.month);
        }
      });
    }

    return [
      { value: 'all', label: 'Tous les mois' },
      ...Array.from(months)
        .sort()
        .reverse()
        .map((month) => ({
          value: month,
          label: formatMonthLabel(month),
        })),
    ];
  }, [clientActivity.monthly_events, platformDashboard]);

  const platformActivityTotal =
    monthlyActivity.reduce(
      (total, item) =>
        total +
        Number(item.users || 0) +
        Number(item.properties || 0) +
        Number(item.requests || 0) +
        Number(item.creditApplications || 0),
      0,
    ) +
    monthlyClientEvents.reduce((total, item) => total + Number(item.events || 0), 0);

  const pieData = useMemo(() => {
    const dbStatusData = creditStatusDistribution
      .map((item) => {
        const option = STATUS_OPTIONS.find((candidate) => candidate.value === item.key);

        return {
          name: option?.label || item.label || item.key,
          value: Number(item.value || 0),
          color: STATUS_COLORS[item.key] || '#0d355a',
        };
      })
      .filter((item) => item.value > 0);

    if (dbStatusData.length) {
      return dbStatusData;
    }

    return STATUS_OPTIONS.slice(1)
      .map((option) => ({
        name: option.label,
        value: Number(summary[option.value] || 0),
        color: STATUS_COLORS[option.value],
      }))
      .filter((item) => item.value > 0);
  }, [creditStatusDistribution, summary]);

  const handleMonthChange = (event) => {
    const nextMonth = event.target.value;
    setSelectedMonth(nextMonth);
    loadDashboard({ status: statusFilter, searchTerm: search.trim(), month: nextMonth });
  };

  const handleExportPlatformReport = () => {
    const rows = [
      ['Section', 'Indicateur', 'Valeur'],
      ['Filtre', 'Mois observe', selectedMonth === 'all' ? 'Tous les mois' : formatMonthLabel(selectedMonth)],
      ['SynthÃƒÂ¨se', 'Utilisateurs', platformSummary.total_users || 0],
      ['SynthÃƒÂ¨se', 'Clients', platformSummary.total_clients || 0],
      ['SynthÃƒÂ¨se', 'Agents bancaires', platformSummary.total_agents || 0],
      ['SynthÃƒÂ¨se', 'Admins', platformSummary.total_admins || 0],
      ['SynthÃƒÂ¨se', 'Biens immobiliers', platformSummary.total_properties || 0],
      ['SynthÃƒÂ¨se', 'Biens actifs', platformSummary.active_properties || 0],
      ['Parcours client', 'Connexions client', clientActivitySummary.client_logins || 0],
      ['Parcours client', 'Calculs de simulation crÃƒÂ©dit', clientActivitySummary.simulation_calculations || 0],
      ['Parcours client', 'Demandes de crÃƒÂ©dit dÃƒÂ©marrÃƒÂ©es', clientActivitySummary.credit_request_starts || 0],
      ['Parcours client', 'Demandes de crÃƒÂ©dit dÃƒÂ©posÃƒÂ©es', totalCreditApplications],
      ['Parcours client', 'RÃƒÂ©gions de carte sÃƒÂ©lectionnÃƒÂ©es', clientActivitySummary.map_region_selects || 0],
      ['SynthÃƒÂ¨se', 'RÃƒÂ©clamations assistance', platformSummary.total_reports || 0],
      ['SynthÃƒÂ¨se', 'RÃƒÂ©clamations clÃƒÂ´turÃƒÂ©es', platformSummary.closed_reports || 0],
      ['SynthÃƒÂ¨se', 'Taux de traitement assistance', `${platformSummary.resolution_rate || 0}%`],
      ['SynthÃƒÂ¨se', 'Conversion dÃƒÂ©pÃƒÂ´t crÃƒÂ©dit', `${creditSubmitConversionRate}%`],
      ...monthlyActivity.map((item) => [
        'Activite mensuelle',
        item.label,
        `${item.users}/${item.properties}/${item.requests}/${item.creditApplications}`,
      ]),
      ...monthlyClientEvents.map((item) => ['Logs client mensuels', item.label, item.events]),
      ...topCities.map((item) => ['Top villes', item.city, item.total]),
      ...topSources.map((item) => ['Sources', item.source, item.total]),
      ...topRegionActivity.map((item) => [
        'RÃƒÂ©gions les plus visitÃƒÂ©es',
        item.region || item.key,
        `${item.total} sÃƒÂ©lections - ${item.active_clients} clients`,
      ]),
      ...topClientActivity.map((item) => [
        'Clients actifs',
        item.name || item.email || `Client #${item.id}`,
        item.total_events,
      ]),
      ...latestUsers.map((item) => ['Derniers utilisateurs', item.name || '-', `${item.role_label} - ${item.email || '-'}`]),
      ...latestRequests.map((item) => ['DerniÃƒÂ¨res rÃƒÂ©clamations', `#${item.id}`, `${item.status_label} - ${item.client_name || '-'}`]),
      ...latestCreditApplications.map((item) => [
        'Derniers dossiers crÃƒÂ©dit',
        `#${item.id}`,
        `${item.status_label} - ${item.full_name || item.email || '-'}`,
      ]),
      ...latestClientEvents.map((item) => [
        'Derniers logs client',
        item.client_name || item.client_email || `Client #${item.client_user_id}`,
        `${item.event_label} - ${formatDateTime(item.created_at)}`,
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    const filename = `rapport-agent-plateforme-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
  };

  return {
    acceptedCreditApplications,
    approvalRate,
    averageComplianceScore,
    clientActivityDistribution,
    clientActivitySummary,
    creditSubmitConversionRate,
    dashboardMonthOptions,
    handleExportPlatformReport,
    handleMonthChange,
    monthlyActivity,
    monthlyClientEvents,
    overviewApplications,
    pendingCount,
    pieData,
    platformActivityTotal,
    platformSummary,
    refusedCreditApplications,
    selectedMonth,
    topCities,
    totalCreditApplications,
  };
}

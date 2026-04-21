export function renderCreatedPropertyReport(res, report) {
  return res.status(201).json({ message: "Reclamation submitted", report });
}

export function renderAdminPropertyReportList(res, payload) {
  const reports = Array.isArray(payload?.reports) ? payload.reports : [];
  const unreadCount = Number(payload?.unreadCount || 0);

  return res.json({ count: reports.length, unreadCount, reports });
}

export function renderUpdatedPropertyReport(res, report) {
  return res.json({ report });
}

export function renderCreatedCreditApplication(res, application) {
  return res.status(201).json({ message: "Credit application submitted", application });
}

export function renderClientCreditApplicationList(res, payload) {
  const applications = Array.isArray(payload?.applications) ? payload.applications : [];
  return res.json({ count: applications.length, applications });
}

export function renderAgentCreditApplicationList(res, payload) {
  const applications = Array.isArray(payload?.applications) ? payload.applications : [];
  const summary = payload?.summary || {};

  return res.json({
    count: applications.length,
    summary,
    applications,
  });
}

export function renderUpdatedCreditApplication(res, application) {
  return res.json({ application });
}

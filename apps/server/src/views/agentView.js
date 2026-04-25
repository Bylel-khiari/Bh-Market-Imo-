export function renderAgentProfile(res, profile) {
  return res.json({ profile });
}

export function renderAgentDashboard(res, payload) {
  return res.json(payload);
}

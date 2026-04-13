import { fetchDecisionDashboardSummary } from "../services/decisionService.js";

export async function getDecisionDashboard(req, res) {
  const summary = await fetchDecisionDashboardSummary();
  return res.json({ summary });
}

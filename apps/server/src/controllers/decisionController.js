import { fetchDecisionDashboardSummary } from "../models/decisionModel.js";
import { renderDecisionDashboard } from "../views/decisionView.js";

export async function getDecisionDashboard(req, res) {
  const summary = await fetchDecisionDashboardSummary();
  return renderDecisionDashboard(res, summary);
}

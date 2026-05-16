import { fetchAgentDashboardSummary, fetchAgentProfile } from "../models/agentModel.js";
import { httpError } from "../utils/httpError.js";
import { renderAgentDashboard, renderAgentProfile } from "../views/agentView.js";

function normalizeDashboardMonth(value) {
  if (value === undefined || value === null || value === "" || value === "all") {
    return null;
  }

  const month = String(value).trim();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw httpError(400, "Invalid month filter. Expected YYYY-MM.");
  }

  return month;
}

export async function getMyAgentProfile(req, res) {
  const userId = req.user?.sub;
  const profile = await fetchAgentProfile(userId);

  if (!profile) {
    throw httpError(404, "Agent profile not found");
  }

  return renderAgentProfile(res, profile);
}

export async function getAgentDashboard(req, res) {
  const dashboard = await fetchAgentDashboardSummary({
    month: normalizeDashboardMonth(req.query?.month),
  });

  return renderAgentDashboard(res, dashboard);
}

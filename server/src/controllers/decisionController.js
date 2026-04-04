import { fetchDecisionDashboardSummary } from "../services/decisionService.js";

export async function getDecisionDashboard(req, res) {
  try {
    const summary = await fetchDecisionDashboardSummary();

    return res.json({ summary });
  } catch (error) {
    console.error("Failed to fetch decision dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard" });
  }
}

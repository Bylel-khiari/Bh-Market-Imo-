import { dbPool } from "../config/db.js";

export async function fetchDecisionDashboardSummary() {
  const [[users]] = await dbPool.query("SELECT COUNT(*) AS total_users FROM users");
  const [[clients]] = await dbPool.query("SELECT COUNT(*) AS total_clients FROM users WHERE role = 'client'");
  const [[agents]] = await dbPool.query("SELECT COUNT(*) AS total_agents FROM users WHERE role = 'agent_bancaire'");
  const [[decisionMakers]] = await dbPool.query(
    "SELECT COUNT(*) AS total_decision_makers FROM users WHERE role = 'responsable_decisionnel'"
  );
  const [[properties]] = await dbPool.query("SELECT COUNT(*) AS total_properties FROM clean_listings");

  return {
    ...users,
    ...clients,
    ...agents,
    ...decisionMakers,
    ...properties,
  };
}

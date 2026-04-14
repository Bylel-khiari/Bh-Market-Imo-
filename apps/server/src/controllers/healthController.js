import { fetchDatabaseHealth } from "../models/healthModel.js";
import { renderDbHealth, renderRoot } from "../views/healthView.js";

export function root(req, res) {
  return renderRoot(res);
}

export async function dbHealth(req, res) {
  const ok = await fetchDatabaseHealth();
  return renderDbHealth(res, ok);
}

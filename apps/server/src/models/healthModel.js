import { checkDbHealth } from "../config/db.js";

export async function fetchDatabaseHealth() {
  return checkDbHealth();
}

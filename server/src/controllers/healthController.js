import { checkDbHealth } from "../config/db.js";

export function root(req, res) {
  res.send("API is running 🚀");
}

export async function dbHealth(req, res) {
  const ok = await checkDbHealth();
  return res.json({ ok: true, db: ok ? "connected" : "unknown" });
}

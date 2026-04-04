import { checkDbHealth } from "../config/db.js";

export function root(req, res) {
  res.send("API is running 🚀");
}

export async function dbHealth(req, res) {
  try {
    const ok = await checkDbHealth();
    return res.json({ ok: true, db: ok ? "connected" : "unknown" });
  } catch (error) {
    console.error("DB health check failed:", error);
    return res.status(500).json({ ok: false, db: "disconnected", message: error.message });
  }
}

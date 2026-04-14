export function renderRoot(res) {
  return res.send("API is running");
}

export function renderDbHealth(res, isConnected) {
  return res.json({ ok: true, db: isConnected ? "connected" : "unknown" });
}

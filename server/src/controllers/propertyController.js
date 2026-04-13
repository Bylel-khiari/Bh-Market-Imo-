import { fetchProperties } from "../services/propertyService.js";

export async function listProperties(req, res) {
  const rows = await fetchProperties({ limit: req.query.limit, city: req.query.city });
  return res.json({ count: rows.length, data: rows, items: rows });
}

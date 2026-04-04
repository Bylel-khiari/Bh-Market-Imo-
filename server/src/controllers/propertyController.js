import { fetchProperties } from "../services/propertyService.js";

export async function listProperties(req, res) {
  try {
    const rows = await fetchProperties({ limit: req.query.limit, city: req.query.city });
    return res.json({ count: rows.length, data: rows, items: rows });
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    return res.status(500).json({ message: "Failed to fetch properties" });
  }
}

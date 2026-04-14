import { fetchProperties } from "../models/propertyModel.js";
import { renderPropertyList } from "../views/propertyView.js";

export async function listProperties(req, res) {
  const rows = await fetchProperties({ limit: req.query.limit, city: req.query.city });
  return renderPropertyList(res, rows);
}

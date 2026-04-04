import { dbPool } from "../config/db.js";

const MAX_PROPERTIES_LIMIT = Number(process.env.PROPERTIES_MAX_LIMIT || 1000);

export async function fetchProperties({ limit = 24, city = "" } = {}) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 24, 1), MAX_PROPERTIES_LIMIT);
  const normalizedCity = String(city || "").trim().toLowerCase();

  let sql = `
    SELECT
      id,
      title,
      price_raw,
      price_value,
      location_raw,
      city,
      city AS governorate,
      country,
      image,
      description,
      source,
      url,
      scraped_at
    FROM clean_listings
  `;

  const params = [];
  if (normalizedCity) {
    sql += " WHERE LOWER(city) = ?";
    params.push(normalizedCity);
  }

  sql += `
    ORDER BY COALESCE(scraped_at, NOW()) DESC, id DESC
    LIMIT ${boundedLimit}
  `;

  const [rows] = await dbPool.execute(sql, params);
  return rows;
}

import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

const MAX_PROPERTIES_LIMIT = Number(process.env.PROPERTIES_MAX_LIMIT || 5000);
const MAX_FAVORITES_LIMIT = Number(process.env.FAVORITES_MAX_LIMIT || 500);

const PROPERTY_SELECT_COLUMNS = `
  p.id,
  p.title,
  p.price_raw,
  p.price_value,
  p.location_raw,
  p.city,
  p.city AS governorate,
  p.country,
  p.image,
  p.description,
  p.source,
  p.url,
  p.scraped_at
`;

let ensureFavoritesTablePromise = null;

function toBoundedLimit(limit, fallback, max) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

async function ensureFavoritesTable() {
  if (!ensureFavoritesTablePromise) {
    ensureFavoritesTablePromise = dbPool
      .query(`
        CREATE TABLE IF NOT EXISTS user_favorite_properties (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT NOT NULL,
          property_id BIGINT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_user_favorite_property (user_id, property_id),
          KEY idx_user_favorite_properties_user_id (user_id),
          KEY idx_user_favorite_properties_property_id (property_id)
        )
      `)
      .catch((error) => {
        ensureFavoritesTablePromise = null;
        throw error;
      });
  }

  return ensureFavoritesTablePromise;
}

async function assertPropertyExists(propertyId) {
  const [rows] = await dbPool.execute("SELECT id FROM properties WHERE id = ? LIMIT 1", [propertyId]);

  if (!rows.length) {
    throw httpError(404, "Property not found");
  }
}

export async function fetchProperties({ limit = 24, city = "" } = {}) {
  const boundedLimit = toBoundedLimit(limit, 24, MAX_PROPERTIES_LIMIT);
  const normalizedCity = String(city || "").trim().toLowerCase();

  let sql = `
    SELECT
      ${PROPERTY_SELECT_COLUMNS}
    FROM properties p
  `;

  const params = [];
  if (normalizedCity) {
    sql += " WHERE LOWER(p.city) = ?";
    params.push(normalizedCity);
  }

  sql += `
    ORDER BY COALESCE(p.scraped_at, NOW()) DESC, p.id DESC
    LIMIT ${boundedLimit}
  `;

  const [rows] = await dbPool.execute(sql, params);
  return rows;
}

export async function fetchFavoriteProperties(userId, { limit = 100 } = {}) {
  await ensureFavoritesTable();
  const boundedLimit = toBoundedLimit(limit, 100, MAX_FAVORITES_LIMIT);

  const [rows] = await dbPool.execute(
    `
    SELECT
      ${PROPERTY_SELECT_COLUMNS},
      ufp.created_at AS favorite_created_at
    FROM user_favorite_properties ufp
    INNER JOIN properties p ON p.id = ufp.property_id
    WHERE ufp.user_id = ?
    ORDER BY ufp.created_at DESC, p.id DESC
    LIMIT ${boundedLimit}
    `,
    [userId]
  );

  return rows;
}

export async function addFavoriteProperty(userId, propertyId) {
  await ensureFavoritesTable();
  await assertPropertyExists(propertyId);

  await dbPool.execute(
    `
    INSERT INTO user_favorite_properties (user_id, property_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE created_at = created_at
    `,
    [userId, propertyId]
  );

  return { property_id: propertyId };
}

export async function removeFavoriteProperty(userId, propertyId) {
  await ensureFavoritesTable();

  const [result] = await dbPool.execute(
    "DELETE FROM user_favorite_properties WHERE user_id = ? AND property_id = ?",
    [userId, propertyId]
  );

  return {
    property_id: propertyId,
    removed: result.affectedRows > 0,
  };
}

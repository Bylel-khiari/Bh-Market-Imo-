import { createHash } from "crypto";
import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";

const MAX_PROPERTIES_LIMIT = Number(process.env.PROPERTIES_MAX_LIMIT || 5000);
const MAX_FAVORITES_LIMIT = Number(process.env.FAVORITES_MAX_LIMIT || 500);
const MAX_ADMIN_PROPERTIES_LIMIT = Number(process.env.ADMIN_PROPERTIES_MAX_LIMIT || 5000);
const ADMIN_PROPERTY_ID_START = 9000000000000;
const PROPERTY_TABLE = "properties";

const PROPERTY_EFFECTIVE_SELECT_COLUMNS = `
  p.id,
  COALESCE(p.manual_title, p.title) AS title,
  COALESCE(p.manual_price_raw, p.price_raw) AS price_raw,
  COALESCE(p.manual_price_value, p.price_value) AS price_value,
  COALESCE(p.manual_location_raw, p.location_raw) AS location_raw,
  COALESCE(p.manual_city, p.city) AS city,
  COALESCE(p.manual_city, p.city) AS governorate,
  COALESCE(p.manual_country, p.country) AS country,
  COALESCE(p.manual_image, p.image) AS image,
  COALESCE(p.manual_description, p.description) AS description,
  COALESCE(p.manual_source, p.source) AS source,
  COALESCE(p.manual_url, p.url) AS url,
  COALESCE(p.manual_scraped_at, p.scraped_at) AS scraped_at
`;

const ADMIN_PROPERTY_SELECT_COLUMNS = `
  ${PROPERTY_EFFECTIVE_SELECT_COLUMNS},
  p.is_active,
  p.is_deleted,
  p.created_by_admin,
  p.admin_updated_at,
  (
    p.manual_title IS NOT NULL OR
    p.manual_price_raw IS NOT NULL OR
    p.manual_price_value IS NOT NULL OR
    p.manual_location_raw IS NOT NULL OR
    p.manual_city IS NOT NULL OR
    p.manual_country IS NOT NULL OR
    p.manual_image IS NOT NULL OR
    p.manual_description IS NOT NULL OR
    p.manual_source IS NOT NULL OR
    p.manual_url IS NOT NULL OR
    p.manual_scraped_at IS NOT NULL
  ) AS has_manual_changes
`;

let ensureFavoritesTablePromise = null;
let ensurePropertiesInfrastructurePromise = null;
let initializePropertyStorePromise = null;

function toBoundedLimit(limit, fallback, max) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeRequiredString(value, fieldName) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw httpError(400, `${fieldName} is required`);
  }

  return normalized;
}

function normalizeOptionalNumber(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw httpError(400, `Invalid ${fieldName}`);
  }

  return Number(numericValue.toFixed(2));
}

function normalizeOptionalDateTime(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, `Invalid ${fieldName}`);
  }

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function toPublicProperty(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    price_raw: row.price_raw,
    price_value: row.price_value,
    location_raw: row.location_raw,
    city: row.city,
    governorate: row.governorate,
    country: row.country,
    image: row.image,
    description: row.description,
    source: row.source,
    url: row.url,
    scraped_at: row.scraped_at,
  };
}

function toAdminProperty(row) {
  if (!row) return null;

  return {
    ...toPublicProperty(row),
    is_active: Boolean(row.is_active),
    created_by_admin: Boolean(row.created_by_admin),
    admin_updated_at: row.admin_updated_at,
    has_manual_changes: Boolean(row.has_manual_changes),
  };
}

function buildAdminDedupeKey(propertyId, source, url, title) {
  return createHash("sha1")
    .update(`admin:${propertyId}:${source}:${url || ""}:${title}`)
    .digest("hex");
}

async function ensurePropertiesInfrastructure() {
  if (!ensurePropertiesInfrastructurePromise) {
    ensurePropertiesInfrastructurePromise = (async () => {
      const [tableRows] = await dbPool.query(`SHOW TABLES LIKE '${PROPERTY_TABLE}'`);
      if (!tableRows.length) {
        const [stagingRows] = await dbPool.query("SHOW TABLES LIKE 'clean_listings'");
        if (stagingRows.length) {
          await dbPool.query("CREATE TABLE properties LIKE clean_listings");
        } else {
          await dbPool.query(`
            CREATE TABLE properties (
              id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
              raw_id VARCHAR(190) NULL,
              source VARCHAR(120) NULL,
              title VARCHAR(255) NULL,
              normalized_title VARCHAR(255) NULL,
              price_raw VARCHAR(255) NULL,
              price_value DECIMAL(15, 2) NULL,
              location_raw VARCHAR(255) NULL,
              normalized_location VARCHAR(255) NULL,
              city VARCHAR(120) NULL,
              country VARCHAR(120) NULL,
              image TEXT NULL,
              description LONGTEXT NULL,
              normalized_description LONGTEXT NULL,
              url TEXT NULL,
              dedupe_key VARCHAR(64) NULL,
              scraped_at DATETIME NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              KEY idx_properties_city (city),
              KEY idx_properties_source (source)
            )
          `);
        }
      }

      const [columnRows] = await dbPool.query(`SHOW COLUMNS FROM ${PROPERTY_TABLE}`);
      const existingColumns = new Set(columnRows.map((row) => row.Field));
      const addColumnStatements = [];

      const ensureColumn = (columnName, definition) => {
        if (!existingColumns.has(columnName)) {
          addColumnStatements.push(`ALTER TABLE ${PROPERTY_TABLE} ADD COLUMN ${definition}`);
        }
      };

      ensureColumn("raw_id", "raw_id VARCHAR(190) NULL");
      ensureColumn("title", "title VARCHAR(255) NULL");
      ensureColumn("normalized_title", "normalized_title VARCHAR(255) NULL");
      ensureColumn("price_raw", "price_raw VARCHAR(255) NULL");
      ensureColumn("price_value", "price_value DECIMAL(15, 2) NULL");
      ensureColumn("location_raw", "location_raw VARCHAR(255) NULL");
      ensureColumn("normalized_location", "normalized_location VARCHAR(255) NULL");
      ensureColumn("city", "city VARCHAR(120) NULL");
      ensureColumn("country", "country VARCHAR(120) NULL");
      ensureColumn("image", "image TEXT NULL");
      ensureColumn("description", "description LONGTEXT NULL");
      ensureColumn("normalized_description", "normalized_description LONGTEXT NULL");
      ensureColumn("source", "source VARCHAR(120) NULL");
      ensureColumn("url", "url TEXT NULL");
      ensureColumn("dedupe_key", "dedupe_key VARCHAR(64) NULL");
      ensureColumn("scraped_at", "scraped_at DATETIME NULL");
      ensureColumn("created_at", "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
      ensureColumn("is_active", "is_active TINYINT(1) NOT NULL DEFAULT 1");
      ensureColumn("is_deleted", "is_deleted TINYINT(1) NOT NULL DEFAULT 0");
      ensureColumn("created_by_admin", "created_by_admin TINYINT(1) NOT NULL DEFAULT 0");
      ensureColumn("manual_title", "manual_title VARCHAR(255) NULL");
      ensureColumn("manual_price_raw", "manual_price_raw VARCHAR(255) NULL");
      ensureColumn("manual_price_value", "manual_price_value DECIMAL(15, 2) NULL");
      ensureColumn("manual_location_raw", "manual_location_raw VARCHAR(255) NULL");
      ensureColumn("manual_city", "manual_city VARCHAR(120) NULL");
      ensureColumn("manual_country", "manual_country VARCHAR(120) NULL");
      ensureColumn("manual_image", "manual_image TEXT NULL");
      ensureColumn("manual_description", "manual_description LONGTEXT NULL");
      ensureColumn("manual_source", "manual_source VARCHAR(120) NULL");
      ensureColumn("manual_url", "manual_url TEXT NULL");
      ensureColumn("manual_scraped_at", "manual_scraped_at DATETIME NULL");
      ensureColumn("admin_updated_at", "admin_updated_at TIMESTAMP NULL DEFAULT NULL");

      for (const sql of addColumnStatements) {
        await dbPool.query(sql);
      }
    })().catch((error) => {
      ensurePropertiesInfrastructurePromise = null;
      throw error;
    });
  }

  return ensurePropertiesInfrastructurePromise;
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

export async function initializePropertyStore() {
  if (!initializePropertyStorePromise) {
    initializePropertyStorePromise = (async () => {
      await ensurePropertiesInfrastructure();
      await ensureFavoritesTable();
    })().catch((error) => {
      initializePropertyStorePromise = null;
      throw error;
    });
  }

  return initializePropertyStorePromise;
}

async function findAdminPropertyRowById(propertyId) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      ${ADMIN_PROPERTY_SELECT_COLUMNS}
    FROM ${PROPERTY_TABLE} p
    WHERE p.id = ?
    LIMIT 1
    `,
    [propertyId]
  );

  return rows[0] || null;
}

async function assertVisiblePropertyExists(propertyId) {
  const [rows] = await dbPool.execute(
    `
    SELECT id
    FROM ${PROPERTY_TABLE}
    WHERE id = ?
      AND COALESCE(is_deleted, 0) = 0
      AND COALESCE(is_active, 1) = 1
    LIMIT 1
    `,
    [propertyId]
  );

  if (!rows.length) {
    throw httpError(404, "Property not found");
  }
}

async function getNextAdminPropertyId(connection) {
  const [rows] = await connection.query(
    `
    SELECT MAX(id) AS max_admin_id
    FROM ${PROPERTY_TABLE}
    WHERE created_by_admin = 1
    `
  );

  const maxAdminId = Number(rows[0]?.max_admin_id || 0);
  return Math.max(maxAdminId, ADMIN_PROPERTY_ID_START - 1) + 1;
}

export async function fetchProperties({ limit = 24, city = "" } = {}) {
  const boundedLimit = toBoundedLimit(limit, 24, MAX_PROPERTIES_LIMIT);
  const normalizedCity = String(city || "").trim().toLowerCase();

  let sql = `
    SELECT
      ${PROPERTY_EFFECTIVE_SELECT_COLUMNS}
    FROM ${PROPERTY_TABLE} p
    WHERE COALESCE(p.is_deleted, 0) = 0
      AND COALESCE(p.is_active, 1) = 1
  `;

  const params = [];
  if (normalizedCity) {
    sql += " AND LOWER(COALESCE(p.manual_city, p.city, '')) = ?";
    params.push(normalizedCity);
  }

  sql += `
    ORDER BY COALESCE(p.admin_updated_at, p.manual_scraped_at, p.scraped_at, NOW()) DESC, p.id DESC
    LIMIT ${boundedLimit}
  `;

  const [rows] = await dbPool.execute(sql, params);
  return rows.map(toPublicProperty);
}

export async function fetchFavoriteProperties(userId, { limit = 100 } = {}) {
  const boundedLimit = toBoundedLimit(limit, 100, MAX_FAVORITES_LIMIT);

  const [rows] = await dbPool.execute(
    `
    SELECT
      ${PROPERTY_EFFECTIVE_SELECT_COLUMNS},
      ufp.created_at AS favorite_created_at
    FROM user_favorite_properties ufp
    INNER JOIN ${PROPERTY_TABLE} p ON p.id = ufp.property_id
    WHERE ufp.user_id = ?
      AND COALESCE(p.is_deleted, 0) = 0
      AND COALESCE(p.is_active, 1) = 1
    ORDER BY ufp.created_at DESC, p.id DESC
    LIMIT ${boundedLimit}
    `,
    [userId]
  );

  return rows.map(toPublicProperty);
}

export async function addFavoriteProperty(userId, propertyId) {
  await assertVisiblePropertyExists(propertyId);

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
  const [result] = await dbPool.execute(
    "DELETE FROM user_favorite_properties WHERE user_id = ? AND property_id = ?",
    [userId, propertyId]
  );

  return {
    property_id: propertyId,
    removed: result.affectedRows > 0,
  };
}

export async function fetchAdminProperties({ limit = 100 } = {}) {
  const boundedLimit = toBoundedLimit(limit, 100, MAX_ADMIN_PROPERTIES_LIMIT);

  const [rows] = await dbPool.query(
    `
    SELECT
      ${ADMIN_PROPERTY_SELECT_COLUMNS}
    FROM ${PROPERTY_TABLE} p
    WHERE COALESCE(p.is_deleted, 0) = 0
    ORDER BY p.id DESC
    LIMIT ${boundedLimit}
    `
  );

  return rows.map(toAdminProperty);
}

export async function createPropertyByAdmin(payload = {}) {
  const title = normalizeRequiredString(payload.title, "title");
  const priceRaw = normalizeOptionalString(payload.price_raw);
  const priceValue = normalizeOptionalNumber(payload.price_value, "price_value");
  const locationRaw = normalizeOptionalString(payload.location_raw);
  const city = normalizeOptionalString(payload.city);
  const country = normalizeOptionalString(payload.country);
  const image = normalizeOptionalString(payload.image);
  const description = normalizeOptionalString(payload.description);
  const source = normalizeOptionalString(payload.source) || "admin";
  const url = normalizeOptionalString(payload.url);
  const scrapedAt =
    normalizeOptionalDateTime(payload.scraped_at, "scraped_at") ||
    new Date().toISOString().slice(0, 19).replace("T", " ");
  const isActive = payload.is_active === false ? 0 : 1;

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const nextPropertyId = await getNextAdminPropertyId(connection);
    const normalizedLocation = [country, city, locationRaw].filter(Boolean).join(" ").toLowerCase() || null;
    const propertyDedupeKey = buildAdminDedupeKey(nextPropertyId, source, url, title);
    await connection.execute(
      `
      INSERT INTO ${PROPERTY_TABLE} (
        id,
        raw_id,
        source,
        title,
        normalized_title,
        price_raw,
        price_value,
        location_raw,
        normalized_location,
        city,
        country,
        image,
        description,
        normalized_description,
        url,
        dedupe_key,
        scraped_at,
        is_active,
        is_deleted,
        created_by_admin,
        admin_updated_at
      )
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW())
      `,
      [
        nextPropertyId,
        source,
        title,
        title.toLowerCase(),
        priceRaw ?? null,
        priceValue ?? null,
        locationRaw ?? null,
        normalizedLocation,
        city ?? null,
        country ?? null,
        image ?? null,
        description ?? null,
        description?.toLowerCase() || null,
        url ?? null,
        propertyDedupeKey,
        scrapedAt,
        isActive,
      ]
    );

    await connection.commit();

    const row = await findAdminPropertyRowById(nextPropertyId);
    return toAdminProperty(row);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePropertyByAdmin(propertyId, payload = {}) {
  const normalizedPropertyId = Number(propertyId);
  if (!normalizedPropertyId) {
    throw httpError(400, "Invalid property id");
  }

  const currentRow = await findAdminPropertyRowById(normalizedPropertyId);
  if (!currentRow || currentRow.is_deleted) {
    throw httpError(404, "Property not found");
  }

  const updates = [];
  const params = [];

  if ("title" in payload) {
    updates.push("manual_title = ?");
    params.push(normalizeRequiredString(payload.title, "title"));
  }

  if ("price_raw" in payload) {
    updates.push("manual_price_raw = ?");
    params.push(normalizeOptionalString(payload.price_raw));
  }

  if ("price_value" in payload) {
    updates.push("manual_price_value = ?");
    params.push(normalizeOptionalNumber(payload.price_value, "price_value"));
  }

  if ("location_raw" in payload) {
    updates.push("manual_location_raw = ?");
    params.push(normalizeOptionalString(payload.location_raw));
  }

  if ("city" in payload) {
    updates.push("manual_city = ?");
    params.push(normalizeOptionalString(payload.city));
  }

  if ("country" in payload) {
    updates.push("manual_country = ?");
    params.push(normalizeOptionalString(payload.country));
  }

  if ("image" in payload) {
    updates.push("manual_image = ?");
    params.push(normalizeOptionalString(payload.image));
  }

  if ("description" in payload) {
    updates.push("manual_description = ?");
    params.push(normalizeOptionalString(payload.description));
  }

  if ("source" in payload) {
    updates.push("manual_source = ?");
    params.push(normalizeOptionalString(payload.source));
  }

  if ("url" in payload) {
    updates.push("manual_url = ?");
    params.push(normalizeOptionalString(payload.url));
  }

  if ("scraped_at" in payload) {
    updates.push("manual_scraped_at = ?");
    params.push(normalizeOptionalDateTime(payload.scraped_at, "scraped_at"));
  }

  if ("is_active" in payload) {
    updates.push("is_active = ?");
    params.push(payload.is_active ? 1 : 0);
  }

  if (!updates.length) {
    throw httpError(400, "At least one field is required");
  }

  updates.push("admin_updated_at = NOW()");

  await dbPool.execute(
    `UPDATE ${PROPERTY_TABLE} SET ${updates.join(", ")} WHERE id = ?`,
    [...params, normalizedPropertyId]
  );

  const updatedRow = await findAdminPropertyRowById(normalizedPropertyId);
  return toAdminProperty(updatedRow);
}

export async function deletePropertyByAdmin(propertyId) {
  const normalizedPropertyId = Number(propertyId);
  if (!normalizedPropertyId) {
    throw httpError(400, "Invalid property id");
  }

  const [result] = await dbPool.execute(
    `
    UPDATE ${PROPERTY_TABLE}
    SET is_deleted = 1,
        is_active = 0,
        admin_updated_at = NOW()
    WHERE id = ?
      AND COALESCE(is_deleted, 0) = 0
    `,
    [normalizedPropertyId]
  );

  if (!result.affectedRows) {
    throw httpError(404, "Property not found");
  }
}

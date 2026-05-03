import { dbPool } from "../config/db.js";
import { httpError } from "../utils/httpError.js";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const MAX_SCRAPE_SITES_LIMIT = Number(process.env.ADMIN_SCRAPE_SITES_MAX_LIMIT || 200);
const SCRAPER_SPIDER_DIR = fileURLToPath(
  new URL("../../../../services/scraper/real_estate_scraper/spiders/", import.meta.url)
);
const SCRAPE_SITE_INTEGRATION_STATUSES = new Set(["ready", "pending_spider", "disabled"]);

const DEFAULT_SCRAPE_SITES = [
  {
    name: "Afariat",
    spider_name: "afariat",
    base_url: "https://afariat.com",
    start_url: "https://afariat.com/appartements",
    description: "Portail de petites annonces immobilieres en Tunisie.",
    is_active: true,
  },
  {
    name: "Annonces Immobilieres",
    spider_name: "annonces_immo",
    base_url: "https://annonces-immobilieres.tn",
    start_url: "https://annonces-immobilieres.tn/annonces",
    description: "Catalogue d'annonces immobilieres specialisees.",
    is_active: true,
  },
  {
    name: "BNB Tunisie",
    spider_name: "bnb",
    base_url: "https://www.bnb.tn",
    start_url: "https://www.bnb.tn/contract/vente/",
    description: "Source orientee annonces immobilieres de BNB Tunisie.",
    is_active: true,
  },
  {
    name: "Darcom Tunisia",
    spider_name: "darcom",
    base_url: "https://darcomtunisia.com",
    start_url: "https://darcomtunisia.com",
    description: "Catalogue immobilier Darcom Tunisia.",
    is_active: true,
  },
  {
    name: "Fi Dari",
    spider_name: "fi_dari",
    base_url: "https://fi-dari.tn",
    start_url: "https://fi-dari.tn/sitemap.xml",
    description: "Source de collecte via sitemap Fi Dari.",
    is_active: true,
  },
  {
    name: "Immo Entre Particuliers",
    spider_name: "immo_particuliers",
    base_url: "https://tunisie.immo-entre-particuliers.com",
    start_url: "https://tunisie.immo-entre-particuliers.com",
    description: "Annonces immobilieres entre particuliers.",
    is_active: true,
  },
  {
    name: "Immobilier.com.tn",
    spider_name: "immobilier_tn",
    base_url: "https://www.immobilier.com.tn",
    start_url: "https://www.immobilier.com.tn",
    description: "Portail immobilier tunisien generaliste.",
    is_active: true,
  },
  {
    name: "Immobiliere Sallouha",
    spider_name: "immobiliere_sallouha",
    base_url: "https://immobilieresallouha.com",
    start_url: "https://immobilieresallouha.com",
    description: "Catalogue immobilier de l'agence Sallouha.",
    is_active: true,
  },
  {
    name: "Mubawab",
    spider_name: "mubawab",
    base_url: "https://www.mubawab.tn",
    start_url: "https://www.mubawab.tn/fr/sc/appartements-a-vendre",
    description: "Marketplace immobilier Mubawab Tunisie.",
    is_active: true,
  },
  {
    name: "Property Legacy",
    spider_name: "property",
    base_url: "https://www.tayara.tn",
    start_url: "https://www.tayara.tn/ads/c/Immobilier/",
    description: "Spider legacy de collecte sur Tayara.",
    is_active: true,
  },
  {
    name: "Tayara Immobilier",
    spider_name: "tayara",
    base_url: "https://www.tayara.tn",
    start_url: "https://www.tayara.tn/ads/c/Immobilier/",
    description: "Collecte des annonces immobilieres Tayara.",
    is_active: true,
  },
  {
    name: "Tecnocasa Tunisie",
    spider_name: "tecnocasa",
    base_url: "https://www.tecnocasa.tn",
    start_url: "https://www.tecnocasa.tn",
    description: "Catalogue Tecnocasa pour le marche tunisien.",
    is_active: true,
  },
  {
    name: "Tunisie Annonce",
    spider_name: "tunisie_annonce",
    base_url: "http://www.tunisie-annonce.com",
    start_url: "http://www.tunisie-annonce.com/AnnoncesImmobilier.asp",
    description: "Portail historique d'annonces en Tunisie.",
    is_active: true,
  },
  {
    name: "Tunplan",
    spider_name: "tunplan",
    base_url: "https://tunplan.com",
    start_url: "https://tunplan.com/index.php/listing-category/immobilier/",
    description: "Site d'annonces et de services immobiliers Tunplan.",
    is_active: true,
  },
];

let ensureScrapeSitesTablePromise = null;
let initializeScrapeSiteStorePromise = null;

function toBoundedLimit(limit, fallback, max) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeSpiderName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized || null;
}

export function normalizeBaseDomain(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = new URL(rawValue.includes("://") ? rawValue : `https://${rawValue}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeIntegrationStatus(value, fallback = "ready") {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (!SCRAPE_SITE_INTEGRATION_STATUSES.has(normalized)) {
    throw httpError(400, "Invalid integration_status");
  }

  return normalized;
}

function spiderExists(spiderName) {
  return Boolean(spiderName && existsSync(join(SCRAPER_SPIDER_DIR, `${spiderName}.py`)));
}

function assertCanActivateScrapeSite({ spiderName, integrationStatus }) {
  if (integrationStatus !== "ready") {
    throw httpError(400, "Le site ne peut pas etre active tant que son spider n est pas pret.");
  }

  if (!spiderExists(spiderName)) {
    throw httpError(400, "Le spider Scrapy correspondant est introuvable.");
  }
}

function toPublicScrapeSite(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    spider_name: row.spider_name,
    base_url: row.base_url,
    start_url: row.start_url,
    description: row.description,
    is_active: Boolean(row.is_active),
    integration_status: row.integration_status || "ready",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureScrapeSitesTable() {
  if (!ensureScrapeSitesTablePromise) {
    ensureScrapeSitesTablePromise = (async () => {
      const [tableRows] = await dbPool.query("SHOW TABLES LIKE 'scrape_sites'");
      const shouldSeedDefaults = tableRows.length === 0;

      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS scrape_sites (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          name VARCHAR(120) NOT NULL,
          spider_name VARCHAR(120) NOT NULL,
          base_url VARCHAR(255) NULL,
          start_url VARCHAR(255) NULL,
          description TEXT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          integration_status VARCHAR(32) NOT NULL DEFAULT 'ready',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_scrape_sites_spider_name (spider_name)
        )
      `);

      if (shouldSeedDefaults) {
        for (const site of DEFAULT_SCRAPE_SITES) {
          await dbPool.execute(
            `
            INSERT INTO scrape_sites (name, spider_name, base_url, start_url, description, is_active, integration_status)
            VALUES (?, ?, ?, ?, ?, ?, 'ready')
            `,
            [
              site.name,
              site.spider_name,
              site.base_url,
              site.start_url,
              site.description,
              site.is_active ? 1 : 0,
            ]
          );
        }
      }
    })().catch((error) => {
      ensureScrapeSitesTablePromise = null;
      throw error;
    });
  }

  return ensureScrapeSitesTablePromise;
}

export async function initializeScrapeSiteStore() {
  if (!initializeScrapeSiteStorePromise) {
    initializeScrapeSiteStorePromise = ensureScrapeSitesTable().catch((error) => {
      initializeScrapeSiteStorePromise = null;
      throw error;
    });
  }

  return initializeScrapeSiteStorePromise;
}

async function findScrapeSiteRowById(id) {
  const [rows] = await dbPool.execute(
    `
    SELECT
      id,
      name,
      spider_name,
      base_url,
      start_url,
      description,
      is_active,
      integration_status,
      created_at,
      updated_at
    FROM scrape_sites
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function assertUniqueSpiderName(spiderName, excludedId = null) {
  const params = [spiderName];
  let sql = "SELECT id FROM scrape_sites WHERE spider_name = ?";

  if (excludedId) {
    sql += " AND id <> ?";
    params.push(excludedId);
  }

  sql += " LIMIT 1";

  const [rows] = await dbPool.execute(sql, params);
  if (rows.length > 0) {
    throw httpError(409, "Un site avec ce spider existe deja");
  }
}

export async function fetchScrapeSites({ limit = 100 } = {}) {
  const boundedLimit = toBoundedLimit(limit, 100, MAX_SCRAPE_SITES_LIMIT);

  const [rows] = await dbPool.query(
    `
    SELECT
      id,
      name,
      spider_name,
      base_url,
      start_url,
      description,
      is_active,
      integration_status,
      created_at,
      updated_at
    FROM scrape_sites
    ORDER BY name ASC, id ASC
    LIMIT ${boundedLimit}
    `
  );

  return rows.map(toPublicScrapeSite);
}

export async function scrapeSiteDomainExists(domain) {
  const normalizedDomain = normalizeBaseDomain(domain);
  if (!normalizedDomain) {
    return false;
  }

  await ensureScrapeSitesTable();

  const [rows] = await dbPool.execute(
    `
    SELECT id
    FROM scrape_sites
    WHERE LOWER(REPLACE(REPLACE(REPLACE(COALESCE(base_url, start_url, ''), 'https://', ''), 'http://', ''), 'www.', '')) LIKE ?
    LIMIT 1
    `,
    [`${normalizedDomain}%`]
  );

  return rows.length > 0;
}

export async function createScrapeSite(payload = {}) {
  const name = normalizeOptionalString(payload.name);
  const spiderName = normalizeSpiderName(payload.spider_name);
  const integrationStatus = normalizeIntegrationStatus(payload.integration_status, "ready");
  const isActive = payload.is_active === false ? false : true;

  if (!name || !spiderName) {
    throw httpError(400, "name and spider_name are required");
  }

  if (isActive) {
    assertCanActivateScrapeSite({ spiderName, integrationStatus });
  }

  await assertUniqueSpiderName(spiderName);

  const [result] = await dbPool.execute(
    `
    INSERT INTO scrape_sites (name, spider_name, base_url, start_url, description, is_active, integration_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      spiderName,
      normalizeOptionalString(payload.base_url),
      normalizeOptionalString(payload.start_url),
      normalizeOptionalString(payload.description),
      isActive ? 1 : 0,
      integrationStatus,
    ]
  );

  const row = await findScrapeSiteRowById(result.insertId);
  return toPublicScrapeSite(row);
}

export async function updateScrapeSite(siteId, payload = {}) {
  const normalizedSiteId = Number(siteId);
  if (!normalizedSiteId) {
    throw httpError(400, "Invalid scrape site id");
  }

  const currentRow = await findScrapeSiteRowById(normalizedSiteId);
  if (!currentRow) {
    throw httpError(404, "Scrape site not found");
  }

  const updates = [];
  const params = [];
  const nextState = {
    spiderName: currentRow.spider_name,
    integrationStatus: currentRow.integration_status || "ready",
    isActive: Boolean(currentRow.is_active),
  };

  if ("name" in payload) {
    const name = normalizeOptionalString(payload.name);
    if (!name) {
      throw httpError(400, "name is required");
    }
    updates.push("name = ?");
    params.push(name);
  }

  if ("spider_name" in payload) {
    const spiderName = normalizeSpiderName(payload.spider_name);
    if (!spiderName) {
      throw httpError(400, "spider_name is required");
    }

    await assertUniqueSpiderName(spiderName, normalizedSiteId);
    updates.push("spider_name = ?");
    params.push(spiderName);
    nextState.spiderName = spiderName;
  }

  if ("base_url" in payload) {
    updates.push("base_url = ?");
    params.push(normalizeOptionalString(payload.base_url));
  }

  if ("start_url" in payload) {
    updates.push("start_url = ?");
    params.push(normalizeOptionalString(payload.start_url));
  }

  if ("description" in payload) {
    updates.push("description = ?");
    params.push(normalizeOptionalString(payload.description));
  }

  if ("is_active" in payload) {
    updates.push("is_active = ?");
    params.push(payload.is_active ? 1 : 0);
    nextState.isActive = Boolean(payload.is_active);
  }

  if ("integration_status" in payload) {
    const integrationStatus = normalizeIntegrationStatus(payload.integration_status, currentRow.integration_status);
    updates.push("integration_status = ?");
    params.push(integrationStatus);
    nextState.integrationStatus = integrationStatus;
  }

  if (!updates.length) {
    throw httpError(400, "At least one field is required");
  }

  if (nextState.isActive) {
    assertCanActivateScrapeSite({
      spiderName: nextState.spiderName,
      integrationStatus: nextState.integrationStatus,
    });
  }

  await dbPool.execute(
    `UPDATE scrape_sites SET ${updates.join(", ")} WHERE id = ?`,
    [...params, normalizedSiteId]
  );

  const updatedRow = await findScrapeSiteRowById(normalizedSiteId);
  return toPublicScrapeSite(updatedRow);
}

export async function deleteScrapeSite(siteId) {
  const normalizedSiteId = Number(siteId);
  if (!normalizedSiteId) {
    throw httpError(400, "Invalid scrape site id");
  }

  const [result] = await dbPool.execute("DELETE FROM scrape_sites WHERE id = ?", [normalizedSiteId]);
  if (!result.affectedRows) {
    throw httpError(404, "Scrape site not found");
  }
}

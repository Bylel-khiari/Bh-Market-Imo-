import {
  createPropertyByAdmin,
  deletePropertyByAdmin,
  fetchAdminPropertiesPage,
  updatePropertyByAdmin,
} from "../models/propertyModel.js";
import {
  createUserByAdmin,
  deleteUserByAdmin,
  fetchUsers,
  updateUserByAdmin,
} from "../models/adminModel.js";
import { createScrapeSite, deleteScrapeSite, fetchScrapeSites, updateScrapeSite } from "../models/scrapeSiteModel.js";
import {
  acceptScrapeSiteSuggestion,
  fetchScrapeSiteSuggestions,
  updateScrapeSiteSuggestion,
} from "../models/scrapeSiteSuggestionModel.js";
import {
  configureScraperAutomation,
  fetchScraperAutomationStatus,
  startListingCleanerAgent,
  startScraperCycle,
  stopScraperCycle,
} from "../services/scraperControlService.js";
import { startSiteDiscoveryRun } from "../services/siteDiscoveryService.js";
import { recordAdminAuditLog } from "../models/adminAuditLogModel.js";
import {
  renderAdminPropertiesList,
  renderAcceptedScrapeSiteSuggestion,
  renderCreatedAdminProperty,
  renderCreatedUser,
  renderCreatedScrapeSite,
  renderDeletedAdminProperty,
  renderDeletedUser,
  renderDeletedScrapeSite,
  renderScrapeSiteSuggestion,
  renderScrapeSiteSuggestionsList,
  renderScraperControl,
  renderScrapeSitesList,
  renderSiteDiscoveryRun,
  renderUpdatedAdminProperty,
  renderUpdatedUser,
  renderUpdatedScrapeSite,
  renderUsersList,
} from "../views/adminView.js";

export async function listUsers(req, res) {
  const rows = await fetchUsers({ limit: req.query.limit });
  return renderUsersList(res, rows);
}

export async function createUser(req, res) {
  const createdUser = await createUserByAdmin(req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.user.create",
    targetType: "user",
    targetId: createdUser?.id,
    metadata: { role: createdUser?.role, email: createdUser?.email },
  });
  return renderCreatedUser(res, createdUser);
}

export async function updateUser(req, res) {
  const updatedUser = await updateUserByAdmin(req.params.id, req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.user.update",
    targetType: "user",
    targetId: req.params.id,
    metadata: { updated_fields: Object.keys(req.body || {}) },
  });
  return renderUpdatedUser(res, updatedUser);
}

export async function deleteUser(req, res) {
  await deleteUserByAdmin(req.params.id);
  await recordAdminAuditLog(req, {
    action: "admin.user.delete",
    targetType: "user",
    targetId: req.params.id,
  });
  return renderDeletedUser(res);
}

export async function listPropertiesByAdmin(req, res) {
  const payload = await fetchAdminPropertiesPage({
    limit: req.query.limit,
    page: req.query.page,
    status: req.query.status,
    search: req.query.search,
  });
  return renderAdminPropertiesList(res, payload);
}

export async function createProperty(req, res) {
  const property = await createPropertyByAdmin(req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.property.create",
    targetType: "property",
    targetId: property?.id,
    metadata: { title: property?.title },
  });
  return renderCreatedAdminProperty(res, property);
}

export async function updateProperty(req, res) {
  const property = await updatePropertyByAdmin(req.params.id, req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.property.update",
    targetType: "property",
    targetId: req.params.id,
    metadata: { updated_fields: Object.keys(req.body || {}) },
  });
  return renderUpdatedAdminProperty(res, property);
}

export async function deleteProperty(req, res) {
  await deletePropertyByAdmin(req.params.id);
  await recordAdminAuditLog(req, {
    action: "admin.property.delete",
    targetType: "property",
    targetId: req.params.id,
  });
  return renderDeletedAdminProperty(res);
}

export async function listScrapeSites(req, res) {
  const rows = await fetchScrapeSites({ limit: req.query.limit });
  return renderScrapeSitesList(res, rows);
}

export async function listScrapeSiteSuggestionsByAdmin(req, res) {
  const rows = await fetchScrapeSiteSuggestions({
    limit: req.query.limit,
    status: req.query.status,
  });
  return renderScrapeSiteSuggestionsList(res, rows);
}

export async function updateScrapeSiteSuggestionByAdmin(req, res) {
  const suggestion = await updateScrapeSiteSuggestion(req.params.id, req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scrape_site_suggestion.update",
    targetType: "scrape_site_suggestion",
    targetId: req.params.id,
    metadata: { status: suggestion?.status },
  });
  return renderScrapeSiteSuggestion(res, suggestion);
}

export async function acceptScrapeSiteSuggestionByAdmin(req, res) {
  const payload = await acceptScrapeSiteSuggestion(req.params.id, req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scrape_site_suggestion.accept",
    targetType: "scrape_site_suggestion",
    targetId: req.params.id,
    metadata: { scrape_site_id: payload?.site?.id },
  });
  return renderAcceptedScrapeSiteSuggestion(res, payload);
}

export async function startScrapeSiteDiscoveryByAdmin(req, res) {
  const payload = await startSiteDiscoveryRun({ trigger: "manual" });
  await recordAdminAuditLog(req, {
    action: "admin.scrape_site_discovery.start",
    targetType: "scrape_site_discovery",
    metadata: { status: payload?.status, suggestions_written: payload?.result?.suggestions_written },
  });
  return renderSiteDiscoveryRun(res, payload);
}

export async function createScrapeSiteByAdmin(req, res) {
  const site = await createScrapeSite(req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scrape_site.create",
    targetType: "scrape_site",
    targetId: site?.id,
    metadata: { spider_name: site?.spider_name, integration_status: site?.integration_status },
  });
  return renderCreatedScrapeSite(res, site);
}

export async function updateScrapeSiteByAdmin(req, res) {
  const site = await updateScrapeSite(req.params.id, req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scrape_site.update",
    targetType: "scrape_site",
    targetId: req.params.id,
    metadata: { updated_fields: Object.keys(req.body || {}) },
  });
  return renderUpdatedScrapeSite(res, site);
}

export async function deleteScrapeSiteByAdmin(req, res) {
  await deleteScrapeSite(req.params.id);
  await recordAdminAuditLog(req, {
    action: "admin.scrape_site.delete",
    targetType: "scrape_site",
    targetId: req.params.id,
  });
  return renderDeletedScrapeSite(res);
}

export async function getScraperControlByAdmin(req, res) {
  const control = await fetchScraperAutomationStatus();
  return renderScraperControl(res, control);
}

export async function updateScraperControlByAdmin(req, res) {
  const control = await configureScraperAutomation(req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scraper_control.update",
    targetType: "scraper_control",
    targetId: control?.id,
    metadata: req.body || {},
  });
  return renderScraperControl(res, control);
}

export async function startScraperByAdmin(req, res) {
  const control = await startScraperCycle(req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scraper_control.start",
    targetType: "scraper_control",
    targetId: control?.id,
    metadata: { run_type: control?.run_type },
  });
  return renderScraperControl(res, control);
}

export async function startListingCleanerByAdmin(req, res) {
  const control = await startListingCleanerAgent(req.body || {});
  await recordAdminAuditLog(req, {
    action: "admin.scraper_control.cleaner_start",
    targetType: "scraper_control",
    targetId: control?.id,
    metadata: { run_type: control?.run_type },
  });
  return renderScraperControl(res, control);
}

export async function stopScraperByAdmin(req, res) {
  const control = await stopScraperCycle();
  await recordAdminAuditLog(req, {
    action: "admin.scraper_control.stop",
    targetType: "scraper_control",
    targetId: control?.id,
    metadata: { run_type: control?.run_type },
  });
  return renderScraperControl(res, control);
}

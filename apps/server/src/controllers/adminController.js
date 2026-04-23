import {
  createPropertyByAdmin,
  deletePropertyByAdmin,
  fetchAdminProperties,
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
  configureScraperAutomation,
  fetchScraperAutomationStatus,
  startScraperCycle,
  stopScraperCycle,
} from "../services/scraperControlService.js";
import {
  renderAdminPropertiesList,
  renderCreatedAdminProperty,
  renderCreatedUser,
  renderCreatedScrapeSite,
  renderDeletedAdminProperty,
  renderDeletedUser,
  renderDeletedScrapeSite,
  renderScraperControl,
  renderScrapeSitesList,
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
  return renderCreatedUser(res, createdUser);
}

export async function updateUser(req, res) {
  const updatedUser = await updateUserByAdmin(req.params.id, req.body || {});
  return renderUpdatedUser(res, updatedUser);
}

export async function deleteUser(req, res) {
  await deleteUserByAdmin(req.params.id);
  return renderDeletedUser(res);
}

export async function listPropertiesByAdmin(req, res) {
  const rows = await fetchAdminProperties({ limit: req.query.limit });
  return renderAdminPropertiesList(res, rows);
}

export async function createProperty(req, res) {
  const property = await createPropertyByAdmin(req.body || {});
  return renderCreatedAdminProperty(res, property);
}

export async function updateProperty(req, res) {
  const property = await updatePropertyByAdmin(req.params.id, req.body || {});
  return renderUpdatedAdminProperty(res, property);
}

export async function deleteProperty(req, res) {
  await deletePropertyByAdmin(req.params.id);
  return renderDeletedAdminProperty(res);
}

export async function listScrapeSites(req, res) {
  const rows = await fetchScrapeSites({ limit: req.query.limit });
  return renderScrapeSitesList(res, rows);
}

export async function createScrapeSiteByAdmin(req, res) {
  const site = await createScrapeSite(req.body || {});
  return renderCreatedScrapeSite(res, site);
}

export async function updateScrapeSiteByAdmin(req, res) {
  const site = await updateScrapeSite(req.params.id, req.body || {});
  return renderUpdatedScrapeSite(res, site);
}

export async function deleteScrapeSiteByAdmin(req, res) {
  await deleteScrapeSite(req.params.id);
  return renderDeletedScrapeSite(res);
}

export async function getScraperControlByAdmin(req, res) {
  const control = await fetchScraperAutomationStatus();
  return renderScraperControl(res, control);
}

export async function updateScraperControlByAdmin(req, res) {
  const control = await configureScraperAutomation(req.body || {});
  return renderScraperControl(res, control);
}

export async function startScraperByAdmin(req, res) {
  const control = await startScraperCycle(req.body || {});
  return renderScraperControl(res, control);
}

export async function stopScraperByAdmin(req, res) {
  const control = await stopScraperCycle();
  return renderScraperControl(res, control);
}

import {
  createUserByAdmin,
  deleteUserByAdmin,
  fetchUsers,
  updateUserByAdmin,
} from "../models/adminModel.js";
import {
  createScrapeSite,
  deleteScrapeSite,
  fetchScrapeSites,
  updateScrapeSite,
} from "../models/scrapeSiteModel.js";
import {
  renderCreatedUser,
  renderCreatedScrapeSite,
  renderDeletedUser,
  renderDeletedScrapeSite,
  renderScrapeSitesList,
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

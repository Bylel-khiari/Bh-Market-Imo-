import {
  createUserByAdmin,
  deleteUserByAdmin,
  fetchUsers,
  updateUserByAdmin,
} from "../models/adminModel.js";
import {
  renderCreatedUser,
  renderDeletedUser,
  renderUpdatedUser,
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

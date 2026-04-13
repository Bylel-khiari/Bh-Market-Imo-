import {
  createUserByAdmin,
  deleteUserByAdmin,
  fetchUsers,
  updateUserByAdmin,
} from "../services/adminService.js";

export async function listUsers(req, res) {
  const rows = await fetchUsers({ limit: req.query.limit });
  return res.json({ count: rows.length, users: rows });
}

export async function createUser(req, res) {
  const createdUser = await createUserByAdmin(req.body || {});
  return res.status(201).json({ user: createdUser });
}

export async function updateUser(req, res) {
  const updatedUser = await updateUserByAdmin(req.params.id, req.body || {});
  return res.json({ user: updatedUser });
}

export async function deleteUser(req, res) {
  await deleteUserByAdmin(req.params.id);
  return res.status(204).send();
}

import {
  createUserByAdmin,
  deleteUserByAdmin,
  fetchUsers,
  updateUserByAdmin,
} from "../services/adminService.js";

export async function listUsers(req, res) {
  try {
    const rows = await fetchUsers({ limit: req.query.limit });

    return res.json({ count: rows.length, users: rows });
  } catch (error) {
    console.error("Failed to list users:", error);
    return res.status(500).json({ message: "Failed to list users" });
  }
}

export async function createUser(req, res) {
  try {
    const createdUser = await createUserByAdmin(req.body || {});
    return res.status(201).json({ user: createdUser });
  } catch (error) {
    console.error("Failed to create user:", error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to create user" });
  }
}

export async function updateUser(req, res) {
  try {
    const updatedUser = await updateUserByAdmin(req.params.id, req.body || {});
    return res.json({ user: updatedUser });
  } catch (error) {
    console.error("Failed to update user:", error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update user" });
  }
}

export async function deleteUser(req, res) {
  try {
    await deleteUserByAdmin(req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete user:", error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to delete user" });
  }
}

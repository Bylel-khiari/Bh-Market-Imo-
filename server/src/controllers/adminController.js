import { fetchUsers } from "../services/adminService.js";

export async function listUsers(req, res) {
  try {
    const rows = await fetchUsers({ limit: req.query.limit });

    return res.json({ count: rows.length, users: rows });
  } catch (error) {
    console.error("Failed to list users:", error);
    return res.status(500).json({ message: "Failed to list users" });
  }
}

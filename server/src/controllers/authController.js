import { getUserById, loginUser, registerUser } from "../services/authService.js";

export async function register(req, res) {
  try {
    const { token, user } = await registerUser(req.body || {});
    return res.status(201).json({ message: "User registered", token, user });
  } catch (error) {
    console.error("Register failed:", error);
    return res.status(error.status || 500).json({ message: error.message || "Registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { token, user } = await loginUser(req.body || {});
    return res.json({ message: "Login successful", token, user });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(error.status || 500).json({ message: error.message || "Login failed" });
  }
}

export async function me(req, res) {
  try {
    const userId = req.user?.sub;
    const user = await getUserById(userId);
    return res.json({ user });
  } catch (error) {
    console.error("Fetch current user failed:", error);
    return res.status(error.status || 500).json({ message: error.message || "Failed to fetch user" });
  }
}

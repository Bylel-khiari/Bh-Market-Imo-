import { getUserById, loginUser, registerUser } from "../services/authService.js";

export async function register(req, res) {
  const { token, user } = await registerUser(req.body || {});
  return res.status(201).json({ message: "User registered", token, user });
}

export async function login(req, res) {
  const { token, user } = await loginUser(req.body || {});
  return res.json({ message: "Login successful", token, user });
}

export async function me(req, res) {
  const userId = req.user?.sub;
  const user = await getUserById(userId);
  return res.json({ user });
}

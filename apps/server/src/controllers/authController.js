import { getUserById, loginUser, registerUser } from "../models/authModel.js";
import {
  renderAuthenticatedUser,
  renderCurrentUser,
  renderRegisteredUser,
} from "../views/authView.js";

export async function register(req, res) {
  const { token, user } = await registerUser(req.body || {});
  return renderRegisteredUser(res, { token, user });
}

export async function login(req, res) {
  const { token, user } = await loginUser(req.body || {});
  return renderAuthenticatedUser(res, { token, user });
}

export async function me(req, res) {
  const userId = req.user?.sub;
  const user = await getUserById(userId);
  return renderCurrentUser(res, user);
}

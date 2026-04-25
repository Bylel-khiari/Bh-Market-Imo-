import { getUserById, loginUser } from "../models/authModel.js";
import { renderAuthenticatedUser, renderCurrentUser } from "../views/authView.js";

export async function login(req, res) {
  const { token, user } = await loginUser(req.body || {});
  return renderAuthenticatedUser(res, { token, user });
}

export async function me(req, res) {
  const userId = req.user?.sub;
  const user = await getUserById(userId);
  return renderCurrentUser(res, user);
}

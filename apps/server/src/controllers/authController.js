import { changeUserPassword, getUserById, loginUser } from "../models/authModel.js";
import {
  CLIENT_ACTIVITY_EVENT_TYPES,
  recordClientActivityLog,
} from "../models/clientActivityLogModel.js";
import { renderAuthenticatedUser, renderCurrentUser } from "../views/authView.js";

const ACCESS_TOKEN_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "bh_market_access_token";
const isProduction = process.env.NODE_ENV === "production";

function setAccessTokenCookie(res, token) {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000),
    path: "/",
  });
}

export async function login(req, res) {
  const { token, user } = await loginUser(req.body || {});
  if (user?.role === "client") {
    await recordClientActivityLog(req, {
      clientUserId: user.id,
      eventType: CLIENT_ACTIVITY_EVENT_TYPES.CLIENT_LOGIN_SUCCESS,
      page: "/login",
      targetType: "user",
      targetId: user.id,
      metadata: { email: user.email },
    });
  }
  setAccessTokenCookie(res, token);
  return renderAuthenticatedUser(res, { token, user });
}

export async function me(req, res) {
  const userId = req.user?.sub;
  const user = await getUserById(userId);
  return renderCurrentUser(res, user);
}

export async function updatePassword(req, res) {
  const user = await changeUserPassword(req.user?.sub, req.body || {});

  return res.json({
    message: "Mot de passe mis a jour avec succes.",
    user,
  });
}

export async function logout(req, res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  });

  return res.status(204).send();
}

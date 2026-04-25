export function renderAuthenticatedUser(res, payload) {
  return res.json({ message: "Login successful", ...payload });
}

export function renderCurrentUser(res, user) {
  return res.json({ user });
}

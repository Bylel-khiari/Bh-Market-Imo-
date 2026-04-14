export function renderRegisteredUser(res, payload) {
  return res.status(201).json({ message: "User registered", ...payload });
}

export function renderAuthenticatedUser(res, payload) {
  return res.json({ message: "Login successful", ...payload });
}

export function renderCurrentUser(res, user) {
  return res.json({ user });
}

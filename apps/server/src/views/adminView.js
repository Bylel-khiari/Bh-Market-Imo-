export function renderUsersList(res, users) {
  return res.json({ count: users.length, users });
}

export function renderCreatedUser(res, user) {
  return res.status(201).json({ user });
}

export function renderUpdatedUser(res, user) {
  return res.json({ user });
}

export function renderDeletedUser(res) {
  return res.status(204).send();
}

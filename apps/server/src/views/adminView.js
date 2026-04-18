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

export function renderScrapeSitesList(res, sites) {
  return res.json({ count: sites.length, sites });
}

export function renderCreatedScrapeSite(res, site) {
  return res.status(201).json({ site });
}

export function renderUpdatedScrapeSite(res, site) {
  return res.json({ site });
}

export function renderDeletedScrapeSite(res) {
  return res.status(204).send();
}

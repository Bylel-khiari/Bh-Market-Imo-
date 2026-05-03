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

export function renderAdminPropertiesList(res, payload) {
  const properties = Array.isArray(payload) ? payload : payload?.properties || [];
  return res.json({
    count: properties.length,
    properties,
    pagination: payload?.pagination || {
      page: 1,
      limit: properties.length,
      total: properties.length,
      totalPages: 1,
      status: "all",
      search: "",
    },
  });
}

export function renderCreatedAdminProperty(res, property) {
  return res.status(201).json({ property });
}

export function renderUpdatedAdminProperty(res, property) {
  return res.json({ property });
}

export function renderDeletedAdminProperty(res) {
  return res.status(204).send();
}

export function renderScrapeSitesList(res, sites) {
  return res.json({ count: sites.length, sites });
}

export function renderScrapeSiteSuggestionsList(res, suggestions) {
  return res.json({ count: suggestions.length, suggestions });
}

export function renderScrapeSiteSuggestion(res, suggestion) {
  return res.json({ suggestion });
}

export function renderAcceptedScrapeSiteSuggestion(res, payload) {
  return res.status(201).json(payload);
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

export function renderScraperControl(res, control) {
  return res.json({ control });
}

export function renderSiteDiscoveryRun(res, payload) {
  return res.json(payload);
}

export function renderPropertyList(res, rows) {
  return res.json({ count: rows.length, data: rows, items: rows });
}

export function renderFavoriteList(res, rows) {
  return res.json({
    count: rows.length,
    propertyIds: rows.map((row) => row.id),
    data: rows,
    items: rows,
  });
}

export function renderFavoriteMutation(res, payload) {
  const { statusCode = 200, ...body } = payload;
  return res.status(statusCode).json(body);
}

export function renderPropertyList(res, rows) {
  return res.json({ count: rows.length, data: rows, items: rows });
}

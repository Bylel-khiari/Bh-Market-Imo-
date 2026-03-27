export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeGovernorateName(value = '') {
  return normalizeText(value)
    .replace(/gouvernorat|governorate|ولاية/g, '')
    .replace(/\bel\b/g, '')
    .trim();
}

export function adaptDatabaseListings(rows = []) {
  return rows.map((row, index) => ({
    id: row.id ?? row._id ?? row.uuid ?? `listing-${index}`,
    title: row.title ?? row.name ?? row.reference ?? 'Untitled listing',
    description: row.description ?? '',
    governorate:
      row.governorate ??
      row.region ??
      row.state ??
      row.city ??
      row.location_raw ??
      row.address?.governorate ??
      row.location?.governorate ??
      '',
    location:
      row.locationLabel ??
      row.location_name ??
      row.location_raw ??
      row.city ??
      row.delegation ??
      row.address?.city ??
      row.location?.city ??
      row.governorate ??
      '',
    price: row.price ?? row.price_value ?? row.amount ?? row.salePrice ?? null,
    currency: row.currency ?? 'TND',
    rooms: row.rooms ?? row.bedrooms ?? row.roomCount ?? null,
    source: row.source ?? row.website ?? row.provider ?? 'database',
    latitude: row.latitude ?? row.lat ?? row.coordinates?.lat ?? null,
    longitude: row.longitude ?? row.lng ?? row.coordinates?.lng ?? null,
    raw: row,
  }));
}

export function groupListingsByGovernorate(listings = []) {
  return listings.reduce((acc, listing) => {
    const key = normalizeGovernorateName(listing.governorate);
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(listing);
    return acc;
  }, {});
}

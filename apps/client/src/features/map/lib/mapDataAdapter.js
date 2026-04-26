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
  const normalized = normalizeText(value)
    .replace(/gouvernorat|governorate|\u0648\u0644\u0627\u064a\u0629/g, '')
    .replace(/\bel\b/g, '')
    .trim();

  const aliases = {
    jandouba: 'jendouba',
    mannouba: 'manouba',
    mednine: 'medenine',
    'sidi bou zid': 'sidi bouzid',
  };

  return aliases[normalized] || normalized;
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

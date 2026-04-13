# Tunisia Dynasty Map — Integration version

This version is simplified for real project integration.

## What changed

- Removed business-rule pipeline from the map component
- No rental filter inside the UI
- No "older than 3 years" filter inside the UI
- No dedupe logic inside the UI
- The map now expects data that is already cleaned by your agent/backend
- Added a simple database/API adapter: `src/lib/mapDataAdapter.js`
- Added example backend fetch from `/api/properties`

## Expected flow in your real project

Your agent / backend should do:

- remove rental listings
- remove old listings
- dedupe listings
- return clean rows to the frontend

The frontend map should only:

- load Tunisia GeoJSON
- render governorates
- group listings by governorate
- show markers and selected listings

## Main files

- `src/components/TunisiaDynastyMap.jsx` → UI map component
- `src/lib/mapDataAdapter.js` → adapts your DB/API rows to the map format
- `src/App.jsx` → example integration with `/api/properties`

## Quick integration in your own project

### 1) Keep only the component + adapter

Copy:

- `src/components/TunisiaDynastyMap.jsx`
- `src/lib/mapDataAdapter.js`
- needed CSS from `src/styles.css`

### 2) In your real page

```jsx
import { useEffect, useState } from 'react';
import TunisiaDynastyMap from './components/TunisiaDynastyMap';
import { adaptDatabaseListings } from './lib/mapDataAdapter';

export default function MapPage() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    async function loadListings() {
      const response = await fetch('/api/properties');
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload.data || payload.items || [];
      setListings(adaptDatabaseListings(rows));
    }

    loadListings();
  }, []);

  return <TunisiaDynastyMap listings={listings} />;
}
```

## Required listing shape after adaptation

```js
{
  id: 'abc123',
  title: 'Villa...',
  governorate: 'Tunis',
  location: 'Lac 2',
  price: 500000,
  currency: 'TND',
  rooms: 4,
  source: 'mysql'
}
```

## GeoJSON note

Default GeoJSON URL is remote. For full offline/local use:

1. download Tunisia governorates GeoJSON
2. put it in `/public/data/tunisia-governorates.geojson`
3. pass:

```jsx
<TunisiaDynastyMap geoJsonUrl="/data/tunisia-governorates.geojson" listings={listings} />
```

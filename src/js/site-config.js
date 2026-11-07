/**
 * ATELIER ÉLAN – site configuration (single place to change institute details).
 *
 * ADDRESS / MAP
 * The address below is a scaffold placeholder that has NOT been confirmed as the institute's real location,
 * so `confirmed` is false and the Contact page shows a real, interactive OpenStreetMap view of the general
 * city area (`area`) with NO pin and an "area map" label.
 * When the real address is known:
 *   1. Update `address` here, in src/partials/footer.html and in contact.html, then run `npm run sync`.
 *   2. Set `confirmed: true` and fill in `address.lat` / `address.lon` (from openstreetmap.org, right-click
 *      "Show address"). The map then zooms to that point and drops a marker, and the caption changes.
 */
export const SITE = {
  name: 'ATELIER ÉLAN',
  address: {
    street: '24 Rue du Faubourg Saint-Honoré',
    postalCity: '75008 Paris',
    country: 'France',
    confirmed: false,
    lat: null,
    lon: null,
  },
  /** General area shown until the address is confirmed. bbox = west,south,east,north (Paris, France). */
  area: { label: 'Paris, France', bbox: [2.2241, 48.8156, 2.4699, 48.9022] },
  email: 'admissions@atelierelan.edu',
  phone: '+33 (0)1 42 68 55 00',
  hours: 'Mon – Fri, 08:30 – 19:00 CET',
};

export const fullAddress = () => `${SITE.address.street}, ${SITE.address.postalCity}, ${SITE.address.country}`;

/** OpenStreetMap embed (keyless, interactive). Confirmed address → zoomed view with marker; otherwise area only, no marker. */
export const mapEmbedUrl = () => {
  const { confirmed, lat, lon } = SITE.address;
  if (confirmed && lat != null && lon != null) {
    const d = 0.004;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=${SITE.area.bbox.join(',')}&layer=mapnik`;
};

/** Link to the same view on openstreetmap.org (for the "View larger map" link). */
export const mapPageUrl = () => {
  const { confirmed, lat, lon } = SITE.address;
  if (confirmed && lat != null && lon != null) return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
  const [w, s, e, n] = SITE.area.bbox;
  return `https://www.openstreetmap.org/#map=12/${((s + n) / 2).toFixed(4)}/${((w + e) / 2).toFixed(4)}`;
};

export const mapCaption = () => (SITE.address.confirmed
  ? `Map of ${fullAddress()}.`
  : `Area map of ${SITE.area.label}. This is a general area view only, not the institute’s exact location; the verified address will be added when confirmed.`);

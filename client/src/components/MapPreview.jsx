// Phase 12: map snippet for a Location document (pickup points, org profiles).
// Renders an OpenStreetMap embed (no API key required). When the location has
// no coordinates yet it degrades to the plain address text.

function hasCoords(location) {
  return (
    location &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number'
  )
}

export default function MapPreview({ location, address, height = 220, label = 'Map' }) {
  if (!hasCoords(location)) {
    return (
      <p className="small text-muted mb-0">
        {address || location?.addressLine || 'No map available for this address yet.'}
      </p>
    )
  }

  const lat = location.latitude
  const lng = location.longitude

  // Small bbox (~2 km) around the point so the marker sits centre-frame.
  const bbox = [lng - 0.012, lat - 0.007, lng + 0.012, lat + 0.007].join('%2C')
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapmarker&marker=${lat}%2C${lng}`
  const fullMapHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`

  return (
    <div>
      <iframe
        title={label}
        src={embedSrc}
        className="w-100 rounded border"
        style={{ height, border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
      <div className="d-flex justify-content-between align-items-center mt-1">
        <span className="small text-muted">
          {location.addressLine}
          {location.city ? `, ${location.city}` : ''}
        </span>
        <a
          href={fullMapHref}
          target="_blank"
          rel="noreferrer"
          className="small text-success"
        >
          Open full map
        </a>
      </div>
    </div>
  )
}

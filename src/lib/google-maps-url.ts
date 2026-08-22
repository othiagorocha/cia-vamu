export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

export function eventMapsHref(destination: string) {
  const trimmed = destination.trim();

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    // texto livre: busca no Maps
  }

  return googleMapsSearchUrl(trimmed);
}

export function eventLocationLabel(event: {
  location: string | null;
  locationMapsQuery: string | null;
}) {
  return event.location?.trim() || event.locationMapsQuery?.trim() || "";
}

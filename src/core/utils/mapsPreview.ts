export type LatLng = { lat: number; lng: number };

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Tries to extract lat/lng from URL text or Google Maps HTML.
 * Includes common patterns: @lat,lng, !3d!4d, q/ll/center/query params.
 */
export function extractLatLngFromText(text: string): LatLng | null {
  const d3 = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i);
  if (d3) {
    const lat = parseFloat(d3[1]);
    const lng = parseFloat(d3[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng };
    }
  }

  const paramPatterns = [
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const re of paramPatterns) {
    const m = text.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isValidLatLng(lat, lng)) {
        return { lat, lng };
      }
    }
  }

  const atRe = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
  for (const m of text.matchAll(atRe)) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Resolves preview coordinates: long Google URLs in client;
 * short links (goo.gl / maps.app) through public proxy (no backend).
 */
export async function resolveLatLngForMapsUrl(
  url: string,
  signal?: AbortSignal,
): Promise<LatLng | null> {
  const trimmed = url.trim();
  const direct = extractLatLngFromText(trimmed);
  if (direct) {
    return direct;
  }

  let hostname: string;
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    return null;
  }

  const needsProxy =
    hostname.includes('goo.gl') || hostname.includes('maps.app') || hostname.includes('bit.ly');

  if (!needsProxy) {
    return null;
  }

  async function fetchHtmlViaProxy(proxyBase: string): Promise<string | null> {
    const response = await fetch(proxyBase, { signal });
    if (!response.ok) {
      return null;
    }
    return response.text();
  }

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmed)}`,
    `https://corsproxy.io/?${encodeURIComponent(trimmed)}`,
  ];

  let text: string | null = null;
  for (const proxyUrl of proxies) {
    if (signal?.aborted) {
      return null;
    }
    try {
      text = await fetchHtmlViaProxy(proxyUrl);
      if (text) {
        break;
      }
    } catch {
      /* try next proxy */
    }
  }

  if (!text || signal?.aborted) {
    return null;
  }

  const fromHtml = extractLatLngFromText(text);
  if (fromHtml) {
    return fromHtml;
  }

  const mapUrlRe = /https?:\/\/[^"'\\s<>]+google\.com\/maps[^"'\\s<>]*/gi;
  const mapUrls = text.match(mapUrlRe);
  if (mapUrls) {
    for (const u of mapUrls) {
      const nested = extractLatLngFromText(u);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

/** OpenStreetMap iframe embed (no Google scripts; often avoids extension blocking). */
export function osmEmbedUrl(lat: number, lng: number, margin = 0.007): string {
  const minLon = lng - margin;
  const minLat = lat - margin;
  const maxLon = lng + margin;
  const maxLat = lat + margin;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${lat},${lng}`;
}

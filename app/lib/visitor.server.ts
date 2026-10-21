/** Device, country and traffic source for the analytics breakdowns. No personal data. */

export interface Visitor {
  /** "d" desktop, "m" phone/tablet, "" unknown */
  device: string;
  /** ISO country of the storefront (Shopify market), "" unknown */
  country: string;
}

/** From the storefront request body (`d` and `c`, sent by game-popup.js). */
export function visitorOf(body: Record<string, unknown>): Visitor {
  const device = body.d === "d" || body.d === "m" ? body.d : "";
  const country = /^[A-Z]{2}$/.test(String(body.c ?? "")) ? String(body.c) : "";
  return { device, country };
}

export const deviceFromUserAgent = (ua: string | null | undefined) =>
  !ua ? "" : /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "m" : "d";

/**
 * Traffic source of an order (keys of SOURCE_LABELS in traffic-sources.ts), from the landing page URL (utm / click ids) and
 * the referrer Shopify records on the order.
 */
export function orderSource(order: { landing_site?: string | null; referring_site?: string | null }) {
  let q = new URLSearchParams();
  try {
    if (order.landing_site) q = new URL(order.landing_site, "https://shop.invalid").searchParams;
  } catch {
    /* malformed landing URL: fall back to the referrer */
  }
  const src = (q.get("utm_source") ?? "").toLowerCase();
  const medium = (q.get("utm_medium") ?? "").toLowerCase();
  let ref = "";
  try {
    ref = order.referring_site ? new URL(order.referring_site).hostname.toLowerCase() : "";
  } catch {
    /* ignore */
  }

  if (q.has("gclid") || q.has("gbraid") || q.has("wbraid") || (src.includes("google") && /cpc|ppc|paid|ads/.test(medium))) return "google_ads";
  if (q.has("fbclid") || /facebook|instagram|^fb$|^ig$|^meta$/.test(src)) return "meta";
  if (q.has("ttclid") || src.includes("tiktok")) return "tiktok";
  if (medium.includes("email") || /klaviyo|omnisend|mailchimp|newsletter|brevo/.test(src)) return "email";
  if (src) return "campaign";
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia)\./.test(ref)) return "search";
  if (/(^|\.)(facebook|instagram)\.com$|^l\.facebook|^lm\.facebook/.test(ref)) return "meta";
  if (/tiktok\.com$/.test(ref)) return "tiktok";
  if (/(^|\.)(t\.co|twitter\.com|x\.com|pinterest\.|linkedin\.com|reddit\.com|youtube\.com)/.test(ref)) return "social";
  if (ref) return "referral";
  return "direct";
}

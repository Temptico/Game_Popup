import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { allow, clientIp } from "./rate-limit.server";
import { previewFeatures } from "./billing.server";

/**
 * Verifies an app proxy request (HMAC signature added by Shopify) and parses
 * its JSON body. Storefront calls go to /apps/gamediscount/* and Shopify
 * forwards them to /proxy/* on this app.
 */
export async function readProxyRequest(request: Request, limit?: { name: string; perHour: number }) {
  if (request.method !== "POST") {
    throw json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) {
    throw json({ ok: false, error: "not_installed" }, { status: 401 });
  }
  const ip = limit && clientIp(request);
  if (limit && ip && !allow(`${limit.name}:${session.shop}:${ip}`, limit.perHour)) {
    // Enforced on store copies first. The public app only logs until we know
    // Shopify always forwards the shopper's IP (else every shopper would share one counter).
    if (!previewFeatures()) {
      console.warn(`[${limit.name}] would rate limit (log only)`);
    } else {
      console.warn(`[${limit.name}] rate limited`);
      throw json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    throw json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  return { shop: session.shop, admin, body };
}

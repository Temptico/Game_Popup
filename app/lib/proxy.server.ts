import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Verifies an app proxy request (HMAC signature added by Shopify) and parses
 * its JSON body. Storefront calls go to /apps/gamediscount/* and Shopify
 * forwards them to /proxy/* on this app.
 */
export async function readProxyRequest(request: Request) {
  if (request.method !== "POST") {
    throw json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) {
    throw json({ ok: false, error: "not_installed" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    throw json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  return { shop: session.shop, admin, body };
}

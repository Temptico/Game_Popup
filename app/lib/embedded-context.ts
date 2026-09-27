// Recovery for full reloads inside the Shopify admin iframe.
//
// The admin loads the app with ?shop=…&host=…; client-side navigation drops
// those params. If the iframe then fully reloads (Vite dev reloads, a stray
// <a href>, a missing session-token header…), the server can't tell which
// shop it is and sends the user to /auth/login. We remember shop/host and the
// current path, and the login page uses them to bounce straight back in.

const KEY = "gd_embedded_ctx";
const RECOVERY_KEY = "gd_embedded_recovery_at";

interface EmbeddedContext {
  shop: string;
  host: string;
  path: string;
}

function read(): EmbeddedContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EmbeddedContext) : null;
  } catch {
    return null;
  }
}

export function rememberEmbeddedContext(search: string, pathname: string) {
  try {
    const params = new URLSearchParams(search);
    const prev = read();
    const shop = params.get("shop") ?? prev?.shop;
    const host = params.get("host") ?? prev?.host;
    if (!shop || !host) return;
    sessionStorage.setItem(KEY, JSON.stringify({ shop, host, path: pathname }));
  } catch {
    /* storage unavailable – nothing to remember */
  }
}

/** Returns the URL to reload into, or null if recovery isn't possible/safe. */
export function recoveryUrl(): string | null {
  if (typeof window === "undefined" || window.top === window.self) return null;
  const ctx = read();
  if (!ctx) return null;
  try {
    // Don't loop: at most one automatic recovery every 15 seconds.
    const last = Number(sessionStorage.getItem(RECOVERY_KEY) || 0);
    if (Date.now() - last < 15_000) return null;
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    return null;
  }
  const path = ctx.path.startsWith("/app") ? ctx.path : "/app";
  const qs = new URLSearchParams({ shop: ctx.shop, host: ctx.host, embedded: "1" });
  return `${path}?${qs}`;
}

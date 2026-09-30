#!/usr/bin/env bash
# Starts the production server (remix-serve, as on Fly) and sends a validly
# signed app-proxy request. Catches code that works under Vite dev but breaks
# in production, e.g. Web APIs missing from Remix's fetch polyfill.
set -euo pipefail
export PORT=3999 SHOPIFY_API_KEY=smoke SHOPIFY_API_SECRET=smoke-secret \
  SHOPIFY_APP_URL=https://example.com SCOPES=read_orders NODE_ENV=production
: "${DATABASE_URL:=file:dev.sqlite}"; export DATABASE_URL
npx remix-serve ./build/server/index.js > /tmp/smoke.log 2>&1 &
pid=$!; trap 'kill $pid 2>/dev/null || true' EXIT
q=$(node -e '
const c = require("crypto");
const p = { shop: "smoke.myshopify.com", path_prefix: "/apps/gamediscount", timestamp: String(Math.floor(Date.now() / 1000)) };
const msg = Object.keys(p).sort().map((k) => k + "=" + p[k]).join("");
p.signature = c.createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(msg).digest("hex");
console.log(new URLSearchParams(p).toString());')
for path in subscribe claim track; do
  for i in $(seq 1 30); do
    body=$(curl -s -X POST -H 'content-type: application/json' -d '{}' "localhost:$PORT/proxy/$path?$q" || true)
    [ -n "$body" ] && break; sleep 1
  done
  echo "/proxy/$path -> $body"
  [[ "$body" == *'"not_installed"'* ]] || { echo "::error::/proxy/$path is broken in production"; cat /tmp/smoke.log; exit 1; }
done

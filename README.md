# Enigma Play: Game Popup

A Shopify app, built with Remix and App Bridge, that shows a popup after a set delay. The visitor enters their name and email, plays a paddle-and-ball game, and gets a discount code if they last long enough.

## Architecture

```
Storefront (theme app embed)                    App (Remix, this repo)
────────────────────────────                    ───────────────────────────────
blocks/game-popup.liquid                         /app              popups list, plan card
  reads app.metafields.gamediscount.config  ◄──  /app/popups/:id   settings (General/Game/Design/Texts)
assets/game-popup.js  (minified)                 /app/analytics    funnel + code usage (Pro)
  POST /apps/gamediscount/track     ──proxy──►   /proxy/track      view, play events
  POST /apps/gamediscount/subscribe ──proxy──►   /proxy/subscribe  customerCreate / consent + issues claim token
  POST /apps/gamediscount/claim     ──proxy──►   /proxy/claim      checks token, creates/returns the code, logs the win
                                                 /app/plans        Billing API: Free / Pro $9/mo
```

- **Settings storage.** Popups are stored in Prisma, which is the source of truth. Every change republishes a JSON **app-data metafield** on the app installation (`gamediscount.config`), and the theme extension reads it with Liquid. Because the metafield belongs to the app, merchants and other apps can't edit it by accident. It also adds no Liquid or network cost to page render.
- **The discount code is never in the page source.** The metafield leaves out the code. `/proxy/claim` returns it only after a win. If the code were in the source, anyone could get it with "view source".
- **Unique single-use codes (Pro).** With *Unique single-use code per winner* selected, `/proxy/claim` creates a separate `discountCodeBasicCreate` discount for each winner: percentage or fixed amount off the order, `usageLimit: 1`, once per customer, and an optional expiry (default 7 days). The code looks like `WIN-K7M2QX9A`. A leaked code is worth at most one order.
- **Claims are gated.** `/proxy/subscribe` issues a random claim token per (popup, email). `/proxy/claim` requires it and refuses claims that arrive sooner than the survive time after the token was issued (a real game can't be faster). Each email gets at most one code per popup: re-entering the same email returns the same code rather than minting a new one. Only a salted SHA-256 of the email is stored, never the email itself. If unique codes can't be created (Pro lapsed, or an API error), the optional shared fallback code is returned instead. In theme-editor test mode the claim returns `<PREFIX>-PREVIEW` and never a real code.
- **Email capture** goes through the app proxy to the Admin GraphQL API (`customerCreate`, or `tagsAdd` plus `customerEmailMarketingConsentUpdate` if the customer already exists). It works on every Shopify plan. Customers get the tag `gamediscount`. Marketing consent is recorded only when the visitor ticks the checkbox. Consent is never downgraded, and an existing customer's name is never overwritten. If the proxy can't be reached, the script falls back to `fetch('/contact', { redirect: 'manual' })`.
- **Anti-replay.** `localStorage` stores `gd_claimed_<id>` and `gd_attempts_<id>`, and `sessionStorage` stores `gd_dismissed_<id>`. A visitor who closes the popup doesn't see it again in that session.
- **Languages.** Supported languages are sl, hr, ro and en, picked from `document.documentElement.lang`. The server resolves the strings (defaults plus the merchant's overrides) and publishes them in the metafield, so the storefront JS carries no translations and stays under Theme Check's 10 KB app-block limit.
- **Plans (revenue-based).** Every plan has every feature. Plans differ only by how much revenue the popup generates, meaning orders that used an Enigma Play code (shared or unique), over a rolling 30 days, converted to USD at approximate rates:

  | Plan | Price | Popup revenue / 30 days |
  |---|---|---|
  | Free | $0 | up to $500 (with "Powered by Enigma Play") |
  | Standard | $9.99 | up to $3,000 |
  | Growth | $19.99 | up to $12,000 |
  | Scale | $29.99 | unlimited |

  The `orders/create` webhook records matching orders in `AttributedOrder`. When a store goes over its plan's cap, the admin shows an upgrade banner and the popup keeps running for a **14-day grace period** (`ShopState.overLimitSince`). After that it pauses (the published config has no popups) until the store upgrades or the rolling revenue drops back under the cap. Subscriptions created under the earlier "GameDiscount …" plan names keep working (the old single "GameDiscount Pro" plan counts as Growth).

## Setup

```bash
npm install
npm run config:link        # link to your app in the Partner Dashboard (fills client_id + URLs)
npm run dev                # builds the storefront bundle, runs migrations, starts the tunnel
```

Then:

1. In the app, **create the discount code** under Shopify → Discounts, then create a popup and enter that code.
2. Click **Open theme editor** on the app home. This enables the **Enigma Play popup** app embed. Save the theme.
3. To test on the storefront, turn on *Test mode* in the embed settings. The popup then shows after 0.5 s, ignores the "already played" memory, and doesn't record analytics. Turn it off before going live.

### Required Partner Dashboard settings
- **Protected customer data access** (API access → Protected customer data). Fill in the reasons for protected customer data (needed for the `orders/create` webhook) and request the *name* and *email* fields, because the app writes customers. Without it, `customerCreate` and the orders webhook fail on production stores.
- The **app proxy** is declared in `shopify.app.toml` (`/apps/gamediscount` → `/proxy`). The CLI keeps its URL in sync while `npm run dev` is running.
- Billing: development stores (including Shopify's reviewers') always get test charges, and live stores get real ones. `BILLING_TEST=true` forces test charges everywhere.

### Editing the storefront script
The storefront code lives in `storefront/`:
- `game-popup.js` is the core: triggers, form, floating button, reward and countdown. It is loaded on every page, so it must stay **under 10 KB minified** (Theme Check's app-block limit).
- `games/gd-paddle.js` and `games/gd-flipper.js` are the games. Each one registers `window.GameDiscountGames[name] = (canvas, opts) => ({ start({ tick, end }), stop() })` and is loaded only when the popup opens.
- `games/gd-fx.js` holds optional extras (confetti, and the `/contact` fallback for when the app proxy is unreachable).

`npm run build:storefront` (which `dev` and `deploy` also run) minifies all of them into `extensions/gamediscount-popup/assets/`. Commit both the sources and the built files. To add a game, create `games/gd-<name>.js`, add it to the build script, the `assets` map in `blocks/game-popup.liquid`, and `GAMES` in `app/lib/popup-defaults.ts`.

### Conversion features
- **Trigger:** exit intent (mouse leaving through the top of the window, desktop only), the delay, or whichever comes first. Touch devices always use the delay.
- **Frequency:** the popup opens by itself at most once per session (default), once per day, once per week, or on every page until it is closed. When the cap applies, only the floating button is shown.
- **Floating button:** after the popup is closed, a pill in the bottom-left reopens the game. After a win, it shows the code and the countdown on every page until the code expires.
- **Reward by attempt** (unique codes): the discount depends on which attempt the visitor won on (default 15/10/5%). The tier is reported by the client. The spread is small and each code is single-use, so the value of cheating it is low.
- **Countdown:** it is only ever shown when it is real. With "Urgency countdown" set, the generated code's `endsAt` is exactly that many minutes out. A fake timer would be misleading under EU consumer law (UCPD).
- **Flipper difficulty:** gravity 0.12 and a speed cap of 10 were tuned with a headless simulation. With the default 15 s, an idle player loses in about 5 s, a typical player (120 ms reactions, 20% misses) wins about 39% per attempt (about 77% over 3 attempts), and a slow player wins about 45% over 3 attempts.

### Deploying (GitHub Actions → Fly.io + Shopify)
`.github/workflows/deploy.yml` runs manually: **Actions → Deploy → Run workflow** (choose the branch).
1. **checks:** `npm ci`, Prisma migrations on a fresh DB, typecheck, lint, build, verifies the committed storefront bundle, and Theme Check. If anything fails, it stops.
2. **deploy-fly:** creates the Fly app and a 1 GB volume on the first run, sets runtime secrets, runs `flyctl deploy`, then a smoke test. The container applies Prisma migrations to `/data/prod.sqlite` on start.
3. **shopify-deploy:** points `shopify.app.toml` at `https://<FLY_APP_NAME>.fly.dev` and runs `shopify app deploy --allow-updates` (config + theme extension, never deletes).

Required repository secrets: `FLY_API_TOKEN`, `FLY_APP_NAME`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_AUTOMATION_TOKEN`. Optional: `BILLING_TEST=true` to force test charges on every store (by default only development stores get test charges).

### Production notes
- The database is SQLite on a Fly volume (`DATABASE_URL`, see `fly.toml`), so the app runs as a single machine. Once traffic grows, move to Postgres (for example Neon) and scale out. Locally, `scripts/ensure-env.cjs` writes `DATABASE_URL="file:dev.sqlite"` to `.env` automatically.
- The GDPR compliance webhooks are handled in `webhooks.compliance.tsx`. Customers live in Shopify, events are anonymous, and claims store only an email hash, which `customers/redact` deletes.
- Every generated code is its own discount in Shopify → Discounts, titled `Enigma Play – <popup> – <code>`. With an expiry set, they expire on their own.

## Scopes
`write_customers` (email capture), `write_discounts` (unique codes per winner and code usage on the analytics page), `read_orders` (revenue attribution for plans and analytics). Merchants who installed with the old `read_discounts` scope are asked to approve the new scope the next time they open the app.

# GameDiscount – Gamification Popup

A Shopify app, built with Remix and App Bridge, that shows a popup after a set delay. The visitor enters their name and email, plays a paddle-and-ball game, and gets a discount code if they last long enough.

## Architecture

```
Storefront (theme app embed)                    App (Remix, this repo)
────────────────────────────                    ───────────────────────────────
blocks/game-popup.liquid                         /app              popups list, plan card
  reads app.metafields.gamediscount.config  ◄──  /app/popups/:id   settings (General/Game/Design/Texts)
assets/game-popup.js  (minified)                 /app/analytics    funnel + code usage (Pro)
  POST /apps/gamediscount/track     ──proxy──►   /proxy/track      view, play events
  POST /apps/gamediscount/subscribe ──proxy──►   /proxy/subscribe  customerCreate / consent (Admin GraphQL)
  POST /apps/gamediscount/claim     ──proxy──►   /proxy/claim      releases the discount code, logs the win
                                                 /app/plans        Billing API: Free / Pro $9/mo
```

- **Settings storage.** Popups are stored in Prisma, which is the source of truth. Every change republishes a JSON **app-data metafield** on the app installation (`gamediscount.config`), and the theme extension reads it with Liquid. Because the metafield belongs to the app, merchants and other apps can't edit it by accident. It also adds no Liquid or network cost to page render.
- **The discount code is never in the page source.** The metafield leaves out the code. `/proxy/claim` returns it only after a win. If the code were in the source, anyone could get it with "view source".
- **Email capture** goes through the app proxy to the Admin GraphQL API (`customerCreate`, or `tagsAdd` plus `customerEmailMarketingConsentUpdate` if the customer already exists). It works on every Shopify plan. Customers get the tag `gamediscount`. Marketing consent is recorded only when the visitor ticks the checkbox. Consent is never downgraded, and an existing customer's name is never overwritten. If the proxy can't be reached, the script falls back to `fetch('/contact', { redirect: 'manual' })`.
- **Anti-replay.** `localStorage` stores `gd_claimed_<id>` and `gd_attempts_<id>`, and `sessionStorage` stores `gd_dismissed_<id>`. A visitor who closes the popup doesn't see it again in that session.
- **Languages.** Supported languages are sl, hr, ro and en, picked from `document.documentElement.lang`. The server resolves the strings (defaults plus the merchant's overrides) and publishes them in the metafield, so the storefront JS carries no translations and stays under Theme Check's 10 KB app-block limit.
- **Plans.** Enforced when a popup is saved or activated, and again when the config is published:

  | | Free | Pro ($9 / 30 days) |
  |---|---|---|
  | Active popups | 1 | Unlimited (each can target a page type) |
  | "Powered by GameDiscount" | shown | hidden |
  | Custom colors | defaults used | yes |
  | Analytics page | locked (events still recorded) | yes |

  The `app_subscriptions/update` webhook republishes the config, so an upgrade or downgrade reaches the storefront immediately.

## Setup

```bash
npm install
npm run config:link        # link to your app in the Partner Dashboard (fills client_id + URLs)
npm run dev                # builds the storefront bundle, runs migrations, starts the tunnel
```

Then:

1. In the app, **create the discount code** under Shopify → Discounts, then create a popup and enter that code.
2. Click **Open theme editor** on the app home. This enables the **GameDiscount popup** app embed. Save the theme.
3. To test on the storefront, turn on *Test mode* in the embed settings. The popup then shows after 0.5 s, ignores the "already played" memory, and doesn't record analytics. Turn it off before going live.

### Required Partner Dashboard settings
- **Protected customer data access** (API access → Protected customer data). Request access to *name* and *email*, because the app writes customers. Without it, `customerCreate` fails on production stores.
- The **app proxy** is declared in `shopify.app.toml` (`/apps/gamediscount` → `/proxy`). The CLI keeps its URL in sync while `npm run dev` is running.
- `BILLING_TEST=false` in production. Anything else creates test charges.

### Editing the storefront script
Edit `storefront/game-popup.js`. `npm run build:storefront` (which `dev` and `deploy` also run) minifies it into `extensions/gamediscount-popup/assets/game-popup.js`. Commit both files.

### Production notes
- SQLite is fine for dev. Before launch, switch the Prisma `datasource` to Postgres or MySQL, because the Event table grows with traffic.
- The GDPR compliance webhooks are handled in `webhooks.compliance.tsx`. The app stores no customer PII: customers live in Shopify, and events are anonymous.

## Scopes
`write_customers` (email capture), `read_discounts` (code usage on the analytics page).

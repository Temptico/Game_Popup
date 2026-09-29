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
- **Plans.** Enforced when a popup is saved or activated, and again when the config is published:

  | | Free | Pro ($9 / 30 days) |
  |---|---|---|
  | Active popups | 1 | Unlimited (each can target a page type) |
  | "Powered by GameDiscount" | shown | hidden |
  | Custom colors | defaults used | yes |
  | Analytics page | locked (events still recorded) | yes |
  | Unique single-use code per winner | – | yes |

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
The storefront code lives in `storefront/`:
- `game-popup.js` is the core: triggers, form, floating button, reward and countdown. It is loaded on every page, so it must stay **under 10 KB minified** (Theme Check's app-block limit).
- `games/gd-paddle.js` and `games/gd-flipper.js` are the games. Each one registers `window.GameDiscountGames[name] = (canvas, opts) => ({ start({ tick, end }), stop() })` and is loaded only when the popup opens.
- `games/gd-fx.js` holds optional extras (confetti, and the `/contact` fallback for when the app proxy is unreachable).

`npm run build:storefront` (which `dev` and `deploy` also run) minifies all of them into `extensions/gamediscount-popup/assets/`. Commit both the sources and the built files. To add a game, create `games/gd-<name>.js`, add it to the build script, the `assets` map in `blocks/game-popup.liquid`, and `GAMES` in `app/lib/popup-defaults.ts`.

### Conversion features
- **Trigger:** exit intent (mouse leaving through the top of the window, desktop only), the delay, or whichever comes first. Touch devices always use the delay.
- **Floating button:** after the popup is closed, a pill in the bottom-left reopens the game. After a win, it shows the code and the countdown on every page until the code expires.
- **Reward by attempt** (unique codes): the discount depends on which attempt the visitor won on (default 15/10/5%). The tier is reported by the client. The spread is small and each code is single-use, so the value of cheating it is low.
- **Countdown:** it is only ever shown when it is real. With "Urgency countdown" set, the generated code's `endsAt` is exactly that many minutes out. A fake timer would be misleading under EU consumer law (UCPD).
- **Flipper difficulty:** gravity 0.12 and a speed cap of 10 were tuned with a headless simulation. With the default 15 s, an idle player loses in about 5 s, a typical player (120 ms reactions, 20% misses) wins about 39% per attempt (about 77% over 3 attempts), and a slow player wins about 45% over 3 attempts.

### Production notes
- SQLite is fine for dev. Before launch, switch the Prisma `datasource` to Postgres or MySQL, because the Event table grows with traffic.
- The GDPR compliance webhooks are handled in `webhooks.compliance.tsx`. Customers live in Shopify, events are anonymous, and claims store only an email hash, which `customers/redact` deletes.
- Every generated code is its own discount in Shopify → Discounts, titled `GameDiscount – <popup> – <code>`. With an expiry set, they expire on their own.

## Scopes
`write_customers` (email capture), `write_discounts` (unique codes per winner and code usage on the analytics page). Merchants who installed with the old `read_discounts` scope are asked to approve the new scope the next time they open the app.

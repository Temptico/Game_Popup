# App Store listing: paste-ready

Where to paste: **Dev Dashboard → Kodra Play → Distribution → App Store listing** (English, primary).
Character counts were checked with a script. Only plain hyphens "-" are used, never en or em dashes.

Goal of this version: rank for what merchants search ("email popup", "popup", "spin wheel", "spin to win")
and convert better. The name and subtitle carry the most search weight, so the main keyword goes into the name.
Search terms cover words that are not already in the name or subtitle.

## Basics
| Field | Final text | Chars | Limit |
|---|---|---|---|
| **App name** | `Kodra Play: Email Popup Game` | 28 | 30 |
| **App card subtitle** | `Gamified discount popup that grows your email list` | 50 | 62 (kept under 60) |
| **App introduction** | `A 15-second game instead of a spin wheel. Visitors win a unique code, you get their email.` | 90 | 100 |

The app name must also be the name in `shopify.app.toml` (`name = "Kodra Play: Email Popup Game"`), which is
what merchants see in their admin.

Other fields (unchanged):
| Field | Value |
|---|---|
| App icon | `docs/app-store/icon-1200.png` (1200 x 1200, no text, corners not pre-rounded) |
| Primary category | Marketing and conversion → Popups |
| Secondary category | Marketing and conversion → Discounts (or Email capture) |
| Languages | English (the admin is in English; the storefront popup ships in 10 languages) |

## App details (490/500)
```
Instead of another spin wheel, Kodra Play shows a short paddle, flipper or pong game. Visitors enter their email, play a quick round and win a unique discount code that is auto-applied at checkout. Codes are single-use, so a code shared online works only once. Every email is saved to your Shopify customers, with marketing consent when they opt in, ready for your email marketing tool. Track views, emails, wins and revenue per popup. Free until the popup brings you $500 in sales a month.
```

## Feature list (max 80 each)
| # | Final text | Chars |
|---|---|---|
| 1 | `Paddle, flipper and pong mini-games in your brand colors, no coding needed` | 74 |
| 2 | `Unique single-use discount codes, auto-applied at checkout` | 58 |
| 3 | `Emails saved as Shopify customers, with marketing consent when given` | 68 |
| 4 | `Exit intent trigger and floating button to reopen the game` | 58 |
| 5 | `Reward tiers and a real expiry countdown to drive orders` | 56 |
| 6 | `Revenue, emails and wins tracked for every popup` | 48 |
| 7 | `Free plan up to $500 popup revenue per month, upgrade as you grow` | 65 |

## Search terms (5, none repeated from the name or subtitle)
`spin wheel` · `spin to win` · `gamification` · `exit intent` · `lead capture`

The app has no spin wheel; it is offered as the alternative to one, and the introduction says so
("instead of a spin wheel"). If a reviewer flags the first two terms as not relevant, swap them for
`discount code` and `email capture`.

## Pricing (must match the app exactly)
| Plan | Price | Description to enter |
|---|---|---|
| Free | Free | Up to $500 popup revenue / 30 days · All games & features · Small Kodra Play icon in the popup |
| Standard | $9.99 / month | Up to $3,000 popup revenue / 30 days · All games & features · No branding |
| Growth | $19.99 / month | Up to $12,000 popup revenue / 30 days · All games & features · No branding |
| Scale | $29.99 / month | Unlimited popup revenue · All games & features · No branding |

Additional pricing note: `Popup revenue = orders that used a Kodra Play code in the last 30 days. If you outgrow your plan, the popup keeps running for 14 days so you have time to upgrade.`

## SEO
| Field | Text | Chars | Limit |
|---|---|---|---|
| Title tag | `Kodra Play: Email Popup Game with Unique Discount Codes` | 55 | 60 |
| Meta description | `Grow your email list with a short game popup. Visitors win a unique, single-use discount code, auto-applied at checkout. Free up to $500 a month.` | 145 | 160 |

## Links
| Field | Value |
|---|---|
| Privacy policy URL | `https://<FLY_APP_NAME>.fly.dev/privacy` |
| Support email | `info@enigma101.com` |
| Demo store URL | `https://<demo-store>.myshopify.com` (storefront password goes in the testing instructions) |

## Screenshots (1600 x 900, real app UI, no browser frames or desktop backgrounds)
Shopify does not allow prices in screenshots, so there is no Plans screenshot. Files: `docs/app-store/screenshots/`

| # | File | Caption / alt text (5-8 words) |
|---|---|---|
| 1 | `01-storefront-game.png` | Visitors play a short game for a discount |
| 2 | `02-winning-code.png` | Unique code with a real expiry countdown |
| 3 | `03-brand-colors.png` | Match your brand colors, no coding needed |
| 4 | `04-triggers-reopen.png` | Exit intent trigger and a floating reopen button |
| 5 | `05-analytics.png` | Track emails, wins and revenue per popup |
| 6 | `06-reward-tiers.png` (optional) | Better rewards for winning on the first try |

Notes:
- 1 and 2 show the real popup on a neutral demo storefront page ("Demo store"), not a real shop.
  Replace them with captures from a real store (1600 x 900, popup open) if you prefer.
- 5 uses demo numbers. Replace it with a capture of a real store's analytics before using real numbers anywhere.
- Reward tiers and the triggers live on two editor tabs, so they are two screenshots (4 and 6).

## Demo video (30-60 s, captions on screen)
Raw recording (about 40 s, 1600 x 900, WebM, captions burned in) is not stored in the repo; upload it to
YouTube or Vimeo and paste the link. Scenes:
1. 0-15 s: a visitor opens the store, the popup appears, they enter their email, play and win
   ("A visitor plays a short game for a discount", "They win a unique code with a real countdown").
2. 15-30 s: setup in the editor - Design tab ("Match your store colors in one click"), Game tab
   ("Exit intent, replay limits and a reopen button"), reward tiers ("Better rewards for winning on the first try").
3. 30-40 s: analytics ("Track emails, wins and revenue per popup").

## Claims checked against the code
| Claim | Result |
|---|---|
| Paddle and flipper games | True, plus a third game (pong), now named in the copy |
| Brand colors | True (color fields + "Use my store colors") |
| Unique single-use codes | True (usage limit 1, once per customer) |
| Auto-apply at checkout | True (setting, on by default) |
| Emails saved as Shopify customers with marketing consent | Partly: consent is recorded only when the visitor ticks the box. The box is on by default but a merchant can turn it off. Rewritten to "with marketing consent when they opt in / when given" |
| Exit intent | True (phones fall back to the delay) |
| Floating reopen button | True |
| Reward tiers | True (unique-code mode) |
| Real expiry countdown | True: the code really expires; the countdown only shows when an expiry is set |
| Per-popup analytics (views, emails, wins, revenue) | True |
| Free plan up to $500 popup revenue per 30 days | True (rolling 30 days) |

Wording changed for the listing rules:
- "Spin wheels are everywhere, so shoppers skip them" (unverifiable) → "Instead of another spin wheel, ..."
- "so they never leak to coupon sites" (guaranteed outcome) → "so a code shared online works only once"
- "ready for Klaviyo or Shopify Email" (names another app) → "ready for your email marketing tool"
- "play for 15 seconds" → "play a quick round" (the play time is a setting, and pong is first to 3 goals)

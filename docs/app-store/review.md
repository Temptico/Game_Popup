# App review: submission materials

## 1. Testing instructions (paste into "Testing instructions")
```
Game Discount shows a gamified popup on the storefront (theme app extension / app embed). No theme code edits are needed.

SETUP (2 minutes)
1. Install the app and open it. The home page shows a banner "Step 1: turn on the popup in your theme". Click "Open theme editor", make sure "GameDiscount popup" is switched on under App embeds, and click Save.
2. In Shopify admin go to Discounts and create a code, e.g. TEST10 (10% off order). (Optional: the app can create unique single-use codes itself, see step 4.)
3. In the app click "+ Create popup". On the General tab enter TEST10 as the discount code and click Save.

TEST ON THE STOREFRONT
4. Open the storefront in a private/incognito window. After the popup delay (default 15 s, or move the mouse out of the top of the window for exit intent) the popup appears.
5. Click Start, enter any name and email, tick the consent box and click Play.
6. Keep the ball in play until the timer reaches 0 (move the mouse / finger or use the arrow keys). You have 3 attempts.
7. The winning screen shows the code; it is also applied to the cart automatically. The new customer appears in Customers with the tag "gamediscount".

OTHER FEATURES
- Game tab: switch Game to "Flipper" (tap left/right half or use arrow keys), change frequency and trigger.
- General tab: "Unique single-use code per winner" creates a one-time discount for each winner; "Reward by attempt" and "Urgency countdown" are available there too.
- Analytics page: views, submissions, games, wins, code uses and revenue per popup.
- Plans page: revenue-based plans. On development stores all charges are test charges.

To see the popup again after playing, open a new private window (the app remembers claimed codes and closed popups in the browser).
```

## 2. Screencast script (2–4 min, English, required)
Record with Loom or OBS (1080p). Use English, or add English subtitles. Upload to YouTube as "Unlisted" or share a Loom link.

| Time | Screen | What to show / say |
|---|---|---|
| 0:00 | Shopify admin → Apps | "This is Game Discount. I'll install it and set up a popup." Install the app. |
| 0:20 | App home | Point to the hero and the "turn on in theme" banner → Open theme editor → App embeds → switch on → Save. |
| 0:50 | Discounts | Create TEST10 (10% off). |
| 1:10 | App → Create popup | Enter TEST10, show Game tab (paddle/flipper, trigger, frequency), Design tab (colors), Save. |
| 1:50 | Storefront, incognito | Wait for the popup → Start → name + email + consent → play → win → code shown and auto-applied in cart. |
| 2:40 | Admin → Customers | The new customer with the "gamediscount" tag and marketing consent. |
| 3:00 | App → Analytics & Plans | Numbers updated; explain revenue-based plans (test charge on dev store). |
| 3:30 | End | "Uninstalling removes all data; GDPR webhooks are implemented." |

## 3. Protected customer data: answers (Dev Dashboard → API access → Protected customer data)
**Data used:** Name, Email (level 2). Orders webhook (level 1).

| Question | Answer |
|---|---|
| Why do you need this data? | App functionality: the popup form creates the visitor as a Shopify customer (name, email) with marketing consent when given. Orders are read to attribute revenue from the app's discount codes for analytics and billing. |
| Do you process the minimum data needed? | Yes. Names and emails are not stored by the app; only a salted SHA-256 email hash (one code per email). From orders only order ID, total, currency and code. |
| Do you tell merchants what data you process? | Yes, in the privacy policy (`/privacy`) linked from the listing. |
| Do you limit use to the stated purpose? | Yes. No selling, advertising or cross-store combination. |
| Do you respect consent decisions? | Yes. Marketing consent is only set when the visitor ticks the consent checkbox; existing consent is never downgraded. |
| Do you honour opt-outs / automated decision-making? | No automated decision-making with legal effects. |
| Retention policy? | Data is deleted on `shop/redact` (48 h after uninstall); email hashes on `customers/redact`; tokens on uninstall. |
| Encryption at rest and in transit? | In transit: HTTPS/TLS everywhere. At rest: Fly.io encrypted volumes (Frankfurt, EU). |
| Separate test and production data? | Yes: local development uses a separate database; production runs on Fly.io. |
| Data loss prevention / access control? | Only the developer has production access (Fly.io account with 2FA); secrets are stored in GitHub Actions/Fly secrets. |
| Security incident response? | Incidents are handled by the developer; affected merchants are notified without undue delay. |

## 4. Pre-submission checklist
- [x] Session-token auth (embedded app, App Bridge, no third-party cookies)
- [x] Theme app extension (app embed), no theme code edits
- [x] Mandatory webhooks: `customers/data_request`, `customers/redact`, `shop/redact` (+ `app/uninstalled`)
- [x] Billing via Shopify Billing API; test charges on development stores automatically
- [x] Storefront performance: Lighthouse 100 → 100 on a test page (0-point drop; limit is 10)
- [x] Privacy policy page `/privacy`
- [x] `app/lib/company.ts`: legal name, address, support email filled in
- [ ] Protected customer data form completed
- [ ] Emergency developer contact set
- [ ] Listing, icon, screenshots, screencast uploaded
- [ ] Demo store has the app installed, embed on, a popup active, and a storefront password in the testing notes

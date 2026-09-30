# App review: submission materials

## 1. Testing instructions (paste into "Testing instructions")
```
Enigma Play shows a gamified popup on the storefront (theme app extension / app embed). No theme code edits are needed.

SETUP (2 minutes)
1. Install the app and open it. The home page shows a banner "Step 1: turn on the popup in your theme". Click "Open theme editor", make sure "Enigma Play popup" is switched on under App embeds, and click Save.
2. In the app click "+ Create popup". On the General tab choose "Unique single-use code per winner" (the app creates the discount itself) and click Save.

TEST ON THE STOREFRONT
3. Open the storefront in a new private/incognito window. After the popup delay (default 15 s; on desktop you can also move the mouse out of the top of the window for exit intent) the popup appears.
4. Click Start, enter any name and email, tick the consent box and click Play.
5. Keep the ball in play until the timer reaches 0 (mouse / finger or arrow keys). You have 3 attempts.
6. The winning screen shows a unique code with a countdown; it is applied at checkout automatically. The new customer appears in Customers with the tag "gamediscount", and the code appears in Discounts.

OTHER FEATURES
- Game tab: switch Game to "Flipper", change trigger and frequency.
- General tab: "Reward by attempt" and "Urgency countdown".
- Analytics page: views, submissions, games, wins, code uses and revenue per popup.
- Plans page: revenue-based plans via Shopify Billing. On development stores all charges are test charges.

To see the popup again after playing, close ALL private windows and open a new one (the app remembers players in the browser).

Demo store (already set up): https://<demo-store>.myshopify.com
Storefront password: <password>
```

## 2. Screencast script (silent recording + English subtitles)
Record the screen without voice (OBS or Loom, 1080p) on the **Demo** store. Add the subtitles afterwards in your editor (CapCut, DaVinci Resolve, Canva, etc.). Each subtitle stays on screen for the whole step. Target length: 3–4 min. Upload to YouTube as **Unlisted**.

Before recording: open the storefront in a **new incognito window** (the popup remembers players in the browser), and sign in to the store password there first.

| # | Screen / what you do | Subtitle (paste as is) |
|---|---|---|
| 1 | Shopify admin → Apps → install Enigma Play → approve | Installing Enigma Play from the Shopify admin. |
| 2 | App home: point at the banner → Open theme editor → App embeds → switch on "Enigma Play popup" → Save | Step 1: turn on the popup in the theme editor (app embed, no code changes). |
| 3 | Back in the app → "+ Create popup" → General tab: Discount code type = Unique single-use code, 10 % | Step 2: create a popup. Each winner gets a unique single-use discount code. |
| 4 | Scroll: tick "Reward by attempt" (15 / 10 / 5 %), Urgency countdown 15 min | Optional: better reward for winning on the first try, and a real expiry countdown. |
| 5 | Game tab: show Paddle / Flipper, Trigger, Frequency; Design tab: change colors → Save | Choose the game, when the popup opens, and match your brand colors. |
| 6 | Incognito window → storefront → wait for the popup → Start | On the storefront the popup invites visitors to play. |
| 7 | Enter name + email, tick consent → Play | The visitor enters name and email (marketing consent is optional). |
| 8 | Play and survive until the timer reaches 0 | The visitor plays a 15-second mini-game. |
| 9 | Win screen: code, "You won 15 % off", countdown → Copy code | The visitor wins a unique code with a live expiry countdown. |
| 10 | Add a product to cart → checkout: the discount is already applied | The code is applied at checkout automatically. |
| 11 | Close checkout → back on the store: floating button shows the code | The floating button reminds the visitor of their code. |
| 12 | Shopify admin → **Customers** → open the new customer (tag "gamediscount", email subscribed) | The visitor is saved as a Shopify customer with the "gamediscount" tag and their consent. |
| 13 | Shopify admin → **Discounts** → the new code "WIN-…" (one use) | The unique code was created by the app in Shopify Discounts. |
| 14 | App → Analytics | Analytics: views, emails, games, wins, code uses and revenue per popup. |
| 15 | App → Plans → click Upgrade on a plan → approve (test charge) | Revenue-based plans through Shopify Billing (test charge on this development store). |
| 16 | Apps → Enigma Play → Uninstall | Uninstalling removes the popup; all app data is deleted (GDPR webhooks). |

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

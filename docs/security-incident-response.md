# Security incident response policy: Enigma Play

Owner: Enigma 101 global j.d.o.o., Gajeva ulica 42, 10000 Zagreb, Croatia · info@enigma101.com
Applies to: the Enigma Play Shopify app, its server (Fly.io, Frankfurt), database and source code.

## What counts as an incident
Unauthorised access to the server, database, source code or accounts (GitHub, Fly.io, Shopify Partners); leaked credentials; loss or corruption of data; any processing of personal data outside the documented purpose.

## Data in scope
The app stores no customer names or email addresses. It stores a salted SHA-256 hash of the email per popup, order IDs, order totals, currency and discount codes of orders that used an app code, anonymous popup statistics, and Shopify session tokens.

## Response steps
1. **Contain (within 1 hour of discovery):** rotate the affected credentials (Shopify API secret, Fly.io token, GitHub tokens), revoke sessions, and scale the app to zero if needed (`flyctl scale count 0`).
2. **Assess (within 24 hours):** determine what happened, which shops and which data are affected, using Fly.io logs and GitHub/Fly audit logs.
3. **Notify:** inform affected merchants by email without undue delay and within 72 hours of becoming aware of a personal data breach, and notify Shopify through the Partner Dashboard. Where required, notify the Croatian data protection authority (AZOP).
4. **Recover:** fix the cause, redeploy through the reviewed GitHub Actions pipeline, restore data from Fly.io volume snapshots if needed.
5. **Review:** write a short post-incident report (cause, impact, fix, prevention) within 14 days and update this policy.

## Prevention
- Only the owner has production access. GitHub, Fly.io and Shopify accounts use strong unique passwords and two-factor authentication.
- Secrets live only in GitHub Actions secrets and Fly.io secrets, never in code or chat.
- All traffic uses HTTPS/TLS; Fly.io volumes and their daily snapshots are encrypted at rest.
- Local development uses a separate database; production data is never copied to development.
- Data is deleted on `shop/redact` and `customers/redact`, and sessions on uninstall.

Last reviewed: 30 September 2026

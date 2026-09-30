import type { MetaFunction } from "@remix-run/node";
import { COMPANY } from "../lib/company";

// Public page (no Shopify auth): linked from the App Store listing.
export const meta: MetaFunction = () => [
  { title: `Privacy policy – ${COMPANY.appName}` },
  { name: "robots", content: "index, follow" },
];

const S = {
  page: { background: "#e8ecf1", minHeight: "100vh", padding: "40px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a1a" },
  card: { maxWidth: 780, margin: "0 auto", background: "#fff", borderRadius: 16, padding: "36px 40px", boxShadow: "0 10px 30px rgba(61,0,122,0.08)", lineHeight: 1.65, fontSize: 15 },
  hero: { background: "linear-gradient(135deg,#3d007a,#2a0055)", color: "#e8ecf1", borderRadius: 12, padding: "22px 26px", marginBottom: 28 },
  h2: { color: "#3d007a", fontSize: 19, marginTop: 30, marginBottom: 8 },
  table: { borderCollapse: "collapse" as const, width: "100%", fontSize: 14, margin: "8px 0" },
  td: { borderTop: "1px solid #e3e3e3", padding: "8px 10px", verticalAlign: "top" as const },
};

export default function Privacy() {
  const c = COMPANY;
  return (
    <main style={S.page}>
      <article style={S.card}>
        <header style={S.hero}>
          <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.75 }}>{c.appName}</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 26 }}>Privacy policy</h1>
          <div style={{ opacity: 0.8, fontSize: 14 }}>Last updated: {c.policyUpdated}</div>
        </header>

        <p>
          {c.appName} (&ldquo;the App&rdquo;) is a Shopify app published by {c.legalName}, {c.address} (&ldquo;we&rdquo;).
          It shows a gamified popup on a merchant&rsquo;s online store: visitors enter their name and email, play a short game and can win a
          discount code. This policy explains what data the App processes, why, and for how long.
        </p>

        <h2 style={S.h2}>1. Roles</h2>
        <p>
          For data about a store&rsquo;s visitors and customers, the merchant who installs the App is the <b>controller</b> and we act as a{" "}
          <b>processor</b> on the merchant&rsquo;s behalf. For data about the merchant&rsquo;s own account (store domain, settings, billing), we are the controller.
        </p>

        <h2 style={S.h2}>2. Data we process</h2>
        <table style={S.table}>
          <tbody>
            <tr><td style={S.td}><b>Merchant &amp; store</b></td><td style={S.td}>Store domain, Shopify access token (to call the Shopify API on the store&rsquo;s behalf), popup settings, subscription plan.</td></tr>
            <tr><td style={S.td}><b>Visitor name &amp; email</b></td><td style={S.td}>Sent directly to the merchant&rsquo;s Shopify store as a customer (with email-marketing consent only if the visitor ticks the consent box). <b>The App does not store names or email addresses on its own servers.</b></td></tr>
            <tr><td style={S.td}><b>Email hash</b></td><td style={S.td}>A salted SHA-256 hash of the email, to make sure each email receives at most one discount code per popup. The hash cannot be turned back into the email.</td></tr>
            <tr><td style={S.td}><b>Popup statistics</b></td><td style={S.td}>Anonymous counts of popup views, form submissions, games played and wins. No IP addresses, device fingerprints or cookies are used for statistics.</td></tr>
            <tr><td style={S.td}><b>Orders using a {c.appName} code</b></td><td style={S.td}>Order ID, order total, currency and the discount code used — to show the merchant the revenue the popup generated and to determine the plan. No customer names, addresses or payment data are stored.</td></tr>
            <tr><td style={S.td}><b>Discount codes</b></td><td style={S.td}>Codes the App creates in the merchant&rsquo;s store for winners, and their usage counts.</td></tr>
          </tbody>
        </table>

        <h2 style={S.h2}>3. In the visitor&rsquo;s browser</h2>
        <p>
          The popup stores a few values in the browser&rsquo;s localStorage/sessionStorage (for example whether the popup was already shown or
          closed, the number of attempts, and a won code with its expiry) so it doesn&rsquo;t reappear unnecessarily. These values never leave the
          browser. If &ldquo;auto-apply code&rdquo; is enabled, Shopify sets its standard discount cookie so the code is applied at checkout.
        </p>

        <h2 style={S.h2}>4. Why we process it</h2>
        <p>
          Only to provide the App&rsquo;s features to the merchant: showing the popup and game, creating the customer and discount code in the
          merchant&rsquo;s store, preventing abuse (one code per email), statistics and billing. We do not sell data, use it for advertising, or
          combine data between stores.
        </p>

        <h2 style={S.h2}>5. Where data is stored &amp; sub-processors</h2>
        <ul>
          <li><b>Shopify</b> — customers, discount codes and orders live in the merchant&rsquo;s Shopify store.</li>
          <li><b>Fly.io</b> — hosts the App and its database (region: Frankfurt, Germany, EU).</li>
        </ul>
        <p>All connections are encrypted (HTTPS/TLS).</p>

        <h2 style={S.h2}>6. Retention &amp; deletion</h2>
        <ul>
          <li>When a merchant uninstalls the App, access tokens are deleted immediately.</li>
          <li>All remaining store data (settings, statistics, email hashes, order records) is deleted when Shopify sends the <code>shop/redact</code> request (48 hours after uninstalling).</li>
          <li>When Shopify sends a <code>customers/redact</code> request, the email hash for that customer is deleted.</li>
          <li>Statistics and order records are kept while the App is installed so the merchant can see historical analytics.</li>
        </ul>

        <h2 style={S.h2}>7. Your rights</h2>
        <p>
          Visitors and customers should contact the store where they used the popup — the merchant controls their customer data in Shopify
          and can export or delete it. We support merchants with such requests, including Shopify&rsquo;s <code>customers/data_request</code> and{" "}
          <code>customers/redact</code> privacy webhooks. Under the GDPR you may also lodge a complaint with your data protection authority.
        </p>

        <h2 style={S.h2}>8. Contact</h2>
        <p>
          {c.legalName}, {c.address}
          <br />
          {c.registration}
          <br />
          Email: <a href={`mailto:${c.supportEmail}`} style={{ color: "#3d007a" }}>{c.supportEmail}</a>
        </p>
        <p style={{ fontSize: 13, color: "#616161" }}>We may update this policy; the date at the top shows the latest version.</p>
      </article>
    </main>
  );
}

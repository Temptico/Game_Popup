// Usage overview of one app instance, printed without store names (Actions logs are public).
// Run inside the app container: node scripts/usage-stats.cjs (the stats workflow sends it over ssh).
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

(async () => {
  const [states, sessions, popups, events, orders, lastViews] = await Promise.all([
    db.shopState.findMany(),
    db.session.groupBy({ by: ["shop"], _count: { _all: true } }),
    db.popup.findMany({ select: { shop: true, active: true } }),
    db.event.groupBy({ by: ["shop", "type"], _count: { _all: true } }),
    db.attributedOrder.groupBy({ by: ["shop"], _count: { _all: true }, _sum: { amountUsd: true } }),
    db.event.groupBy({ by: ["shop"], where: { type: "view" }, _max: { createdAt: true } }),
  ]);
  const shops = new Set([...states.map((s) => s.shop), ...sessions.map((s) => s.shop), ...popups.map((p) => p.shop)]);
  const rows = [...shops].map((shop) => {
    const st = states.find((s) => s.shop === shop) || {};
    const ev = (t) => events.find((e) => e.shop === shop && e.type === t)?._count._all ?? 0;
    const o = orders.find((x) => x.shop === shop);
    const installed = sessions.some((s) => s.shop === shop) && !(st.uninstalledAt && (!st.installedAt || st.uninstalledAt > st.installedAt));
    return {
      shop,
      installed: installed ? "yes" : "no",
      since: day(st.installedAt),
      removed: day(st.uninstalledAt),
      popups: popups.filter((p) => p.shop === shop).length,
      live: popups.filter((p) => p.shop === shop && p.active).length,
      views: ev("view"),
      emails: ev("submit"),
      plays: ev("play"),
      wins: ev("win"),
      orders: o?._count._all ?? 0,
      revenueUsd: Math.round(o?._sum.amountUsd ?? 0),
      lastView: day(lastViews.find((v) => v.shop === shop)?._max.createdAt),
      plan: st.publishedPlan || "-",
    };
  });
  rows.sort((a, b) => (a.since < b.since ? -1 : 1));
  // App embed on in the live theme? (same check as the dashboard; "?" = password page or unreachable)
  for (const r of rows) {
    try {
      const res = await fetch(`https://${r.shop}/`, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (compatible; KodraPlay-EmbedCheck/1.0)" } });
      const html = res.ok && !new URL(res.url).pathname.startsWith("/password") ? await res.text() : null;
      r.embed = html === null ? "?" : /\/assets\/game-popup\.js|GameDiscountContext|id="gd-brand"/.test(html) ? "on" : "off";
    } catch {
      r.embed = "?";
    }
  }
  // With names: the store's name and contact email from Shopify (offline token, still valid while installed).
  if (process.env.NAMES === "1") {
    for (const r of rows) {
      // The staff member who opened the app (online sessions keep their name and email).
      const user = await db.session.findFirst({ where: { shop: r.shop, email: { not: null } }, orderBy: { expires: "desc" } });
      if (user) Object.assign(r, { name: [user.firstName, user.lastName].filter(Boolean).join(" "), email: user.email });
      let sess = await db.session.findFirst({ where: { shop: r.shop, isOnline: false } });
      if (!sess) continue;
      // Expired offline token: refresh it the way the app itself would on its next request,
      // and save the new tokens so the app keeps working with them.
      if (sess.expires && sess.expires < new Date() && sess.refreshToken && (!sess.refreshTokenExpires || sess.refreshTokenExpires > new Date())) {
        try {
          const res = await fetch(`https://${r.shop}/admin/oauth/access_token`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: process.env.SHOPIFY_API_SECRET, grant_type: "refresh_token", refresh_token: sess.refreshToken }),
          });
          const t = await res.json();
          if (!t.access_token) { r.note = `refresh ${res.status}`; continue; }
          sess = await db.session.update({
            where: { id: sess.id },
            data: {
              accessToken: t.access_token,
              expires: t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null,
              refreshToken: t.refresh_token ?? sess.refreshToken,
              refreshTokenExpires: t.refresh_token_expires_in ? new Date(Date.now() + t.refresh_token_expires_in * 1000) : sess.refreshTokenExpires,
            },
          });
        } catch (e) {
          r.note = "refresh failed";
          continue;
        }
      }
      try {
        const res = await fetch(`https://${r.shop}/admin/api/2026-07/graphql.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": sess.accessToken },
          body: JSON.stringify({ query: "{ shop { name email contactEmail plan { displayName partnerDevelopment } } }" }),
        });
        const json = await res.json();
        const shop = json.data?.shop;
        if (!shop) r.note = `shop query ${res.status}`;
        if (shop) Object.assign(r, { name: shop.name, email: shop.contactEmail || shop.email || r.email, shopifyPlan: shop.plan.partnerDevelopment ? "dev store" : shop.plan.displayName });
      } catch {
        /* leave blank */
      }
    }
  }
  // NAMES=1 (only when the workflow encrypts the output): the store's domain instead of a number.
  rows.forEach((r, i) => (r.store = process.env.NAMES === "1" ? r.shop : `Store ${i + 1}`));
  console.log(`Stores ever seen: ${rows.length}, installed now: ${rows.filter((r) => r.installed === "yes").length}`);
  console.table(rows.map(({ store, shop, name, email, shopifyPlan, ...r }) => ({ store, ...r })));
  if (process.env.NAMES === "1") console.table(rows.map(({ store, name, email, shopifyPlan, note }) => ({ store, name, email, shopifyPlan, note })));
    const counts = await db.session.groupBy({ by: ["shop", "isOnline"], _count: { _all: true }, _max: { expires: true } });
    console.table(counts.map((c) => ({ shop: c.shop, online: c.isOnline, n: c._count._all, expires: c._max.expires })));
  await db.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

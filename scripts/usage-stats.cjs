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
  // With names: the store's name and contact email from Shopify (offline token, still valid while installed).
  if (process.env.NAMES === "1") {
    for (const r of rows) {
      // The staff member who opened the app (online sessions keep their name and email).
      const user = await db.session.findFirst({ where: { shop: r.shop, email: { not: null } }, orderBy: { expires: "desc" } });
      if (user) Object.assign(r, { name: [user.firstName, user.lastName].filter(Boolean).join(" "), email: user.email });
      const sess = await db.session.findFirst({ where: { shop: r.shop, isOnline: false } });
      if (!sess || (sess.expires && sess.expires < new Date())) continue;
      try {
        const res = await fetch(`https://${r.shop}/admin/api/2026-07/graphql.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": sess.accessToken },
          body: JSON.stringify({ query: "{ shop { name email contactEmail plan { displayName partnerDevelopment } } }" }),
        });
        const shop = (await res.json()).data?.shop;
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
  if (process.env.NAMES === "1") console.table(rows.map(({ store, name, email, shopifyPlan }) => ({ store, name, email, shopifyPlan })));
    const counts = await db.session.groupBy({ by: ["shop", "isOnline"], _count: { _all: true }, _max: { expires: true } });
    console.table(counts.map((c) => ({ shop: c.shop, online: c.isOnline, n: c._count._all, expires: c._max.expires })));
  await db.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

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
  rows.forEach((r, i) => (r.store = `Store ${i + 1}`));
  console.log(`Stores ever seen: ${rows.length}, installed now: ${rows.filter((r) => r.installed === "yes").length}`);
  console.table(rows.map(({ store, ...r }) => ({ store, ...r })));
  await db.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

// What the storefront really gets: each popup's timing settings and the live theme's embed flags.
// Run inside the app container (the stats workflow with inspect=true). No store names are printed.
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const popups = await db.popup.findMany({ orderBy: { createdAt: "asc" } });
  console.table(popups.map((p, i) => {
    let ab = {};
    try { ab = JSON.parse(p.abVariant || "{}"); } catch { /* none */ }
    return { popup: i + 1, active: p.active, target: p.target, trigger: p.trigger, wait: p.delaySec, scrollPct: p.scrollPct, freq: p.frequency, ab: p.abEnabled ? `${ab.trigger}/${ab.delaySec}s` : "-", excluded: p.excludePages ? p.excludePages.split("\n").length : 0 };
  }));
  const shops = [...new Set(popups.map((p) => p.shop))];
  for (const st of await db.shopState.findMany()) console.log(`codes combined (one-time fix) at: ${st.codesCombinedAt ? st.codesCombinedAt.toISOString() : "not yet"}`);
  const open = await db.claim.count({ where: { discountId: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
  console.log(`unexpired codes handed out: ${open}`);
  for (const [i, shop] of shops.entries()) {
    try {
      const res = await fetch(`https://${shop}/`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; KodraPlay-Inspect/1.0)" } });
      const html = await res.text();
      const always = (html.match(/alwaysShow:\s*(true|false|null)/) || [])[1];
      const js = (html.match(/https?:[^"' ]+\/assets\/game-popup\.js[^"' ]*/) || html.match(/\/\/cdn\.shopify\.com\/extensions\/[^"' ]+\/assets\/game-popup\.js[^"' ]*/) || [])[0];
      let has8s = "?";
      if (js) {
        const code = await (await fetch(js.startsWith("//") ? "https:" + js : js)).text();
        has8s = /8e3/.test(code) ? "yes" : "no";
      }
      console.log(`store ${i + 1}: status ${res.status}, password page ${res.url.includes("/password")}, test mode (alwaysShow) ${always}, script with 8 s scroll minimum: ${has8s}`);
    } catch (e) {
      console.log(`store ${i + 1}: ${e.message}`);
    }
  }
  await db.$disconnect();
})();

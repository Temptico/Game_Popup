import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  BlockStack,
  Card,
  DataTable,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getBreakdown, getCounts, getDiscountUsage, type BreakdownRow } from "../lib/analytics.server";
import { SOURCE_LABELS } from "../lib/traffic-sources";
import { getUniqueCodeUsage } from "../lib/discounts.server";
import { getRevenue } from "../lib/revenue.server";

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const range = new URL(request.url).searchParams.get("range") ?? "30";
  const days = parseInt(range, 10);
  const since = Number.isFinite(days) ? new Date(Date.now() - days * 86400_000) : null;

  const [popups, { total, byPopup }, revenue, byDevice, byCountry, bySource] = await Promise.all([
    db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } }),
    getCounts(shop, since),
    getRevenue(shop, since),
    getBreakdown(shop, since, "device"),
    getBreakdown(shop, since, "country"),
    getBreakdown(shop, since, "source"),
  ]);

  // Code usage comes from Shopify and is lifetime (not range-filtered).
  const codes = [...new Set(popups.map((p) => p.discountCode).filter(Boolean))];
  const usageEntries = await Promise.all(
    codes.map(async (c) => [c, await getDiscountUsage(admin, c)] as const),
  );
  const usage = Object.fromEntries(usageEntries);

  // Generated single-use codes: sum redemptions of the most recent 1,000 per popup.
  const uniqueUsage = Object.fromEntries(
    await Promise.all(
      popups.map(async (p) => {
        const claims = await db.claim.findMany({
          where: { popupId: p.id, discountId: { not: null } },
          select: { discountId: true },
          orderBy: { claimedAt: "desc" },
          take: 1000,
        });
        const ids = claims.map((c) => c.discountId!);
        return [p.id, ids.length ? await getUniqueCodeUsage(admin, ids) : 0] as const;
      }),
    ),
  );

  const rows = popups.map((p) => {
    const shared = p.discountCode ? usage[p.discountCode] : 0;
    return {
      name: p.name,
      code: p.codeMode === "unique" ? `Unique (${p.codePrefix || "no prefix"}-…)` : p.discountCode,
      counts: byPopup[p.id] ?? { view: 0, start: 0, submit: 0, play: 0, win: 0 },
      revenue: revenue.byPopup[p.id] ?? { amount: 0, orders: 0 },
      // null = the shared code doesn't exist in Shopify
      uses: shared === null && p.codeMode === "static" ? null : (shared ?? 0) + uniqueUsage[p.id],
    };
  });
  const totalUses =
    usageEntries.reduce((sum, [, n]) => sum + (n ?? 0), 0) +
    Object.values(uniqueUsage).reduce((a, b) => a + b, 0);

  return {
    range,
    revenue: { amount: revenue.amount, currency: revenue.currency, usd: revenue.usd, orders: revenue.orders },
    total,
    totalUses,
    rows,
    byDevice,
    byCountry: byCountry.slice(0, 12),
    bySource: bySource.filter((r) => r.orders > 0).sort((a, b) => b.amount - a.amount),
  };
};

const DEVICE_LABELS: Record<string, string> = { d: "Desktop", m: "Phone / tablet" };
const UNKNOWN = "Not recorded (older data)";

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();

  const { total, totalUses, rows, range, revenue, byDevice, byCountry, bySource } = data;
  const countryName = (code: string) => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  // Funnel per segment: views → emails (share of views) → wins (share of emails) → orders and revenue.
  const segmentRows = (list: BreakdownRow[], label: (k: string) => string) =>
    list.map((r) => [
      r.key ? label(r.key) : UNKNOWN,
      r.counts.view.toLocaleString(),
      `${r.counts.submit.toLocaleString()} (${pct(r.counts.submit, r.counts.view)})`,
      `${r.counts.win.toLocaleString()} (${pct(r.counts.win, r.counts.submit)})`,
      r.orders.toLocaleString(),
      money(revenue.currency ? r.amount : r.amountUsd),
    ]);
  const money = (n: number) =>
    revenue.currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: revenue.currency, maximumFractionDigits: 0 }).format(n)
      : `$${Math.round(n).toLocaleString("en-US")}`;
  // Funnel: each step shows how many of the previous step made it through.
  const funnel = [
    { label: "Popup views", value: total.view, sub: "saw the popup" },
    { label: "Started", value: total.start, sub: `${pct(total.start, total.view)} clicked Start` },
    { label: "Emails", value: total.submit, sub: `${pct(total.submit, total.view)} of views` },
    { label: "Games played", value: total.play, sub: "incl. retries" },
    { label: "Wins", value: total.win, sub: `${pct(total.win, total.submit)} of emails` },
    { label: "Code uses", value: totalUses, sub: `${pct(totalUses, total.win)} of wins · lifetime` },
  ];

  return (
    <Page>
      <TitleBar title="Analytics" />
      <Layout>
        <Layout.Section>
          <div style={{ maxWidth: 220 }}>
            <Select
              label="Date range"
              labelInline
              options={RANGES}
              value={params.get("range") ?? range}
              onChange={(v) => setParams({ range: v })}
            />
          </div>
        </Layout.Section>
        <Layout.Section>
          <div className="gd-revenue">
            <div>
              <div className="gd-revenue-label">Revenue from popup</div>
              <div className="gd-revenue-value">{money(revenue.currency ? revenue.amount : revenue.usd)}</div>
            </div>
            <div className="gd-revenue-meta">
              <span><b>{revenue.orders.toLocaleString()}</b> orders with a Kodra Play code</span>
              <span><b>{totalUses.toLocaleString()}</b> code uses (lifetime)</span>
            </div>
          </div>
        </Layout.Section>
        <Layout.Section>
          <ol className="gd-funnel" aria-label="Popup funnel">
            {funnel.map((s) => (
              <li key={s.label} className="gd-tile">
                <div className="gd-tile-label">{s.label}</div>
                <div className="gd-tile-value">{s.value.toLocaleString()}</div>
                <div className="gd-tile-sub">{s.sub}</div>
              </li>
            ))}
          </ol>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "numeric", "numeric", "numeric", "numeric"]}
              headings={["Popup", "Code", "Views", "Started", "Emails", "Games", "Wins", "Code uses", "Revenue"]}
              rows={rows.map((r) => [
                r.name,
                r.code,
                r.counts.view,
                r.counts.start,
                r.counts.submit,
                r.counts.play,
                r.counts.win,
                r.uses === null ? "code not found" : r.uses,
                `${money(r.revenue.amount)} (${r.revenue.orders})`,
              ])}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="0">
              <div style={{ padding: "16px 16px 0" }}>
                <Text as="h2" variant="headingMd">Desktop vs phone</Text>
              </div>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "numeric"]}
                headings={["Device", "Views", "Emails", "Wins", "Orders", "Revenue"]}
                rows={segmentRows(byDevice, (k) => DEVICE_LABELS[k] ?? k)}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="0">
              <div style={{ padding: "16px 16px 0" }}>
                <Text as="h2" variant="headingMd">Orders by traffic source</Text>
                <Text as="p" variant="bodySm" tone="subdued">Where shoppers who used a Kodra Play code came from (utm tags, ad click ids, referrer).</Text>
              </div>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                headings={["Source", "Orders", "Revenue", "Share of popup revenue"]}
                rows={bySource.map((r) => [
                  r.key ? SOURCE_LABELS[r.key] ?? r.key : UNKNOWN,
                  r.orders.toLocaleString(),
                  money(revenue.currency ? r.amount : r.amountUsd),
                  pct(revenue.currency ? r.amount : r.amountUsd, revenue.currency ? revenue.amount : revenue.usd),
                ])}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="0">
              <div style={{ padding: "16px 16px 0" }}>
                <Text as="h2" variant="headingMd">By country</Text>
                <Text as="p" variant="bodySm" tone="subdued">The storefront country (Shopify market) the visitor shopped in.</Text>
              </div>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "numeric"]}
                headings={["Country", "Views", "Emails", "Wins", "Orders", "Revenue"]}
                rows={segmentRows(byCountry, countryName)}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Text as="p" variant="bodySm" tone="subdued">
            Device, country and traffic source are recorded from version 0.16 on; earlier data shows as “{UNKNOWN}”.
          </Text>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  BlockStack,
  Card,
  DataTable,
  InlineGrid,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getCounts, getDiscountUsage } from "../lib/analytics.server";
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

  const [popups, { total, byPopup }, revenue] = await Promise.all([
    db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } }),
    getCounts(shop, since),
    getRevenue(shop, since),
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
      counts: byPopup[p.id] ?? { view: 0, submit: 0, play: 0, win: 0 },
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
  };
};

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();

  const { total, totalUses, rows, range, revenue } = data;
  const money = (n: number) =>
    revenue.currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: revenue.currency, maximumFractionDigits: 0 }).format(n)
      : `$${Math.round(n).toLocaleString("en-US")}`;
  const stats = [
    { label: "Revenue from popup", value: money(revenue.currency ? revenue.amount : revenue.usd), sub: `${revenue.orders} orders with a GameDiscount code` },
    { label: "Popup views", value: total.view, sub: "" },
    { label: "Form submissions", value: total.submit, sub: `${pct(total.submit, total.view)} of views` },
    { label: "Games played", value: total.play, sub: "incl. retries" },
    { label: "Wins", value: total.win, sub: `${pct(total.win, total.submit)} of submissions` },
    { label: "Code uses", value: totalUses, sub: "lifetime, from Shopify" },
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
          <InlineGrid columns={{ xs: 2, md: 3, lg: 6 }} gap="400">
            {stats.map((s) => (
              <Card key={s.label}>
                <BlockStack gap="100">
                  <Text as="p" tone="subdued">
                    {s.label}
                  </Text>
                  <Text as="p" variant="headingXl">
                    {s.value.toLocaleString()}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {s.sub || " "}
                  </Text>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "numeric", "numeric", "numeric"]}
              headings={["Popup", "Code", "Views", "Submissions", "Games", "Wins", "Code uses", "Revenue"]}
              rows={rows.map((r) => [
                r.name,
                r.code,
                r.counts.view,
                r.counts.submit,
                r.counts.play,
                r.counts.win,
                r.uses === null ? "code not found" : r.uses,
                `${money(r.revenue.amount)} (${r.revenue.orders})`,
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

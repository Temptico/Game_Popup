import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Banner,
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
import { getInstallation } from "../lib/popups.server";
import { getCounts, getDiscountUsage } from "../lib/analytics.server";
import { PLAN_LIMITS } from "../lib/plans";

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const { plan } = await getInstallation(admin);
  if (!PLAN_LIMITS[plan].analytics) return { locked: true as const };

  const range = new URL(request.url).searchParams.get("range") ?? "30";
  const days = parseInt(range, 10);
  const since = Number.isFinite(days) ? new Date(Date.now() - days * 86400_000) : null;

  const [popups, { total, byPopup }] = await Promise.all([
    db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } }),
    getCounts(shop, since),
  ]);

  // Code usage comes from Shopify and is lifetime (not range-filtered).
  const codes = [...new Set(popups.map((p) => p.discountCode))];
  const usageEntries = await Promise.all(
    codes.map(async (c) => [c, await getDiscountUsage(admin, c)] as const),
  );
  const usage = Object.fromEntries(usageEntries);
  const totalUses = usageEntries.reduce((sum, [, n]) => sum + (n ?? 0), 0);

  return {
    locked: false as const,
    range,
    total,
    totalUses,
    rows: popups.map((p) => ({
      name: p.name,
      code: p.discountCode,
      counts: byPopup[p.id] ?? { view: 0, submit: 0, play: 0, win: 0 },
      uses: usage[p.discountCode],
    })),
  };
};

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();

  if (data.locked) {
    return (
      <Page title="Analytics">
        <TitleBar title="Analytics" />
        <Banner
          title="Analytics is a Pro feature"
          tone="info"
          action={{ content: "Upgrade to Pro — $9/month", url: "/app/plans" }}
        >
          <p>
            Events are already being recorded on the Free plan, so your full history is available
            the moment you upgrade.
          </p>
        </Banner>
      </Page>
    );
  }

  const { total, totalUses, rows, range } = data;
  const stats = [
    { label: "Popup views", value: total.view, sub: "" },
    { label: "Form submissions", value: total.submit, sub: `${pct(total.submit, total.view)} of views` },
    { label: "Games played", value: total.play, sub: "incl. retries" },
    { label: "Wins", value: total.win, sub: `${pct(total.win, total.submit)} of submissions` },
    { label: "Code uses", value: totalUses, sub: "lifetime, from Shopify" },
  ];

  return (
    <Page title="Analytics">
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
          <InlineGrid columns={{ xs: 2, md: 5 }} gap="400">
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
              columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "numeric", "numeric"]}
              headings={["Popup", "Code", "Views", "Submissions", "Games", "Wins", "Code uses"]}
              rows={rows.map((r) => [
                r.name,
                r.code,
                r.counts.view,
                r.counts.submit,
                r.counts.play,
                r.counts.win,
                r.uses === null ? "code not found" : r.uses,
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

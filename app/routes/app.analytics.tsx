import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  BlockStack,
  Card,
  DataTable,
  Layout,
  Page,
  InlineStack,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getBreakdown, getCounts, type BreakdownRow } from "../lib/analytics.server";
import { SOURCE_LABELS } from "../lib/traffic-sources";
import { getRevenue, period } from "../lib/revenue.server";

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
  { label: "Custom dates", value: "custom" },
];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const params = new URL(request.url).searchParams;
  const range = params.get("range") ?? "30";
  const days = parseInt(range, 10);
  // Custom dates: from the start of "from" to the end of "to" (UTC days).
  const from = DAY.test(params.get("from") ?? "") ? params.get("from")! : iso(new Date(Date.now() - 30 * 86400_000));
  const to = DAY.test(params.get("to") ?? "") ? params.get("to")! : iso(new Date());
  const custom = range === "custom";
  const since = custom ? new Date(`${from}T00:00:00Z`) : Number.isFinite(days) ? new Date(Date.now() - days * 86400_000) : null;
  const until = custom ? new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400_000) : null;

  // When the later-added data started: "Started" clicks, and device/country/traffic source.
  const firstOf = (where: Record<string, unknown>) =>
    db.event.findFirst({ where: { shop, ...where }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }).then((e) => e?.createdAt ?? null);
  const [popups, { total, byPopup }, revenue, byDevice, byCountry, bySource, startSince, visitorSince] = await Promise.all([
    db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } }),
    getCounts(shop, since, until),
    getRevenue(shop, since, until),
    getBreakdown(shop, since, "device", until),
    getBreakdown(shop, since, "country", until),
    getBreakdown(shop, since, "source", until),
    firstOf({ type: "start" }),
    firstOf({ device: { not: "" } }),
  ]);
  // "Started" only compares with views from when it was recorded.
  const startLate = !!startSince && (!since || startSince > since);
  const viewsForStart = startLate
    ? await db.event.count({ where: { shop, type: "view", ...period(startSince, until) } })
    : total.view;

  const rows = popups.map((p) => ({
    name: p.name,
    code: p.codeMode === "unique" ? `Unique (${p.codePrefix || "no prefix"}-…)` : p.discountCode,
    counts: byPopup[p.id] ?? { view: 0, start: 0, submit: 0, play: 0, win: 0 },
    revenue: revenue.byPopup[p.id] ?? { amount: 0, orders: 0 },
  }));

  // Rows without device/country/source are visits from before it was recorded: left out.
  const known = (list: BreakdownRow[]) => list.filter((r) => r.key !== "");
  return {
    range,
    from,
    to,
    revenue: { amount: revenue.amount, currency: revenue.currency, usd: revenue.usd, orders: revenue.orders },
    total,
    rows,
    start: { since: startLate ? startSince!.toISOString() : null, views: viewsForStart, tracked: !!startSince },
    visitorSince: visitorSince && (!since || visitorSince > since) ? visitorSince.toISOString() : null,
    byDevice: known(byDevice),
    byCountry: known(byCountry).slice(0, 12),
    bySource: known(bySource).filter((r) => r.orders > 0).sort((a, b) => b.amount - a.amount),
  };
};

const DEVICE_LABELS: Record<string, string> = { d: "Desktop", m: "Phone / tablet" };
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");

export default function Analytics() {
  const data = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();

  const { total, rows, range, revenue, byDevice, byCountry, bySource, start, visitorSince, from, to } = data;
  const sinceNote = visitorSince ? ` Recorded since ${day(visitorSince)}.` : "";
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
      label(r.key),
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
    {
      label: "Started",
      value: total.start,
      sub: !start.tracked
        ? "not recorded yet"
        : start.since
          ? `${pct(total.start, start.views)} of views since ${day(start.since)}`
          : `${pct(total.start, total.view)} clicked Start`,
    },
    { label: "Emails", value: total.submit, sub: `${pct(total.submit, total.view)} of views` },
    { label: "Games played", value: total.play, sub: "incl. retries" },
    { label: "Wins", value: total.win, sub: `${pct(total.win, total.submit)} of emails` },
    { label: "Orders", value: revenue.orders, sub: `${pct(revenue.orders, total.win)} of wins` },
  ];

  return (
    <Page>
      <TitleBar title="Analytics" />
      <Layout>
        <Layout.Section>
          <InlineStack gap="300" blockAlign="end">
            <div style={{ minWidth: 220 }}>
              <Select
                label="Date range"
                labelInline
                options={RANGES}
                value={params.get("range") ?? range}
                onChange={(v) => setParams(v === "custom" ? { range: v, from, to } : { range: v })}
              />
            </div>
            {range === "custom" && (
              <>
                <TextField label="From" type="date" autoComplete="off" value={from} max={to}
                  onChange={(v) => v && setParams({ range: "custom", from: v, to })} />
                <TextField label="To" type="date" autoComplete="off" value={to} min={from}
                  onChange={(v) => v && setParams({ range: "custom", from, to: v })} />
              </>
            )}
          </InlineStack>
        </Layout.Section>
        <Layout.Section>
          <div className="gd-revenue">
            <div>
              <div className="gd-revenue-label">Revenue from popup</div>
              <div className="gd-revenue-value">{money(revenue.currency ? revenue.amount : revenue.usd)}</div>
            </div>
            <div className="gd-revenue-meta">
              <span><b>{revenue.orders.toLocaleString()}</b> orders with a Kodra Play code</span>
              {revenue.orders > 0 && (
                <span><b>{money((revenue.currency ? revenue.amount : revenue.usd) / revenue.orders)}</b> average order</span>
              )}
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
              headings={["Popup", "Code", "Views", "Started", "Emails", "Games", "Wins", "Orders", "Revenue"]}
              rows={rows.map((r) => [
                r.name,
                r.code,
                r.counts.view,
                r.counts.start,
                r.counts.submit,
                r.counts.play,
                r.counts.win,
                r.revenue.orders,
                money(r.revenue.amount),
              ])}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="0">
              <div style={{ padding: "16px 16px 0" }}>
                <Text as="h2" variant="headingMd">Desktop vs phone</Text>
                {sinceNote && <Text as="p" variant="bodySm" tone="subdued">{sinceNote.trim()}</Text>}
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
                <Text as="p" variant="bodySm" tone="subdued">Where shoppers who used a Kodra Play code came from (utm tags, ad click ids, referrer).{sinceNote}</Text>
              </div>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                headings={["Source", "Orders", "Revenue", "Share of popup revenue"]}
                rows={bySource.map((r) => [
                  SOURCE_LABELS[r.key] ?? r.key,
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
                <Text as="p" variant="bodySm" tone="subdued">The storefront country (Shopify market) the visitor shopped in.{sinceNote}</Text>
              </div>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "numeric"]}
                headings={["Country", "Views", "Emails", "Wins", "Orders", "Revenue"]}
                rows={segmentRows(byCountry, countryName)}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

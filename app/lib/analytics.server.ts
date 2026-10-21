import type { Visitor } from "./visitor.server";
import db from "../db.server";

interface AdminApi {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

export const EVENT_TYPES = ["view", "submit", "play", "win"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type Counts = Record<EventType, number>;

const emptyCounts = (): Counts => ({ view: 0, submit: 0, play: 0, win: 0 });

/** A/B variant reported by the storefront; only kept while the popup runs a test. */
export const readVariant = (v: unknown, abEnabled: boolean) =>
  abEnabled && (v === "a" || v === "b") ? v : "";

export async function recordEvent(shop: string, popupId: string, type: EventType, variant: unknown = "", visitor: Visitor = { device: "", country: "" }) {
  // Only count events for popups that belong to this shop.
  const popup = await db.popup.findFirst({ where: { id: popupId, shop }, select: { id: true, abEnabled: true } });
  if (!popup) return null;
  const v = readVariant(variant, popup.abEnabled);
  await db.event.create({ data: { shop, popupId, type, variant: v, ...visitor } });
  return { variant: v };
}

export async function getCounts(shop: string, since: Date | null) {
  const rows = await db.event.groupBy({
    by: ["popupId", "type"],
    where: { shop, ...(since ? { createdAt: { gte: since } } : {}) },
    _count: { _all: true },
  });
  const total = emptyCounts();
  const byPopup: Record<string, Counts> = {};
  for (const r of rows) {
    const type = r.type as EventType;
    if (!EVENT_TYPES.includes(type)) continue;
    byPopup[r.popupId] ??= emptyCounts();
    byPopup[r.popupId][type] += r._count._all;
    total[type] += r._count._all;
  }
  return { total, byPopup };
}

/**
 * Lifetime usage of a discount code, straight from Shopify. Returns null when
 * the code doesn't exist in the store (useful to warn the merchant).
 */
export async function getDiscountUsage(admin: AdminApi, code: string): Promise<number | null> {
  const res = await admin.graphql(
    `#graphql
    query GameDiscountCodeUsage($code: String!) {
      codeDiscountNodeByCode(code: $code) {
        codeDiscount {
          ... on DiscountCodeBasic { asyncUsageCount }
          ... on DiscountCodeBxgy { asyncUsageCount }
          ... on DiscountCodeFreeShipping { asyncUsageCount }
          ... on DiscountCodeApp { asyncUsageCount }
        }
      }
    }`,
    { variables: { code } },
  );
  const json = await res.json();
  const node = json.data?.codeDiscountNodeByCode;
  if (!node) return null;
  return node.codeDiscount?.asyncUsageCount ?? 0;
}

export interface AbArm {
  views: number;
  submits: number;
  wins: number;
  orders: number;
  revenue: number;
}

export interface AbResults {
  startedAt: string;
  currency: string;
  a: AbArm;
  b: AbArm;
  // Two-sided confidence that the email-capture rates really differ (0–1)
  confidence: number;
  leader: "a" | "b" | null;
  // Too few views/sign-ups for a verdict
  enoughData: boolean;
}

// Standard normal CDF (Abramowitz–Stegun 7.1.26, error < 1.5e-7).
function normCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t *
    Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Two-proportion z-test on sign-ups per view; the main metric of a popup A/B test. */
export function compareArms(a: AbArm, b: AbArm) {
  const n1 = a.views, n2 = b.views;
  if (!n1 || !n2) return { confidence: 0, leader: null as "a" | "b" | null };
  const p1 = a.submits / n1, p2 = b.submits / n2;
  const p = (a.submits + b.submits) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (!se) return { confidence: 0, leader: null };
  const z = (p2 - p1) / se;
  return { confidence: 2 * normCdf(Math.abs(z)) - 1, leader: p2 === p1 ? null : p2 > p1 ? ("b" as const) : ("a" as const) };
}

export async function getAbResults(popupId: string, startedAt: Date): Promise<AbResults> {
  const [events, orders] = await Promise.all([
    db.event.groupBy({
      by: ["variant", "type"],
      where: { popupId, variant: { in: ["a", "b"] }, createdAt: { gte: startedAt } },
      _count: { _all: true },
    }),
    db.attributedOrder.groupBy({
      by: ["variant", "currency"],
      where: { popupId, variant: { in: ["a", "b"] }, createdAt: { gte: startedAt } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);
  const arm = (): AbArm => ({ views: 0, submits: 0, wins: 0, orders: 0, revenue: 0 });
  const arms = { a: arm(), b: arm() };
  const key = { view: "views", submit: "submits", win: "wins" } as const;
  for (const e of events) {
    const k = key[e.type as keyof typeof key];
    if (k) arms[e.variant as "a" | "b"][k] += e._count._all;
  }
  let currency = orders[0]?.currency ?? "";
  for (const o of orders) {
    arms[o.variant as "a" | "b"].orders += o._count._all;
    arms[o.variant as "a" | "b"].revenue += o._sum.amount ?? 0;
    if (o.currency !== currency) currency = "";
  }
  const { confidence, leader } = compareArms(arms.a, arms.b);
  const enoughData =
    Math.min(arms.a.views, arms.b.views) >= 100 && arms.a.submits + arms.b.submits >= 20;
  return { startedAt: startedAt.toISOString(), currency, ...arms, confidence, leader, enoughData };
}

export interface BreakdownRow {
  key: string;
  counts: Counts;
  orders: number;
  amount: number;
  amountUsd: number;
}

/** Funnel and popup revenue split by device, country or (orders only) traffic source. */
export async function getBreakdown(shop: string, since: Date | null, by: "device" | "country" | "source") {
  const where = { shop, ...(since ? { createdAt: { gte: since } } : {}) };
  const [events, orders] = await Promise.all([
    by === "source"
      ? Promise.resolve([] as { key: string; type: string; n: number }[])
      : db.event
          .groupBy({ by: [by, "type"], where, _count: { _all: true } })
          .then((rows) => rows.map((r) => ({ key: r[by], type: r.type, n: r._count._all }))),
    db.attributedOrder
      .groupBy({ by: [by], where, _count: { _all: true }, _sum: { amount: true, amountUsd: true } })
      .then((rows) => rows.map((r) => ({ key: r[by], n: r._count._all, amount: r._sum.amount ?? 0, usd: r._sum.amountUsd ?? 0 }))),
  ]);
  const map = new Map<string, BreakdownRow>();
  const row = (key: string) => {
    if (!map.has(key)) map.set(key, { key, counts: emptyCounts(), orders: 0, amount: 0, amountUsd: 0 });
    return map.get(key)!;
  };
  for (const e of events) if (EVENT_TYPES.includes(e.type as EventType)) row(e.key).counts[e.type as EventType] += e.n;
  for (const o of orders) Object.assign(row(o.key), { orders: o.n, amount: o.amount, amountUsd: o.usd });
  // Most views (or orders) first; rows recorded before tracking ("") last.
  return [...map.values()].sort((a, b) => Number(a.key === "") - Number(b.key === "") || b.counts.view - a.counts.view || b.orders - a.orders);
}

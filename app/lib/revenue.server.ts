import db from "../db.server";
import { parseAbJson } from "./popup-defaults";
import { GRACE_DAYS, getPlan, requiredPlan, type PlanName } from "./plans";

// Approximate USD rates for plan thresholds only (not for accounting).
// Thresholds are coarse ($500 / $3k / $12k), so a few % drift is irrelevant.
const USD_PER_UNIT: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.12, CAD: 0.73, AUD: 0.66, NZD: 0.6,
  SEK: 0.095, NOK: 0.093, DKK: 0.145, PLN: 0.25, CZK: 0.043, HUF: 0.0027,
  RON: 0.22, BGN: 0.55, JPY: 0.0067, CNY: 0.14, INR: 0.012, BRL: 0.18,
  MXN: 0.055, ZAR: 0.054, TRY: 0.03, AED: 0.27, SGD: 0.74, HKD: 0.128,
};

export const toUsd = (amount: number, currency: string) => amount * (USD_PER_UNIT[currency] ?? 1);

const WINDOW_DAYS = 30;
const windowStart = () => new Date(Date.now() - WINDOW_DAYS * 86400_000);

interface OrderPayload {
  id?: number | string;
  admin_graphql_api_id?: string;
  total_price?: string;
  currency?: string;
  discount_codes?: { code?: string }[];
}

/**
 * Records an order if it used one of this shop's Enigma Play codes:
 * a popup's shared code or a unique code handed out by /proxy/claim.
 * Idempotent per order (webhooks can be delivered more than once).
 */
export async function recordOrder(shop: string, order: OrderPayload) {
  const codes = (order.discount_codes ?? [])
    .map((d) => (d.code ?? "").trim())
    .filter(Boolean);
  if (!codes.length) return false;
  const upper = codes.map((c) => c.toUpperCase());

  const [claim, popups] = await Promise.all([
    db.claim.findFirst({ where: { shop, code: { in: codes } }, select: { popupId: true, code: true, variant: true } }),
    db.popup.findMany({ where: { shop }, select: { id: true, discountCode: true, abEnabled: true, abVariant: true } }),
  ]);
  const has = (code: string | null | undefined) => !!code && upper.includes(code.toUpperCase());
  let match: { popupId: string; code: string; variant: string } | null = claim?.code
    ? { popupId: claim.popupId, code: claim.code, variant: claim.variant }
    : null;
  // Shared codes: during an A/B test variant B may have its own code.
  for (const p of match ? [] : popups) {
    const bCode = p.abEnabled ? parseAbJson(p.abVariant).discountCode : "";
    if (has(bCode) && bCode.toUpperCase() !== p.discountCode.toUpperCase()) {
      match = { popupId: p.id, code: bCode, variant: "b" };
    } else if (has(p.discountCode)) {
      match = { popupId: p.id, code: p.discountCode, variant: p.abEnabled && bCode && bCode !== p.discountCode ? "a" : "" };
    }
    if (match) break;
  }
  if (!match) return false;

  const amount = parseFloat(order.total_price ?? "0") || 0;
  const currency = order.currency ?? "USD";
  const orderId = String(order.admin_graphql_api_id ?? order.id);
  await db.attributedOrder.upsert({
    where: { shop_orderId: { shop, orderId } },
    create: {
      shop, orderId, popupId: match.popupId, code: match.code, variant: match.variant,
      amount, currency, amountUsd: toUsd(amount, currency),
    },
    update: {},
  });
  return true;
}

/** Popup-generated revenue for a period, total and per popup (shop currency). */
export async function getRevenue(shop: string, since: Date | null = windowStart()) {
  const rows = await db.attributedOrder.groupBy({
    by: ["popupId", "currency"],
    where: { shop, ...(since ? { createdAt: { gte: since } } : {}) },
    _sum: { amount: true, amountUsd: true },
    _count: { _all: true },
  });
  let usd = 0, amount = 0, orders = 0;
  let currency = rows[0]?.currency ?? "";
  const byPopup: Record<string, { amount: number; orders: number }> = {};
  for (const r of rows) {
    usd += r._sum.amountUsd ?? 0;
    amount += r._sum.amount ?? 0;
    orders += r._count._all;
    if (r.currency !== currency) currency = "";  // mixed currencies: show USD only
    const key = r.popupId ?? "";
    byPopup[key] ??= { amount: 0, orders: 0 };
    byPopup[key].amount += r._sum.amount ?? 0;
    byPopup[key].orders += r._count._all;
  }
  return { usd, amount, currency, orders, byPopup };
}

export interface BillingStatus {
  plan: PlanName;
  revenueUsd: number;
  cap: number;
  required: PlanName;
  overLimit: boolean;
  graceEndsAt: string | null;
  /** Grace period over: the storefront popup is paused until the store upgrades. */
  paused: boolean;
}

/**
 * Compares the last 30 days of popup revenue with the plan's cap and keeps
 * track of when the store first went over it (for the grace period).
 */
export async function getBillingStatus(shop: string, plan: PlanName): Promise<BillingStatus> {
  const { usd } = await getRevenue(shop);
  const cap = getPlan(plan).revenueCap;
  const overLimit = usd > cap;

  const state = await db.shopState.findUnique({ where: { shop } });
  let since = state?.overLimitSince ?? null;
  if (overLimit && !since) {
    since = new Date();
    await db.shopState.upsert({ where: { shop }, create: { shop, overLimitSince: since }, update: { overLimitSince: since } });
  } else if (!overLimit && since) {
    since = null;
    await db.shopState.update({ where: { shop }, data: { overLimitSince: null } });
  }

  const graceEnds = since ? new Date(since.getTime() + GRACE_DAYS * 86400_000) : null;
  return {
    plan,
    revenueUsd: usd,
    cap,
    required: requiredPlan(usd).key,
    overLimit,
    graceEndsAt: graceEnds?.toISOString() ?? null,
    paused: !!graceEnds && graceEnds.getTime() < Date.now(),
  };
}

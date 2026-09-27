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

export async function recordEvent(shop: string, popupId: string, type: EventType) {
  // Only count events for popups that belong to this shop.
  const popup = await db.popup.findFirst({ where: { id: popupId, shop }, select: { id: true } });
  if (!popup) return false;
  await db.event.create({ data: { shop, popupId, type } });
  return true;
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

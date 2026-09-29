import { createHash, randomBytes, randomInt } from "node:crypto";
import type { Popup } from "@prisma/client";

interface AdminApi {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

// No 0/O/1/I/L – codes get read off screens and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(prefix: string, length = 8) {
  let body = "";
  for (let i = 0; i < length; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return prefix ? `${prefix}-${body}` : body;
}

export const newToken = () => randomBytes(24).toString("base64url");

export const hashEmail = (shop: string, email: string) =>
  createHash("sha256").update(`${shop}:${email.trim().toLowerCase()}`).digest("hex");

/**
 * Creates a single-use amount-off discount for one winner:
 * usable once, by one customer, optionally expiring after N days.
 */
export async function createUniqueDiscount(
  admin: AdminApi,
  popup: Pick<Popup, "name" | "discountType" | "codePrefix">,
  { amount, endsAt }: { amount: number; endsAt: Date | null },
): Promise<{ code: string; discountId: string }> {
  const now = new Date();
  const value =
    popup.discountType === "fixed"
      ? { discountAmount: { amount, appliesOnEachItem: false } }
      : { percentage: Math.min(100, amount) / 100 };

  // Retry on the (astronomically unlikely) event of a code collision.
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode(popup.codePrefix);
    const res = await admin.graphql(
      `#graphql
      mutation GameDiscountUniqueCode($input: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $input) {
          codeDiscountNode { id }
          userErrors { field code message }
        }
      }`,
      {
        variables: {
          input: {
            title: `GameDiscount – ${popup.name} – ${code}`,
            code,
            startsAt: now.toISOString(),
            endsAt: endsAt ? endsAt.toISOString() : null,
            context: { all: "ALL" },
            customerGets: { value, items: { all: true } },
            usageLimit: 1,
            appliesOncePerCustomer: true,
            combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: true },
          },
        },
      },
    );
    const json = await res.json();
    const payload = json.data?.discountCodeBasicCreate;
    const id = payload?.codeDiscountNode?.id;
    if (id) return { code, discountId: id };

    const errors: { field: string[] | null; code: string; message: string }[] =
      payload?.userErrors ?? json.errors ?? [];
    lastError = JSON.stringify(errors);
    const collision = errors.some((e) => e.code === "TAKEN" || /taken|unique/i.test(e.message));
    if (!collision) break;
  }
  throw new Error(`discountCodeBasicCreate failed: ${lastError}`);
}

/** Sums lifetime redemptions across generated discounts (batched, 250 ids per query). */
export async function getUniqueCodeUsage(admin: AdminApi, discountIds: string[]) {
  let total = 0;
  for (let i = 0; i < discountIds.length; i += 250) {
    const res = await admin.graphql(
      `#graphql
      query GameDiscountUniqueUsage($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on DiscountCodeNode {
            codeDiscount { ... on DiscountCodeBasic { asyncUsageCount } }
          }
        }
      }`,
      { variables: { ids: discountIds.slice(i, i + 250) } },
    );
    const json = await res.json();
    for (const n of json.data?.nodes ?? []) {
      total += n?.codeDiscount?.asyncUsageCount ?? 0;
    }
  }
  return total;
}

export async function getShopCurrency(admin: AdminApi): Promise<string> {
  const res = await admin.graphql(`#graphql
    query GameDiscountCurrency { shop { currencyCode } }`);
  const json = await res.json();
  return json.data?.shop?.currencyCode ?? "";
}

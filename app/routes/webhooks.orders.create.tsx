import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordOrder } from "../lib/revenue.server";
import { publishConfig } from "../lib/popups.server";

// Attributes orders that used a GameDiscount code; this revenue drives the
// plans. Republishing re-evaluates the plan cap / grace period.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, admin } = await authenticate.webhook(request);
  try {
    const attributed = await recordOrder(shop, payload as Parameters<typeof recordOrder>[1]);
    if (attributed && admin) await publishConfig(admin, shop);
  } catch (err) {
    console.error(`[orders/create] ${shop}`, err);
  }
  return new Response();
};

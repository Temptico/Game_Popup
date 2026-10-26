import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordOrder } from "../lib/revenue.server";
import { syncPublish } from "../lib/popups.server";
import { markCodeUsed } from "../lib/code-reminder.server";

// Attributes orders that used a Kodra Play code; this revenue drives the
// plans. The storefront is republished only if the plan cap pauses or unpauses it.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, admin } = await authenticate.webhook(request);
  try {
    const attributed = await recordOrder(shop, payload as Parameters<typeof recordOrder>[1]);
    if (attributed && admin) {
      if (attributed.customerId) await markCodeUsed(admin, shop, attributed.customerId);
      await syncPublish(admin, shop);
    }
  } catch (err) {
    console.error(`[orders/create] ${shop}`, err);
  }
  return new Response();
};

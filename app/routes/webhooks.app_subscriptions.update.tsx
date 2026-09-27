import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { publishConfig } from "../lib/popups.server";

// Plan changed (upgrade approved, cancelled, frozen…) → republish so the
// storefront immediately reflects branding / popup limits / colors.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (admin) {
    try {
      await publishConfig(admin, shop);
    } catch (err) {
      console.error(`[${topic}] publish failed for ${shop}`, err);
    }
  }
  return new Response();
};

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Mandatory GDPR webhooks. The app stores no customer PII (customers live in
// Shopify; our Event table is anonymous), so data requests and customer
// redaction need no action. Shop redaction wipes everything for the shop.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "SHOP_REDACT") {
    await db.$transaction([
      db.event.deleteMany({ where: { shop } }),
      db.popup.deleteMany({ where: { shop } }),
      db.session.deleteMany({ where: { shop } }),
    ]);
  }
  return new Response();
};

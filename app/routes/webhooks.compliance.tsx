import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { hashEmail } from "../lib/discounts.server";

// Mandatory GDPR webhooks. Customers live in Shopify; this app only keeps a
// salted email hash per claim (to enforce one code per email) and anonymous
// events. Customer redaction removes that customer's claims; shop redaction
// wipes everything for the shop.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "CUSTOMERS_REDACT") {
    const email = (payload as { customer?: { email?: string } }).customer?.email;
    if (email) {
      await db.claim.deleteMany({ where: { shop, emailHash: hashEmail(shop, email) } });
    }
  }

  if (topic === "SHOP_REDACT") {
    await db.$transaction([
      db.claim.deleteMany({ where: { shop } }),
      db.event.deleteMany({ where: { shop } }),
      db.popup.deleteMany({ where: { shop } }),
      db.session.deleteMany({ where: { shop } }),
    ]);
  }
  return new Response();
};

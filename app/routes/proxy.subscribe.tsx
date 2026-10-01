import { json, type ActionFunctionArgs } from "@remix-run/node";
import { readProxyRequest } from "../lib/proxy.server";
import { upsertCustomer } from "../lib/customers.server";
import { recordEvent } from "../lib/analytics.server";
import { hashEmail, newToken } from "../lib/discounts.server";
import db from "../db.server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, admin, body } = await readProxyRequest(request);

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const firstName = String(body.name ?? "").trim().slice(0, 100);
  const popupId = String(body.popupId ?? "");
  const consent = body.consent === true;
  // Storefront language, saved on new customers so Shopify emails them in it.
  const locale = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(String(body.locale ?? "")) ? String(body.locale) : undefined;

  if (!EMAIL.test(email) || !firstName) {
    return json({ ok: false, error: "invalid_input" }, { status: 422 });
  }

  const known = await recordEvent(shop, popupId, "submit", body.v);
  if (!known) {
    return json({ ok: false, error: "unknown_popup" }, { status: 404 });
  }

  // One claim per (popup, email). Re-submitting the same email returns the
  // same token, so the visitor gets back their existing code instead of a new one.
  const emailHash = hashEmail(shop, email);
  const claim = await db.claim.upsert({
    where: { popupId_emailHash: { popupId, emailHash } },
    // The variant is fixed at the first sign-up (it decides B's discount in /claim).
    create: { token: newToken(), shop, popupId, emailHash, variant: known.variant },
    // Restart the play clock for claims that haven't won yet (see /claim).
    update: { issuedAt: new Date() },
  });

  let customerOk = false;
  try {
    const result = await upsertCustomer(admin, { email, firstName, consent, locale });
    customerOk = result.ok;
    if (!result.ok) console.error(`[subscribe] ${shop}: ${result.error}`);
  } catch (err) {
    console.error(`[subscribe] ${shop}`, err);
  }
  // The visitor can play either way; a failed customer write shouldn't block the game.
  return json({ ok: customerOk, token: claim.token });
};

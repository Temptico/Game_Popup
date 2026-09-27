import type { ActionFunctionArgs } from "@remix-run/node";
import { readProxyRequest } from "../lib/proxy.server";
import { upsertCustomer } from "../lib/customers.server";
import { recordEvent } from "../lib/analytics.server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, admin, body } = await readProxyRequest(request);

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const firstName = String(body.name ?? "").trim().slice(0, 100);
  const popupId = String(body.popupId ?? "");
  const consent = body.consent === true;

  if (!EMAIL.test(email) || !firstName) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 422 });
  }

  const known = await recordEvent(shop, popupId, "submit");
  if (!known) {
    return Response.json({ ok: false, error: "unknown_popup" }, { status: 404 });
  }

  try {
    const result = await upsertCustomer(admin, { email, firstName, consent });
    if (!result.ok) console.error(`[subscribe] ${shop}: ${result.error}`);
    // The visitor can play either way; a failed customer write shouldn't block the game.
    return Response.json({ ok: result.ok });
  } catch (err) {
    console.error(`[subscribe] ${shop}`, err);
    return Response.json({ ok: false, error: "customer_api" }, { status: 502 });
  }
};

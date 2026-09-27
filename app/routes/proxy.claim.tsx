import type { ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { readProxyRequest } from "../lib/proxy.server";

// The discount code never ships in the page source — it's released here after a win.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, body } = await readProxyRequest(request);
  const popupId = String(body.popupId ?? "");

  const popup = await db.popup.findFirst({
    where: { id: popupId, shop, active: true },
    select: { id: true, discountCode: true },
  });
  if (!popup) {
    return Response.json({ ok: false, error: "unknown_popup" }, { status: 404 });
  }

  // Theme-editor test mode reveals the code without polluting analytics.
  if (body.test !== true) {
    await db.event.create({ data: { shop, popupId: popup.id, type: "win" } });
  }
  return Response.json({ ok: true, code: popup.discountCode });
};

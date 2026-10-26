import { json, type ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { readProxyRequest } from "../lib/proxy.server";
import { storefrontPopups } from "../lib/popups.server";

// "Preview on store": the storefront settings of one popup, drafts included,
// so the merchant sees it on their store before publishing. Holds no codes:
// the preview runs in test mode and only ever gets placeholder codes.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, admin, body } = await readProxyRequest(request, { name: "preview", perHour: 120 });
  const row = await db.popup.findFirst({ where: { id: String(body.id ?? ""), shop } });
  if (!row) return json({ ok: false, error: "unknown_popup" }, { status: 404 });
  const [popup] = await storefrontPopups(admin, [row]);
  return json({ ok: true, popup });
};

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { readProxyRequest } from "../lib/proxy.server";
import { recordEvent } from "../lib/analytics.server";

// "submit" and "win" are recorded server-side by /subscribe and /claim.
const CLIENT_EVENTS = ["view", "play"] as const;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, body } = await readProxyRequest(request);
  const type = String(body.type ?? "") as (typeof CLIENT_EVENTS)[number];
  if (!CLIENT_EVENTS.includes(type)) {
    return json({ ok: false, error: "invalid_type" }, { status: 422 });
  }
  const ok = await recordEvent(shop, String(body.popupId ?? ""), type);
  return json({ ok }, { status: ok ? 200 : 404 });
};

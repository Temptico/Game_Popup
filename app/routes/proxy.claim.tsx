import type { ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { readProxyRequest } from "../lib/proxy.server";
import { getInstallation } from "../lib/popups.server";
import { createUniqueDiscount } from "../lib/discounts.server";
import { PLAN_LIMITS } from "../lib/plans";

// Game time can only run slower than wall time, so a real win always takes at
// least surviveSec since the token was issued. Allow a little clock slack.
const SLACK_MS = 1000;

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

// The discount code never ships in the page source — it's released here after a win.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, admin, body } = await readProxyRequest(request);
  const popupId = String(body.popupId ?? "");

  const popup = await db.popup.findFirst({ where: { id: popupId, shop, active: true } });
  if (!popup) return fail("unknown_popup", 404);

  // Theme-editor test mode: show a placeholder, never a real code, and don't
  // touch analytics. (A real code here would let anyone skip the game.)
  if (body.test === true) {
    return Response.json({
      ok: true,
      code: `${popup.codePrefix || "TEST"}-PREVIEW`,
    });
  }

  const claim = await db.claim.findFirst({
    where: { token: String(body.token ?? ""), shop, popupId: popup.id },
  });
  if (!claim) return fail("invalid_token", 403);
  if (claim.code) return Response.json({ ok: true, code: claim.code });

  if (Date.now() - claim.issuedAt.getTime() < popup.surviveSec * 1000 - SLACK_MS) {
    return fail("too_fast", 403);
  }

  let code: string | null = null;
  let discountId: string | null = null;
  if (popup.codeMode === "unique") {
    const { plan } = await getInstallation(admin);
    if (PLAN_LIMITS[plan].uniqueCodes) {
      try {
        ({ code, discountId } = await createUniqueDiscount(admin, popup));
      } catch (err) {
        console.error(`[claim] ${shop}`, err);
      }
    }
  }
  // Static mode, Pro lapsed, or the discount API failed → shared fallback code.
  code ??= popup.discountCode || null;
  if (!code) return fail("code_unavailable", 502);

  // Guard against a double-submit racing us: only the first write wins.
  const { count } = await db.claim.updateMany({
    where: { id: claim.id, code: null },
    data: { code, discountId, claimedAt: new Date() },
  });
  if (count === 0) {
    const existing = await db.claim.findUnique({ where: { id: claim.id } });
    return Response.json({ ok: true, code: existing?.code });
  }

  await db.event.create({ data: { shop, popupId: popup.id, type: "win" } });
  return Response.json({ ok: true, code });
};

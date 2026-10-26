import { randomInt } from "node:crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { readProxyRequest } from "../lib/proxy.server";
import { parseAbJson, parseTierValues } from "../lib/popups.server";
import { createUniqueDiscount, getShopCurrency } from "../lib/discounts.server";

// Game time can only run slower than wall time, so a real win always takes at
// least surviveSec since the token was issued. Allow a little clock slack.
const SLACK_MS = 1000;
const PONG_MIN_MS = 5000;

const fail = (error: string, status: number) => json({ ok: false, error }, { status });

const reply = (code: string, valueLabel: string | null, expiresAt: Date | null) =>
  json({ ok: true, code, value: valueLabel, expiresAt: expiresAt?.toISOString() ?? null });

// The discount code never ships in the page source — it's released here after a win.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, admin, body } = await readProxyRequest(request, { name: "claim", perHour: 30 });
  const popupId = String(body.popupId ?? "");

  const popup = await db.popup.findFirst({ where: { id: popupId, shop, active: true } });
  if (!popup) return fail("unknown_popup", 404);

  // 1 = won on the first attempt (best reward). Client-reported: the spread
  // between tiers is small and each code is single-use anyway.
  let tier = Math.min(3, Math.max(1, Math.round(Number(body.tier) || 3)));
  // Variant B of an A/B test has its own discount. The variant comes from the
  // claim (fixed at sign-up), or from the request in theme-editor test mode.
  const reward = (variant: string) => {
    const b = popup.abEnabled && variant === "b" ? parseAbJson(popup.abVariant) : null;
    return {
      amount: popup.tiered
        ? (b ? b.tierValues : parseTierValues(popup.tierValues))[tier - 1]
        : b ? b.discountValue : popup.discountValue,
      sharedCode: (b && b.discountCode) || popup.discountCode,
    };
  };

  // Spin wheel: the server draws the reward. The wheel shows the top reward on
  // 1 of 6 segments, the middle on 2 and the lowest on 3, and these are the odds.
  const gameOf = (variant: string) =>
    popup.abEnabled && variant === "b" ? parseAbJson(popup.abVariant).gameType : popup.gameType;
  const draw = () => {
    const r = randomInt(6);
    return r === 0 ? 1 : r < 3 ? 2 : 3;
  };

  // Theme-editor test mode: show a placeholder, never a real code, and don't
  // touch analytics. (A real code here would let anyone skip the game.)
  if (body.test === true) {
    if (gameOf(String(body.v ?? "")) === "wheel") tier = draw();
    const { amount } = reward(String(body.v ?? ""));
    const unique = popup.codeMode === "unique";
    return reply(
      `${popup.codePrefix || "TEST"}-PREVIEW`,
      unique && popup.discountType === "percentage" ? `${amount}%` : null,
      unique && popup.urgencyMinutes > 0 ? new Date(Date.now() + popup.urgencyMinutes * 60_000) : null,
    );
  }

  const claim = await db.claim.findFirst({
    where: { token: String(body.token ?? ""), shop, popupId: popup.id },
  });
  if (!claim) return fail("invalid_token", 403);
  if (claim.code) return reply(claim.code, claim.valueLabel, claim.expiresAt);

  // Pong ends when someone reaches 3 goals, which takes at least a few seconds
  // (serve pauses + ball travel); the wheel asks while it spins; the other games last surviveSec.
  const game = gameOf(claim.variant);
  const minMs = game === "pong" ? PONG_MIN_MS : game === "wheel" ? 0 : popup.surviveSec * 1000;
  if (Date.now() - claim.issuedAt.getTime() < minMs - SLACK_MS) {
    return fail("too_fast", 403);
  }
  if (game === "wheel") tier = draw();

  const { amount, sharedCode } = reward(claim.variant);
  let code: string | null = null;
  let discountId: string | null = null;
  let valueLabel: string | null = null;
  let expiresAt: Date | null = null;

  if (popup.codeMode === "unique") {
    // The countdown is only shown when it's real: the code actually expires.
    expiresAt =
      popup.urgencyMinutes > 0
        ? new Date(Date.now() + popup.urgencyMinutes * 60_000)
        : popup.codeExpiryDays > 0
          ? new Date(Date.now() + popup.codeExpiryDays * 86400_000)
          : null;
    try {
      ({ code, discountId } = await createUniqueDiscount(admin, popup, { amount, endsAt: expiresAt }));
      valueLabel =
        popup.discountType === "percentage"
          ? `${amount}%`
          : `${amount} ${await getShopCurrency(admin).catch(() => "")}`.trim();
    } catch (err) {
      console.error(`[claim] ${shop}`, err);
      expiresAt = null;
    }
  }
  // Static mode, or the discount API failed → shared fallback code.
  code ??= sharedCode || null;
  if (!code) return fail("code_unavailable", 502);

  // Guard against a double-submit racing us: only the first write wins.
  const { count } = await db.claim.updateMany({
    where: { id: claim.id, code: null },
    data: { code, discountId, valueLabel, expiresAt, claimedAt: new Date() },
  });
  if (count === 0) {
    const existing = await db.claim.findUnique({ where: { id: claim.id } });
    return reply(existing?.code ?? code, existing?.valueLabel ?? null, existing?.expiresAt ?? null);
  }

  await db.event.create({ data: { shop, popupId: popup.id, type: "win", variant: popup.abEnabled ? claim.variant : "", device: claim.device, country: claim.country } });
  return reply(code, valueLabel, expiresAt);
};

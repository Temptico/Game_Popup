import { randomInt } from "node:crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import db from "../db.server";
import { readProxyRequest } from "../lib/proxy.server";
import { rowToSettings } from "../lib/popups.server";
import { SKILL_GAMES, type WheelSegment } from "../lib/popup-defaults";
import { createUniqueDiscount, getShopCurrency } from "../lib/discounts.server";

// Game time can only run slower than wall time, so a real win always takes at
// least surviveSec since the token was issued. Allow a little clock slack.
const SLACK_MS = 1000;
const PONG_MIN_MS = 5000;

/** One reward, drawn by the chances in % (they add up to 100). */
function drawWheel(segs: WheelSegment[]) {
  let r = randomInt(100);
  for (const x of segs) {
    if (r < x.chance) return x.value;
    r -= x.chance;
  }
  return segs[segs.length - 1].value;
}

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
  const tier = Math.min(3, Math.max(1, Math.round(Number(body.tier) || 3)));
  const settings = rowToSettings(popup);
  // Consolation code after all attempts are lost (skill games, unique codes, when switched on).
  const cons = body.consolation === true;
  // Variant B of an A/B test has its own game and discount. The variant comes from
  // the claim (fixed at sign-up), or from the request in theme-editor test mode.
  const reward = (variant: string) => {
    const b = settings.abEnabled && variant === "b" ? settings.ab : null;
    const game = (b ?? settings).gameType;
    return {
      game,
      allowed: !cons || (settings.consolation && settings.codeMode === "unique" && SKILL_GAMES.includes(game)),
      emailAfter: (b ?? settings).emailAfter && SKILL_GAMES.includes(game),
      // Spin wheel: the server draws the reward with the chances the merchant set.
      // Reward by attempt applies to the skill games only.
      amount: cons
        ? settings.consolationValue
        : game === "wheel"
          ? drawWheel((b ?? settings).wheelSegments)
          : settings.tiered && SKILL_GAMES.includes(game)
            ? (b ?? settings).tierValues[tier - 1]
            : (b ?? settings).discountValue,
      sharedCode: (b && b.discountCode) || popup.discountCode,
    };
  };

  // Theme-editor test mode: show a placeholder, never a real code, and don't
  // touch analytics. (A real code here would let anyone skip the game.)
  if (body.test === true) {
    const { amount, allowed } = reward(String(body.v ?? ""));
    if (!allowed) return fail("no_consolation", 403);
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
  // (serve pauses + ball travel); the wheel asks while it spins, the form-only popup at once;
  // the other games last surviveSec.
  // A consolation code or an email asked after the game: the game time isn't known here.
  const { game, amount, sharedCode, allowed, emailAfter } = reward(claim.variant);
  if (!allowed) return fail("no_consolation", 403);
  const minMs =
    cons || emailAfter || game === "wheel" || game === "none" ? 0 : game === "pong" ? PONG_MIN_MS : popup.surviveSec * 1000;
  if (Date.now() - claim.issuedAt.getTime() < minMs - SLACK_MS) {
    return fail("too_fast", 403);
  }

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

  // A consolation code isn't a win.
  if (!cons) await db.event.create({ data: { shop, popupId: popup.id, type: "win", variant: popup.abEnabled ? claim.variant : "", device: claim.device, country: claim.country } });
  return reply(code, valueLabel, expiresAt);
};

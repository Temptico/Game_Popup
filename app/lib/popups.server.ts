import type { Popup } from "@prisma/client";
import { billingEnabled } from "./billing.server";
import db from "../db.server";
import {
  DEFAULT_STRINGS,
  LANGUAGES,
  parseAbJson,
  parseWheelSegments,
  isGameType,
  GAME_TEXTS,
  SKILL_GAMES,
  type GameType,
  type StringKey,
  type AbVariant,
  type WheelSegment,
  type CustomStrings,
  type Language,
  type PopupSettings,
  type Strings,
} from "./popup-defaults";
import { PLAN_LIMITS, planFromSubscriptionName, type PlanName } from "./plans";
import { getBillingStatus } from "./revenue.server";
import { getShopCurrency } from "./discounts.server";

export const METAFIELD_NAMESPACE = "gamediscount";
export const METAFIELD_KEY = "config";

interface AdminApi {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

const NAME_CODE = { required: "", optional: "o", hidden: "h" } as const;
// Games with their own texts (see GAME_TEXTS).
const OWN_TEXTS = new Set(["flipper", "pong", "wheel", "none"]);

export function rowToSettings(row: Popup): PopupSettings {
  let strings: CustomStrings = {};
  try {
    strings = JSON.parse(row.strings || "{}");
  } catch {
    strings = {};
  }
  return {
    name: row.name,
    active: row.active,
    discountCode: row.discountCode,
    delaySec: row.delaySec,
    surviveSec: row.surviveSec,
    vx: row.vx,
    vy: row.vy,
    maxAttempts: row.maxAttempts,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    sizeDesktop: row.sizeDesktop,
    sizeMobile: row.sizeMobile,
    target: row.target,
    requireConsent: row.requireConsent,
    doubleOptIn: row.doubleOptIn,
    nameField: row.nameField === "optional" || row.nameField === "hidden" ? row.nameField : "required",
    autoApply: row.autoApply,
    codeMode: row.codeMode === "unique" ? "unique" : "static",
    discountType: row.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: row.discountValue,
    codePrefix: row.codePrefix,
    codeExpiryDays: row.codeExpiryDays,
    gameType: isGameType(row.gameType) ? row.gameType : "paddle",
    difficulty: row.difficulty === "easy" || row.difficulty === "hard" ? row.difficulty : "medium",
    trigger: row.trigger === "delay" || row.trigger === "exit" ? row.trigger : "both",
    frequency: (["session", "once", "day", "week", "always"] as const).find((f) => f === row.frequency) ?? "session",
    noCart: row.noCart,
    teaser: row.teaser,
    tiered: row.tiered,
    tierValues: parseTierValues(row.tierValues),
    urgencyMinutes: row.urgencyMinutes,
    wheelSegments: readWheel(row.wheelSegments, row.tiered, parseTierValues(row.tierValues), row.discountValue),
    showValue: row.showValue,
    consolation: row.consolation,
    consolationValue: row.consolationValue,
    emailAfter: row.emailAfter,
    strings,
    abEnabled: row.abEnabled,
    ab: readAb(row),
  };
}

// Wheels saved before rewards had their own chances: the tiers become 1, 2 and
// 3 of 6 segments (the odds those wheels showed), a single discount 100%.
const LEGACY_CHANCES = [17, 33, 50];
function readWheel(raw: string, tiered: boolean, tiers: number[], value: number): WheelSegment[] {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw || "null");
  } catch {
    parsed = null;
  }
  if (Array.isArray(parsed) && parsed.length) return parseWheelSegments(parsed);
  return tiered ? tiers.map((v, i) => ({ value: v, chance: LEGACY_CHANCES[i] })) : [{ value, chance: 100 }];
}
function readAb(row: Popup): AbVariant {
  const ab = parseAbJson(row.abVariant);
  let stored = false;
  try {
    stored = Array.isArray(JSON.parse(row.abVariant || "{}").wheelSegments);
  } catch {
    stored = false;
  }
  if (!stored && ab.gameType === "wheel") {
    ab.wheelSegments = row.tiered
      ? ab.tierValues.map((v, i) => ({ value: v, chance: LEGACY_CHANCES[i] }))
      : [{ value: ab.discountValue, chance: 100 }];
  }
  return ab;
}

export { parseAbJson };

export function parseTierValues(raw: string): [number, number, number] {
  const v = raw.split(",").map(Number);
  return [v[0] || 15, v[1] || 10, v[2] || 5];
}

export function settingsToRow(s: PopupSettings) {
  const { ab, ...rest } = s;
  return {
    ...rest,
    strings: JSON.stringify(s.strings),
    tierValues: s.tierValues.join(","),
    wheelSegments: JSON.stringify(s.wheelSegments),
    abVariant: JSON.stringify(ab),
  };
}

/**
 * Reads the app installation id and the current plan straight from Shopify.
 * Works from any authenticated context (admin requests, webhooks, app proxy),
 * unlike `billing.check` which is only available on admin requests.
 */
export async function getInstallation(admin: AdminApi) {
  if (!billingEnabled()) {
    const res = await admin.graphql(`#graphql
      query GameDiscountInstallationId { currentAppInstallation { id } }`);
    const json = await res.json();
    return { id: json.data.currentAppInstallation.id as string, plan: "scale" as PlanName };
  }
  const res = await admin.graphql(
    `#graphql
    query GameDiscountInstallation {
      currentAppInstallation {
        id
        activeSubscriptions { name status }
      }
    }`,
  );
  const json = await res.json();
  const inst = json.data.currentAppInstallation;
  const active = (inst.activeSubscriptions as { name: string; status: string }[])
    .filter((s) => s.status === "ACTIVE")
    .map((s) => planFromSubscriptionName(s.name))
    .filter((p): p is PlanName => p !== null);
  // If several are active (e.g. mid-switch), the highest plan wins.
  const order: PlanName[] = ["scale", "growth", "standard", "free"];
  const plan = order.find((p) => active.includes(p)) ?? "free";
  return { id: inst.id as string, plan };
}

/** Active popups in creation order (every plan allows unlimited popups). */
export function livePopups(popups: Popup[]) {
  return popups
    .filter((p) => p.active)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * The storefront settings of the given popups: what the app embed reads from
 * the published config, and what a draft preview loads through the app proxy.
 */
export async function storefrontPopups(admin: AdminApi, rows: Popup[]) {
  const all = rows.map(rowToSettings);
  // Reward labels are written exactly like the won value: the wheel stops on it.
  // Shared codes have no known value (gifts on the wheel, no value in the headline).
  const currency = all.some(
    (s) => s.codeMode === "unique" && s.discountType !== "percentage" && (s.showValue || s.gameType === "wheel" || (s.abEnabled && s.ab.gameType === "wheel")),
  )
    ? await getShopCurrency(admin).catch(() => "")
    : "";
  const label = (s: PopupSettings, value: number) => (s.discountType === "percentage" ? `${value}%` : `${value} ${currency}`.trim());
  const wheelLabels = (s: PopupSettings, b?: PopupSettings["ab"]) =>
    s.codeMode !== "unique" ? undefined : (b ?? s).wheelSegments.map(({ value }) => label(s, value));
  // "Win up to 20% off": the best reward a variant can give, and whether there are several.
  const bestReward = (s: PopupSettings, v: PopupSettings | PopupSettings["ab"], game: GameType) => {
    const values =
      game === "wheel" ? v.wheelSegments.map((x) => x.value) : s.tiered && SKILL_GAMES.includes(game) ? v.tierValues : [v.discountValue];
    return { value: label(s, Math.max(...values)), several: new Set(values).size > 1 };
  };
  const rewardTitle = (s: PopupSettings, game: GameType, best: ReturnType<typeof bestReward>, t: Strings) =>
    (game === "none" ? t.noneTitleValue : best.several ? t.titleUpTo : t.titleWin).replace("{value}", best.value);

  return rows.map((p) => {
    const s = rowToSettings(p);
    // Some games word texts their own way unless the merchant wrote their own
    // (for A's game: a text written for A doesn't fit B's other game).
    const forGame = (game: GameType, l: Language, base: Strings) => ({
      ...base,
      ...Object.fromEntries(
        Object.entries(GAME_TEXTS[game]).map(([key, src]) => [
          key,
          (game === s.gameType ? s.strings[l]?.[key as StringKey] : undefined) ?? base[src],
        ]),
      ),
    });
    const base = Object.fromEntries(LANGUAGES.map((l) => [l, { ...DEFAULT_STRINGS[l], ...s.strings[l] }])) as Record<Language, Strings>;
    // Headline with the reward, unless the merchant wrote their own title.
    const named = s.showValue && s.codeMode === "unique";
    const titled = (game: GameType, v: PopupSettings | PopupSettings["ab"], l: Language, t: Strings) =>
      named && !s.strings[l]?.introTitle ? { ...t, introTitle: rewardTitle(s, game, bestReward(s, v, game), t) } : t;
    const strings = Object.fromEntries(LANGUAGES.map((l) => [l, titled(s.gameType, s, l, forGame(s.gameType, l, base[l]))]));
    // A/B test: the storefront picks a variant per visitor and overlays `ab`
    // (B's strings only for languages where B changes the texts).
    const ab = s.abEnabled
      ? {
          v: "b",
          gameType: s.ab.gameType,
          ...(s.ab.gameType === "wheel" ? { wheel: wheelLabels(s, s.ab) } : {}),
          trigger: s.ab.trigger,
          delaySec: s.ab.delaySec,
          name: NAME_CODE[s.ab.nameField],
          after: s.ab.emailAfter ? 1 : 0,
          // B's texts for every language when its game or reward changes the wording, else only where B overrides.
          strings: Object.fromEntries(
            LANGUAGES.filter((l) => named || s.ab.strings[l] || (s.ab.gameType !== s.gameType && (OWN_TEXTS.has(s.ab.gameType) || OWN_TEXTS.has(s.gameType))))
              .map((l) => [l, { ...titled(s.ab.gameType, s.ab, l, forGame(s.ab.gameType, l, base[l])), ...s.ab.strings[l] }]),
          ),
        }
      : undefined;
    return {
      id: p.id,
      ...(ab ? { v: "a", ab } : {}),
      delaySec: s.delaySec,
      surviveSec: s.surviveSec,
      vx: s.vx,
      vy: s.vy,
      maxAttempts: s.maxAttempts,
      primaryColor: s.primaryColor,
      accentColor: s.accentColor,
      // Inline style for the popup and the floating button: colors and size.
      css: `--gd-primary:${s.primaryColor};--gd-accent:${s.accentColor};--gd-sd:${s.sizeDesktop / 100};--gd-sm:${s.sizeMobile / 100}`,
      target: s.target,
      requireConsent: s.requireConsent,
      ...(s.doubleOptIn ? { doi: 1 } : {}),
      // Name field: omitted = required, "o" optional, "h" hidden.
      ...(s.nameField !== "required" ? { name: NAME_CODE[s.nameField] } : {}),
      autoApply: s.autoApply,
      // Skill games: consolation code when all attempts are lost; email asked after a win.
      ...(s.consolation && s.codeMode === "unique" ? { cons: 1 } : {}),
      ...(s.emailAfter ? { after: 1 } : {}),
      gameType: s.gameType,
      ...(s.gameType === "wheel" ? { wheel: wheelLabels(s) } : {}),
      difficulty: s.difficulty,
      trigger: s.trigger,
      frequency: s.frequency,
      ...(s.noCart ? { nc: 1 } : {}),
      teaser: s.teaser,
      // Resolved per language so the storefront script carries no translations.
      strings,
    };
  });
}

/**
 * Publishes the storefront configuration as an app-data metafield on the app
 * installation. The theme app extension reads it via
 * `app.metafields.gamediscount.config`. Discount codes are deliberately left
 * out — they're only released by the app proxy after a win.
 */
export async function publishConfig(admin: AdminApi, shop: string) {
  const [{ id: ownerId, plan }, popups] = await Promise.all([
    getInstallation(admin),
    db.popup.findMany({ where: { shop } }),
  ]);
  const limits = PLAN_LIMITS[plan];
  // Over the plan's revenue cap past the grace period → pause the storefront popup.
  const billing = await getBillingStatus(shop, plan);

  const live = billing.paused ? [] : await storefrontPopups(admin, livePopups(popups));
  // Texts go into one metafield per language: a page loads only its visitor's
  // language ("<popup id>" for A, "<popup id>:b" for variant B of an A/B test).
  const texts = Object.fromEntries(LANGUAGES.map((l) => [l, {} as Record<string, Strings>]));
  const popupsOut = live.map(({ strings, ...p }) => {
    for (const l of LANGUAGES) texts[l][p.id] = strings[l] as Strings;
    if (!p.ab) return p;
    const { strings: bStrings, ...ab } = p.ab;
    for (const l of LANGUAGES) if (bStrings[l]) texts[l][`${p.id}:b`] = bStrings[l] as Strings;
    return { ...p, ab };
  });
  const config = { v: 2, plan, branding: limits.branding, popups: popupsOut };

  const res = await admin.graphql(
    `#graphql
    mutation GameDiscountPublish($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          { ownerId, namespace: METAFIELD_NAMESPACE, key: METAFIELD_KEY, type: "json", value: JSON.stringify(config) },
          ...LANGUAGES.map((l) => ({
            ownerId,
            namespace: METAFIELD_NAMESPACE,
            key: `strings_${l}`,
            type: "json",
            value: JSON.stringify(texts[l]),
          })),
        ],
      },
    },
  );
  const json = await res.json();
  const errors = json.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`metafieldsSet failed: ${JSON.stringify(errors)}`);
  }
  await db.shopState.upsert({
    where: { shop },
    create: { shop, publishedPaused: billing.paused, publishedPlan: plan },
    update: { publishedPaused: billing.paused, publishedPlan: plan },
  });
  return { plan, config, billing };
}

/**
 * Plan and billing status, republishing the storefront only when the plan or
 * the paused state changed (an upgrade, the grace period ending). Cheaper than
 * publishing on every dashboard visit or order.
 */
export async function syncPublish(admin: AdminApi, shop: string) {
  const { plan } = await getInstallation(admin);
  const [billing, state] = await Promise.all([getBillingStatus(shop, plan), db.shopState.findUnique({ where: { shop } })]);
  if ((state?.publishedPaused ?? false) !== billing.paused || state?.publishedPlan !== plan) return publishConfig(admin, shop);
  return { plan, billing };
}

import type { Popup } from "@prisma/client";
import { billingEnabled } from "./billing.server";
import db from "../db.server";
import {
  DEFAULT_STRINGS,
  LANGUAGES,
  parseAbJson,
  isGameType,
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
// Games with their own intro and status texts.
const OWN_TEXTS = new Set(["pong", "wheel", "none"]);

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
    frequency: (["session", "day", "week", "always"] as const).find((f) => f === row.frequency) ?? "session",
    teaser: row.teaser,
    tiered: row.tiered,
    tierValues: parseTierValues(row.tierValues),
    urgencyMinutes: row.urgencyMinutes,
    strings,
    abEnabled: row.abEnabled,
    ab: parseAbJson(row.abVariant),
  };
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

  // Spin wheel segments show the real rewards, labelled exactly like the won
  // value (so the wheel can stop on it). Shared codes have no known value: gifts.
  const wheelPopups = popups.map(rowToSettings).filter((s) => s.gameType === "wheel" || (s.abEnabled && s.ab.gameType === "wheel"));
  const currency = wheelPopups.some((s) => s.codeMode === "unique" && s.discountType !== "percentage")
    ? await getShopCurrency(admin).catch(() => "")
    : "";
  const wheelLabels = (s: PopupSettings, b?: PopupSettings["ab"]) =>
    s.codeMode !== "unique"
      ? undefined
      : (s.tiered ? (b ?? s).tierValues : [(b ?? s).discountValue]).map((v) =>
          s.discountType === "percentage" ? `${v}%` : `${v} ${currency}`.trim(),
        );

  const config = {
    v: 1,
    plan,
    branding: limits.branding,
    popups: (billing.paused ? [] : livePopups(popups)).map((p) => {
      const s = rowToSettings(p);
      // Pong and the wheel have their own intro/status/lose texts unless the merchant wrote their own.
      const forGame = (game: string, l: Language, base: Strings) =>
        game === "pong"
          ? {
              ...base,
              introDesc: s.strings[l]?.introDesc ?? base.pongDesc,
              playing: s.strings[l]?.playing ?? base.pongHelp,
              fail: s.strings[l]?.fail ?? base.pongFail,
            }
          : game === "wheel"
            ? { ...base, introDesc: s.strings[l]?.introDesc ?? base.wheelDesc, playing: s.strings[l]?.playing ?? base.wheelHelp }
            : game === "none"
              ? {
                  ...base,
                  introTitle: s.strings[l]?.introTitle ?? base.noneTitle,
                  introDesc: s.strings[l]?.introDesc ?? base.noneDesc,
                  formTitle: s.strings[l]?.formTitle ?? base.noneForm,
                  formSubmit: s.strings[l]?.formSubmit ?? base.noneSubmit,
                  teaser: s.strings[l]?.teaser ?? base.noneTeaser,
                  consentError: s.strings[l]?.consentError ?? base.noneConsent,
                }
              : base;
      const base = Object.fromEntries(LANGUAGES.map((l) => [l, { ...DEFAULT_STRINGS[l], ...s.strings[l] }])) as Record<Language, Strings>;
      const strings = Object.fromEntries(LANGUAGES.map((l) => [l, forGame(s.gameType, l, base[l])]));
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
            // B's texts for every language when its game changes the wording, else only where B overrides.
            strings: Object.fromEntries(
              LANGUAGES.filter((l) => s.ab.strings[l] || (s.ab.gameType !== s.gameType && (OWN_TEXTS.has(s.ab.gameType) || OWN_TEXTS.has(s.gameType))))
                .map((l) => [l, { ...forGame(s.ab.gameType, l, base[l]), ...s.ab.strings[l] }]),
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
        gameType: s.gameType,
        ...(s.gameType === "wheel" ? { wheel: wheelLabels(s) } : {}),
        difficulty: s.difficulty,
        trigger: s.trigger,
        frequency: s.frequency,
        teaser: s.teaser,
        // Resolved per language so the storefront script carries no translations.
        strings,
      };
    }),
  };

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
          {
            ownerId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    },
  );
  const json = await res.json();
  const errors = json.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`metafieldsSet failed: ${JSON.stringify(errors)}`);
  }
  return { plan, config, billing };
}

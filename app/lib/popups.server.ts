import type { Popup } from "@prisma/client";
import { billingEnabled } from "./billing.server";
import db from "../db.server";
import {
  DEFAULT_STRINGS,
  LANGUAGES,
  type CustomStrings,
  type PopupSettings,
} from "./popup-defaults";
import { PLAN_LIMITS, planFromSubscriptionName, type PlanName } from "./plans";
import { getBillingStatus } from "./revenue.server";

export const METAFIELD_NAMESPACE = "gamediscount";
export const METAFIELD_KEY = "config";

interface AdminApi {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

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
    autoApply: row.autoApply,
    codeMode: row.codeMode === "unique" ? "unique" : "static",
    discountType: row.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: row.discountValue,
    codePrefix: row.codePrefix,
    codeExpiryDays: row.codeExpiryDays,
    gameType: row.gameType === "flipper" ? "flipper" : "paddle",
    trigger: row.trigger === "delay" || row.trigger === "exit" ? row.trigger : "both",
    frequency: (["session", "day", "week", "always"] as const).find((f) => f === row.frequency) ?? "session",
    teaser: row.teaser,
    tiered: row.tiered,
    tierValues: parseTierValues(row.tierValues),
    urgencyMinutes: row.urgencyMinutes,
    strings,
  };
}

export function parseTierValues(raw: string): [number, number, number] {
  const v = raw.split(",").map(Number);
  return [v[0] || 15, v[1] || 10, v[2] || 5];
}

export function settingsToRow(s: PopupSettings) {
  return { ...s, strings: JSON.stringify(s.strings), tierValues: s.tierValues.join(",") };
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

  const config = {
    v: 1,
    plan,
    branding: limits.branding,
    popups: (billing.paused ? [] : livePopups(popups)).map((p) => {
      const s = rowToSettings(p);
      return {
        id: p.id,
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
        autoApply: s.autoApply,
        gameType: s.gameType,
        trigger: s.trigger,
        frequency: s.frequency,
        teaser: s.teaser,
        // Resolved per language so the storefront script carries no translations.
        strings: Object.fromEntries(
          LANGUAGES.map((l) => [l, { ...DEFAULT_STRINGS[l], ...s.strings[l] }]),
        ),
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

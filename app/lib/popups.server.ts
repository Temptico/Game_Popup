import type { Popup } from "@prisma/client";
import db from "../db.server";
import {
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  DEFAULT_STRINGS,
  LANGUAGES,
  type CustomStrings,
  type PopupSettings,
} from "./popup-defaults";
import { PLAN_LIMITS, PRO_PLAN, type PlanName } from "./plans";

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
  const isPro = (inst.activeSubscriptions as { name: string; status: string }[]).some(
    (s) => s.name === PRO_PLAN && s.status === "ACTIVE",
  );
  return { id: inst.id as string, plan: (isPro ? "pro" : "free") as PlanName };
}

/** Popups that are actually live on the storefront given the plan's limits. */
export function livePopups(popups: Popup[], plan: PlanName) {
  const active = popups
    .filter((p) => p.active)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return active.slice(0, PLAN_LIMITS[plan].activePopups);
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

  const config = {
    v: 1,
    plan,
    branding: limits.branding,
    popups: livePopups(popups, plan).map((p) => {
      const s = rowToSettings(p);
      return {
        id: p.id,
        delaySec: s.delaySec,
        surviveSec: s.surviveSec,
        vx: s.vx,
        vy: s.vy,
        maxAttempts: s.maxAttempts,
        primaryColor: limits.customColors ? s.primaryColor : DEFAULT_PRIMARY,
        accentColor: limits.customColors ? s.accentColor : DEFAULT_ACCENT,
        target: s.target,
        requireConsent: s.requireConsent,
        autoApply: s.autoApply,
        // Flipper is Pro; a lapsed plan falls back to the paddle game.
        gameType: limits.flipper ? s.gameType : "paddle",
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
  return { plan, config };
}

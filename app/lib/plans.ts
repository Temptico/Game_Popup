// Revenue-based pricing: every plan has every feature; plans differ only in
// how much popup-generated revenue (last 30 days, USD) they cover, and the
// Free plan shows a small Enigma Play icon in the popup (standard app attribution).

export type PlanName = "free" | "standard" | "growth" | "scale";

export interface Plan {
  key: PlanName;
  /** Shopify billing plan name (null for Free). */
  billingName: string | null;
  price: number;
  /** Max popup-generated revenue per rolling 30 days, in USD. */
  revenueCap: number;
}

export const PLANS: Plan[] = [
  { key: "free", billingName: null, price: 0, revenueCap: 500 },
  { key: "standard", billingName: "Enigma Play Standard", price: 9.99, revenueCap: 3000 },
  { key: "growth", billingName: "Enigma Play Growth", price: 19.99, revenueCap: 12000 },
  { key: "scale", billingName: "Enigma Play Scale", price: 29.99, revenueCap: Infinity },
];

export const PLAN_LABELS: Record<PlanName, string> = {
  free: "Free",
  standard: "Standard",
  growth: "Growth",
  scale: "Scale",
};

// Subscriptions from the earlier single-plan pricing keep working as Growth.
// Subscriptions created under the app's earlier names.
export const LEGACY_PLANS: Record<string, PlanName> = {
  "GameDiscount Pro": "growth",
  "GameDiscount Standard": "standard",
  "GameDiscount Growth": "growth",
  "GameDiscount Scale": "scale",
};

/** Days a store may exceed its plan's revenue cap before the popup pauses. */
export const GRACE_DAYS = 14;

export const getPlan = (key: PlanName) => PLANS.find((p) => p.key === key)!;

export function planFromSubscriptionName(name: string): PlanName | null {
  return PLANS.find((p) => p.billingName === name)?.key ?? LEGACY_PLANS[name] ?? null;
}

/** Smallest plan whose cap covers the given revenue. */
export function requiredPlan(revenueUsd: number): Plan {
  return PLANS.find((p) => revenueUsd <= p.revenueCap) ?? PLANS[PLANS.length - 1];
}

export const PLAN_LIMITS = {
  free: { branding: true },
  standard: { branding: false },
  growth: { branding: false },
  scale: { branding: false },
} as const;

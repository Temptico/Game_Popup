export const PRO_PLAN = "GameDiscount Pro";
export const PRO_PRICE = 9;

export type PlanName = "free" | "pro";

export const PLAN_LIMITS = {
  free: { activePopups: 1, branding: true, customColors: false, analytics: false },
  pro: { activePopups: Infinity, branding: false, customColors: true, analytics: true },
} as const;

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Banner, BlockStack, Page, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { BrandHero } from "../components/BrandHero";
import { authenticate } from "../shopify.server";
import { getInstallation, publishConfig } from "../lib/popups.server";
import { getBillingStatus } from "../lib/revenue.server";
import { PLANS, PLAN_LABELS, planFromSubscriptionName, type PlanName } from "../lib/plans";

// Test charges unless explicitly running in production billing mode.
const isTest = process.env.BILLING_TEST !== "false";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const { plan } = await getInstallation(admin);
  const status = await getBillingStatus(session.shop, plan);
  const { appSubscriptions } = await billing.check({
    plans: PLANS.flatMap((p) => (p.billingName ? [p.billingName] : [])),
    isTest,
  });
  const current = appSubscriptions.find((s) => planFromSubscriptionName(s.name) === plan);
  return {
    plan,
    revenueUsd: status.revenueUsd,
    required: status.required,
    subscriptionId: current?.id ?? appSubscriptions[0]?.id ?? null,
    // JSON can't carry Infinity; null = unlimited.
    plans: PLANS.map((p) => ({ ...p, revenueCap: Number.isFinite(p.revenueCap) ? p.revenueCap : null })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "subscribe") {
    const target = PLANS.find((p) => p.key === form.get("plan"));
    if (!target?.billingName) return { error: "Unknown plan" };
    const storeHandle = session.shop.replace(".myshopify.com", "");
    try {
      // Throws a redirect to Shopify's approval screen; approving replaces any current plan.
      await billing.request({
        plan: target.billingName,
        isTest,
        returnUrl: `https://admin.shopify.com/store/${storeHandle}/apps/${process.env.SHOPIFY_API_KEY}/app`,
      });
    } catch (err) {
      if (err instanceof Response) throw err;
      // Surface Shopify's reason (e.g. the app has no public distribution yet).
      const data = (err as { errorData?: unknown }).errorData;
      const details = (Array.isArray(data) ? data : [])
        .map((e: { message?: string }) => e?.message)
        .filter(Boolean)
        .join(" ");
      console.error("[billing]", err, JSON.stringify(data));
      return { error: details || (err as Error).message };
    }
  }

  if (intent === "cancel") {
    await billing.cancel({
      subscriptionId: String(form.get("subscriptionId")),
      isTest,
      prorate: true,
    });
    await publishConfig(admin, session.shop);
  }
  return { error: null as string | null };
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export default function Plans() {
  const { plan, revenueUsd, required, subscriptionId, plans } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const busyPlan = nav.state !== "idle" ? nav.formData?.get("plan") ?? nav.formData?.get("intent") : null;
  const rank = (k: PlanName) => plans.findIndex((p) => p.key === k);

  return (
    <Page>
      <TitleBar title="Plans" />
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner tone="critical" title="Shopify rejected the subscription">
            <p>{actionData.error}</p>
          </Banner>
        )}
        <BrandHero
          eyebrow="Plans"
          title="Pay only when GameDiscount makes you money"
          subtitle="Every plan includes every feature: all games, unique codes, reward tiers, countdown, unlimited popups and analytics. Plans differ only by the revenue the popup generates for you (orders using a GameDiscount code, last 30 days)."
          stats={[
            { label: "Your popup revenue (30 days)", value: usd(revenueUsd) },
            { label: "Current plan", value: PLAN_LABELS[plan] },
            { label: "Plan that fits you", value: PLAN_LABELS[required] },
          ]}
        />

        <div className="gd-plans">
          {plans.map((p) => {
            const isCurrent = p.key === plan;
            const needsUpgrade = rank(required) > rank(plan);
            const recommended = needsUpgrade && p.key === required;
            // Highlight the plan the store needs, otherwise Growth as the default pick.
            const featured = recommended || (!needsUpgrade && p.key === "growth" && !isCurrent);
            return (
              <div
                key={p.key}
                className={`gd-plan${isCurrent ? " gd-plan-current" : ""}${featured ? " gd-plan-featured" : ""}`}
              >
                {isCurrent && <span className="gd-plan-tag">Current plan</span>}
                {!isCurrent && recommended && <span className="gd-plan-tag">Recommended</span>}
                {!isCurrent && !recommended && featured && <span className="gd-plan-tag">Most popular</span>}
                <p className="gd-plan-name">{PLAN_LABELS[p.key]}</p>
                <div className="gd-plan-price">
                  {p.price === 0 ? "$0" : `$${p.price}`}
                  {p.price > 0 && <small>/ month</small>}
                </div>
                <div className="gd-plan-cap">
                  {p.revenueCap === null ? "Unlimited popup revenue" : `Up to ${usd(p.revenueCap)} popup revenue / 30 days`}
                </div>
                <ul>
                  <li>All games &amp; features</li>
                  <li>Unique codes &amp; analytics</li>
                  <li>{p.key === "free" ? "“Powered by GameDiscount”" : "No branding"}</li>
                </ul>
                {isCurrent ? (
                  p.key !== "free" && subscriptionId ? (
                    <Form method="post">
                      <input type="hidden" name="intent" value="cancel" />
                      <input type="hidden" name="subscriptionId" value={subscriptionId} />
                      <button type="submit" className="gd-plan-btn gd-plan-btn-ghost" disabled={busyPlan === "cancel"}>
                        Switch to Free
                      </button>
                    </Form>
                  ) : (
                    <span className="gd-plan-note">Your current plan</span>
                  )
                ) : p.key === "free" ? (
                  <span className="gd-plan-note">Cancel your plan to return to Free</span>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="intent" value="subscribe" />
                    <input type="hidden" name="plan" value={p.key} />
                    <button type="submit" className="gd-plan-btn" disabled={busyPlan === p.key}>
                      {busyPlan === p.key
                        ? "Opening Shopify…"
                        : rank(p.key) > rank(plan)
                          ? `Upgrade to ${PLAN_LABELS[p.key]}`
                          : `Switch to ${PLAN_LABELS[p.key]}`}
                    </button>
                  </Form>
                )}
              </div>
            );
          })}
        </div>
        <Text as="p" tone="subdued" variant="bodySm">
          If your popup revenue goes above your plan, the popup keeps running for 14 days so you
          have time to upgrade. Revenue in other currencies is converted to USD at approximate
          rates. Billed by Shopify every 30 days.
        </Text>
      </BlockStack>
    </Page>
  );
}

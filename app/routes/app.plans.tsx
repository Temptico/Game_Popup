import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
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
      <BlockStack gap="400">
        {actionData?.error && (
          <Banner tone="critical" title="Shopify rejected the subscription">
            <p>{actionData.error}</p>
          </Banner>
        )}
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Pay only when GameDiscount makes you money
            </Text>
            <Text as="p">
              Every plan includes every feature: all games, unique codes, reward tiers, countdown,
              unlimited popups and analytics. Plans differ only by how much revenue the popup
              generates for you (orders that use a GameDiscount code, last 30 days).
            </Text>
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" tone="subdued">
                Your popup revenue (30 days):
              </Text>
              <Text as="span" variant="headingLg">
                {usd(revenueUsd)}
              </Text>
            </InlineStack>
          </BlockStack>
        </Card>

        <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
          {plans.map((p) => {
            const isCurrent = p.key === plan;
            const recommended = p.key === required && !isCurrent && rank(required) > rank(plan);
            return (
              <Card key={p.key} background={recommended ? "bg-surface-success" : undefined}>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingLg">
                      {PLAN_LABELS[p.key]}
                    </Text>
                    {isCurrent && <Badge tone="success">Current</Badge>}
                    {recommended && <Badge tone="attention">Recommended</Badge>}
                  </InlineStack>
                  <Text as="p" variant="heading2xl">
                    {p.price === 0 ? "$0" : `$${p.price}`}
                    {p.price > 0 && (
                      <Text as="span" tone="subdued" variant="bodyMd">
                        {" "}
                        / month
                      </Text>
                    )}
                  </Text>
                  <Box minHeight="72px">
                    <List>
                      <List.Item>
                        {p.revenueCap === null
                          ? "Unlimited popup revenue"
                          : `Up to ${usd(p.revenueCap)} popup revenue / 30 days`}
                      </List.Item>
                      <List.Item>All features</List.Item>
                      <List.Item>{p.key === "free" ? "“Powered by GameDiscount”" : "No branding"}</List.Item>
                    </List>
                  </Box>
                  {isCurrent ? (
                    p.key !== "free" && subscriptionId ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="cancel" />
                        <input type="hidden" name="subscriptionId" value={subscriptionId} />
                        <Button submit tone="critical" variant="plain" loading={busyPlan === "cancel"}>
                          Switch to Free
                        </Button>
                      </Form>
                    ) : (
                      <Text as="p" tone="subdued">
                        Your current plan
                      </Text>
                    )
                  ) : p.key === "free" ? (
                    <Text as="p" tone="subdued">
                      Cancel your plan to return to Free
                    </Text>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="intent" value="subscribe" />
                      <input type="hidden" name="plan" value={p.key} />
                      <Button
                        submit
                        fullWidth
                        variant={recommended ? "primary" : "secondary"}
                        loading={busyPlan === p.key}
                      >
                        {rank(p.key) > rank(plan) ? `Upgrade to ${PLAN_LABELS[p.key]}` : `Switch to ${PLAN_LABELS[p.key]}`}
                      </Button>
                    </Form>
                  )}
                </BlockStack>
              </Card>
            );
          })}
        </InlineGrid>
        <Text as="p" tone="subdued" variant="bodySm">
          If your popup revenue goes above your plan, the popup keeps running for 14 days so you
          have time to upgrade. Revenue in other currencies is converted to USD at approximate
          rates.
        </Text>
      </BlockStack>
    </Page>
  );
}

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
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
import { publishConfig } from "../lib/popups.server";
import { PRO_PLAN, PRO_PRICE } from "../lib/plans";

// Test charges unless explicitly running in production billing mode.
const isTest = process.env.BILLING_TEST !== "false";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [PRO_PLAN],
    isTest,
  });
  return { isPro: hasActivePayment, subscriptionId: appSubscriptions[0]?.id ?? null };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session, admin } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "upgrade") {
    const storeHandle = session.shop.replace(".myshopify.com", "");
    try {
      // Throws a redirect to Shopify's approval screen.
      await billing.request({
        plan: PRO_PLAN,
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

  if (form.get("intent") === "cancel") {
    await billing.cancel({
      subscriptionId: String(form.get("subscriptionId")),
      isTest,
      prorate: true,
    });
    await publishConfig(admin, session.shop);
  }
  return { error: null as string | null };
};

const FEATURES = {
  free: ["1 active popup", "Paddle game + email capture", "4 languages (sl, hr, ro, en)", "“Powered by GameDiscount” branding"],
  pro: ["Unique single-use code per winner", "Unlimited popups (per page type)", "No branding", "Custom colors", "Analytics dashboard", "Everything in Free"],
};

export default function Plans() {
  const { isPro, subscriptionId } = useLoaderData<typeof loader>();
  const busy = useNavigation().state !== "idle";
  const actionData = useActionData<typeof action>();

  return (
    <Page>
      <TitleBar title="Plans" />
      {actionData?.error && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="critical" title="Shopify rejected the subscription">
            <p>{actionData.error}</p>
          </Banner>
        </div>
      )}
      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">Free</Text>
              {!isPro && <Badge tone="success">Current</Badge>}
            </InlineStack>
            <Text as="p" variant="heading2xl">$0</Text>
            <List>{FEATURES.free.map((f) => <List.Item key={f}>{f}</List.Item>)}</List>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingLg">Pro</Text>
              {isPro && <Badge tone="success">Current</Badge>}
            </InlineStack>
            <Text as="p" variant="heading2xl">${PRO_PRICE}<Text as="span" tone="subdued"> / month</Text></Text>
            <List>{FEATURES.pro.map((f) => <List.Item key={f}>{f}</List.Item>)}</List>
            <Form method="post">
              {isPro ? (
                <>
                  <input type="hidden" name="intent" value="cancel" />
                  <input type="hidden" name="subscriptionId" value={subscriptionId ?? ""} />
                  <Button submit tone="critical" loading={busy}>Cancel Pro</Button>
                </>
              ) : (
                <>
                  <input type="hidden" name="intent" value="upgrade" />
                  <Button submit variant="primary" loading={busy}>Upgrade to Pro</Button>
                </>
              )}
            </Form>
          </BlockStack>
        </Card>
      </InlineGrid>
    </Page>
  );
}

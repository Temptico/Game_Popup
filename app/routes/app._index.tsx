import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { livePopups, publishConfig } from "../lib/popups.server";
import { getCounts } from "../lib/analytics.server";
import { PLAN_LIMITS } from "../lib/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Republishing here keeps the storefront in sync after plan changes
  // (e.g. returning from the billing approval screen).
  const { plan } = await publishConfig(admin, shop);
  const popups = await db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } });
  const live = new Set(livePopups(popups, plan).map((p) => p.id));
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const { byPopup } = await getCounts(shop, since);

  return {
    plan,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    popups: popups.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      live: live.has(p.id),
      discountCode: p.discountCode,
      target: p.target,
      counts: byPopup[p.id] ?? { view: 0, submit: 0, play: 0, win: 0 },
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");
  const id = String(form.get("id"));

  const popup = await db.popup.findFirst({ where: { id, shop } });
  if (!popup) return { ok: false, message: "Popup not found" };

  if (intent === "delete") {
    await db.popup.delete({ where: { id } });
    await publishConfig(admin, shop);
    return { ok: true, message: "Popup deleted" };
  }

  if (intent === "toggle") {
    const activate = !popup.active;
    if (activate) {
      const { plan } = await publishConfig(admin, shop);
      const activeCount = await db.popup.count({ where: { shop, active: true } });
      if (activeCount >= PLAN_LIMITS[plan].activePopups) {
        return {
          ok: false,
          message: "Free plan allows 1 active popup. Upgrade to Pro for unlimited.",
        };
      }
    }
    await db.popup.update({ where: { id }, data: { active: activate } });
    await publishConfig(admin, shop);
    return { ok: true, message: activate ? "Popup activated" : "Popup paused" };
  }

  return { ok: false, message: "Unknown action" };
};

const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

export default function Index() {
  const { popups, plan, apiKey } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
    }
  }, [fetcher.data, shopify]);

  const embedUrl = `shopify:admin/themes/current/editor?context=apps&activateAppId=${apiKey}/game-popup`;
  const submit = (intent: string, id: string) =>
    fetcher.submit({ intent, id }, { method: "POST" });

  return (
    <Page>
      <TitleBar title="GameDiscount">
        <button variant="primary" onClick={() => navigate("/app/popups/new")}>
          Create popup
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Banner
            title="Turn on the popup in your theme"
            tone="info"
            action={{ content: "Open theme editor", url: embedUrl, target: "_top" }}
          >
            <p>
              Enable the <b>GameDiscount popup</b> app embed in Theme settings → App embeds,
              then save the theme. Settings you change here go live instantly — no theme edits
              needed.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            {popups.length === 0 ? (
              <EmptyState
                heading="Create your first discount game"
                action={{ content: "Create popup", url: "/app/popups/new" }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Visitors enter their email, play a quick paddle game and win your discount code.
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "popup", plural: "popups" }}
                itemCount={popups.length}
                selectable={false}
                headings={[
                  { title: "Name" },
                  { title: "Status" },
                  { title: "Code" },
                  { title: "Views (30d)", alignment: "end" },
                  { title: "Email rate", alignment: "end" },
                  { title: "Win rate", alignment: "end" },
                  { title: "" },
                ]}
              >
                {popups.map((p, i) => (
                  <IndexTable.Row id={p.id} key={p.id} position={i}>
                    <IndexTable.Cell>
                      <Button variant="plain" url={`/app/popups/${p.id}`}>
                        {p.name}
                      </Button>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {p.live ? (
                        <Badge tone="success">Live</Badge>
                      ) : p.active ? (
                        <Badge tone="warning">Over plan limit</Badge>
                      ) : (
                        <Badge>Paused</Badge>
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="semibold">
                        {p.discountCode}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" alignment="end" numeric>
                        {p.counts.view}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" alignment="end" numeric>
                        {rate(p.counts.submit, p.counts.view)}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" alignment="end" numeric>
                        {rate(p.counts.win, p.counts.submit)}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <InlineStack gap="200" align="end">
                        <Button size="slim" onClick={() => submit("toggle", p.id)}>
                          {p.active ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          size="slim"
                          tone="critical"
                          variant="plain"
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"? Its analytics will be deleted too.`)) {
                              submit("delete", p.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Your plan
                </Text>
                <Badge tone={plan === "pro" ? "success" : undefined}>
                  {plan === "pro" ? "Pro" : "Free"}
                </Badge>
              </InlineStack>
              {plan === "pro" ? (
                <Text as="p">Unlimited popups, no branding, custom colors and analytics.</Text>
              ) : (
                <>
                  <Text as="p">
                    1 active popup with “Powered by GameDiscount” branding. Pro removes branding
                    and unlocks unlimited popups, custom colors and analytics for $9/month.
                  </Text>
                  <Button url="/app/plans" variant="primary">
                    Upgrade to Pro
                  </Button>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

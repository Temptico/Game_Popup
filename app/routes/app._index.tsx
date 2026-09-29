import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  InlineStack,
  Link,
  Modal,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { livePopups, publishConfig } from "../lib/popups.server";
import { getCounts } from "../lib/analytics.server";
import { PLAN_LABELS, getPlan } from "../lib/plans";
import { TARGETS } from "../lib/popup-defaults";
import { APP_VERSION } from "../lib/version";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Republishing here keeps the storefront in sync after plan changes
  // (e.g. returning from the billing approval screen).
  const { plan, billing } = await publishConfig(admin, shop);
  const popups = await db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } });
  const live = new Set(billing.paused ? [] : livePopups(popups).map((p) => p.id));
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const { byPopup } = await getCounts(shop, since);

  return {
    plan,
    billing,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    popups: popups.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      live: live.has(p.id),
      discountCode: p.codeMode === "unique" ? "Unique per winner" : p.discountCode,
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
    await db.popup.update({ where: { id }, data: { active: activate } });
    await publishConfig(admin, shop);
    return { ok: true, message: activate ? "Popup activated" : "Popup paused" };
  }

  return { ok: false, message: "Unknown action" };
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const targetLabel = (v: string) => TARGETS.find((t) => t.value === v)?.label ?? v;
const EMBED_HINT_KEY = "gd_embed_hint_dismissed";

export default function Index() {
  const { popups, plan, billing, apiKey } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [params, setParams] = useSearchParams();
  const [showEmbedHint, setShowEmbedHint] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    try {
      setShowEmbedHint(localStorage.getItem(EMBED_HINT_KEY) !== "1");
    } catch {
      setShowEmbedHint(true);
    }
  }, []);

  // Returning from the editor after a save.
  const saved = params.get("saved");
  useEffect(() => {
    if (saved) {
      shopify.toast.show(`“${saved}” saved — live on your storefront`);
      setParams((p) => {
        p.delete("saved");
        return p;
      }, { replace: true });
    }
  }, [saved, shopify, setParams]);

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, { isError: !fetcher.data.ok });
    }
  }, [fetcher.data, shopify]);

  const embedUrl = `shopify:admin/themes/current/editor?context=apps&activateAppId=${apiKey}/game-popup`;
  const submit = (intent: string, id: string) =>
    fetcher.submit({ intent, id }, { method: "POST" });
  const dismissEmbedHint = () => {
    setShowEmbedHint(false);
    try {
      localStorage.setItem(EMBED_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // The header lives in the Shopify admin title bar (TitleBar); the Polaris Page
  // has no title of its own, otherwise the admin shows two headers.
  return (
    <Page>
      <TitleBar title="Popups">
        <button variant="primary" onClick={() => navigate("/app/popups/new")}>
          Create popup
        </button>
        <button onClick={() => navigate("/app/analytics")}>Analytics</button>
      </TitleBar>
      <BlockStack gap="400">
        <InlineStack gap="200" blockAlign="center">
          <Text as="span" tone="subdued">
            Plan:
          </Text>
          <Badge tone={plan === "free" ? undefined : "success"}>{PLAN_LABELS[plan]}</Badge>
          <Text as="span" tone="subdued">
            · Sales from GameDiscount (30 days): <b>{usd(billing.revenueUsd)}</b>
            {Number.isFinite(billing.cap) ? ` of ${usd(billing.cap)} included` : " · unlimited"}
          </Text>
          <Link url="/app/plans">Plans</Link>
        </InlineStack>
        {billing.overLimit && (
          <Banner
            tone={billing.paused ? "critical" : "warning"}
            title={
              billing.paused
                ? "Your popup is paused"
                : `GameDiscount made you ${usd(billing.revenueUsd)} in the last 30 days 🎉`
            }
            action={{ content: `Upgrade to ${PLAN_LABELS[billing.required]} — $${getPlan(billing.required).price}/month`, url: "/app/plans" }}
          >
            <p>
              {billing.paused
                ? `Sales from the popup exceeded your ${PLAN_LABELS[plan]} plan (${usd(billing.cap)}/30 days) and the grace period has ended. Upgrade to switch it back on.`
                : `That's more than your ${PLAN_LABELS[plan]} plan includes (${usd(billing.cap)}/30 days). The popup keeps running until ${new Date(billing.graceEndsAt!).toLocaleDateString()} — upgrade before then to keep it live.`}
            </p>
          </Banner>
        )}
        {showEmbedHint && (
          <Banner
            title="Step 1: turn on the popup in your theme"
            tone="info"
            action={{ content: "Open theme editor", url: embedUrl, target: "_top" }}
            secondaryAction={{ content: "Done, hide this", onAction: dismissEmbedHint }}
            onDismiss={dismissEmbedHint}
          >
            <p>Switch on “GameDiscount popup” under App embeds and click Save.</p>
          </Banner>
        )}

        <Card padding="0">
          {popups.length === 0 ? (
            <EmptyState
              heading="Create your first discount game"
              action={{ content: "Create popup", url: "/app/popups/new" }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Visitors enter their email, play a quick paddle game and win your discount.</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={{ singular: "popup", plural: "popups" }}
              itemCount={popups.length}
              selectable={false}
              headings={[
                { title: "Popup" },
                { title: "Status" },
                { title: "Discount" },
                { title: "Views", alignment: "end" },
                { title: "Emails", alignment: "end" },
                { title: "Wins", alignment: "end" },
                { title: "Actions", alignment: "end" },
              ]}
            >
              {popups.map((p, i) => (
                <IndexTable.Row
                  id={p.id}
                  key={p.id}
                  position={i}
                  onClick={() => navigate(`/app/popups/${p.id}`)}
                >
                  <IndexTable.Cell>
                    <BlockStack gap="050">
                      <Link url={`/app/popups/${p.id}`} removeUnderline>
                        <Text as="span" fontWeight="semibold">
                          {p.name}
                        </Text>
                      </Link>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {targetLabel(p.target)}
                      </Text>
                    </BlockStack>
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
                  <IndexTable.Cell>{p.discountCode}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" alignment="end" numeric>
                      {p.counts.view}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Stat value={p.counts.submit} pct={rate(p.counts.submit, p.counts.view)} />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Stat value={p.counts.win} pct={rate(p.counts.win, p.counts.submit)} />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {/* stopPropagation: these buttons shouldn't open the editor */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <InlineStack gap="200" align="end" wrap={false}>
                        <Button size="slim" onClick={() => submit("toggle", p.id)}>
                          {p.active ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          size="slim"
                          tone="critical"
                          onClick={() => setToDelete({ id: p.id, name: p.name })}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    </div>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </Card>
        {popups.length > 0 && (
          <Text as="p" variant="bodySm" tone="subdued">
            Last 30 days. Emails = share of views that entered an email; Wins = share of emails that won.
          </Text>
        )}
        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
          GameDiscount v{APP_VERSION}
        </Text>
      </BlockStack>
      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: () => {
            if (toDelete) submit("delete", toDelete.id);
            setToDelete(null);
          },
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setToDelete(null) }]}
      >
        <Modal.Section>
          <Text as="p">The popup and its analytics will be deleted. This can’t be undone.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

function Stat({ value, pct }: { value: number; pct: string }) {
  return (
    <BlockStack gap="0" inlineAlign="end">
      <Text as="span" numeric>
        {value}
      </Text>
      <Text as="span" variant="bodySm" tone="subdued" numeric>
        {pct}
      </Text>
    </BlockStack>
  );
}

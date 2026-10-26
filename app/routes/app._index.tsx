import { useEffect, useState } from "react";
import { billingEnabled } from "../lib/billing.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link as RemixLink, useFetcher, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import {
  ActionList,
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
  Popover,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { livePopups, publishConfig } from "../lib/popups.server";
import { getCounts } from "../lib/analytics.server";
import { getRevenue } from "../lib/revenue.server";
import { PLAN_LABELS, getPlan } from "../lib/plans";
import { DEFAULT_ACCENT, DEFAULT_PRIMARY, TARGETS, type GameType } from "../lib/popup-defaults";
import { ColorsPicture, EmbedPicture, GameThumb, PublishPicture, SetupGuide } from "../components/SetupGuide";
import { APP_VERSION, LISTING_URL } from "../lib/version";
import { BrandHero } from "../components/BrandHero";

const REVIEW_AFTER_EMAILS = 50;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Republishing here keeps the storefront in sync after plan changes
  // (e.g. returning from the billing approval screen).
  const { plan, billing } = await publishConfig(admin, shop);
  const popups = await db.popup.findMany({ where: { shop }, orderBy: { createdAt: "asc" } });
  const live = new Set(billing.paused ? [] : livePopups(popups).map((p) => p.id));
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [{ byPopup }, revenue, lastView] = await Promise.all([
    getCounts(shop, since),
    getRevenue(shop, since),
    // The app embed works if the storefront reported a view recently.
    db.event.findFirst({ where: { shop, type: "view" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  // Ask for a review once the popup has brought the first order, or (stores
  // with little traffic) collected its first 50 emails.
  const [orders, state] = await Promise.all([
    db.attributedOrder.count({ where: { shop } }),
    db.shopState.findUnique({ where: { shop } }),
  ]);
  const emails = orders === 0 ? await db.event.count({ where: { shop, type: "submit" } }) : 0;
  const goodMoment = orders > 0 || emails >= REVIEW_AFTER_EMAILS;

  return {
    plan,
    billing,
    showPlans: billingEnabled(),
    apiKey: process.env.SHOPIFY_API_KEY || "",
    sales: { amount: revenue.amount, currency: revenue.currency, usd: revenue.usd },
    lastSeen: lastView?.createdAt.toISOString() ?? null,
    review: {
      ask: goodMoment && !state?.reviewAskedAt,
      banner: goodMoment && !state?.reviewHidden,
      emails: orders > 0 ? 0 : emails,
    },
    popups: popups.map((p) => ({
      id: p.id,
      name: p.name,
      ab: p.abEnabled,
      active: p.active,
      live: live.has(p.id),
      discountCode: p.codeMode === "unique" ? "Unique per winner" : p.discountCode,
      target: p.target,
      counts: byPopup[p.id] ?? { view: 0, submit: 0, play: 0, win: 0 },
      sales: revenue.byPopup[p.id] ?? { amount: 0, orders: 0 },
      primaryColor: p.primaryColor,
      accentColor: p.accentColor,
      gameType: p.gameType,
    })),
    guideHidden: !!state?.guideHidden,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");
  const id = String(form.get("id"));

  if (intent === "guide") {
    await db.shopState.upsert({ where: { shop }, create: { shop, guideHidden: true }, update: { guideHidden: true } });
    return { ok: true, message: "" };
  }

  if (intent === "review") {
    // done: Shopify's review modal was answered (or can't be shown to this merchant);
    // hide: the merchant reviewed or hid the banner.
    const data = {
      ...(form.get("done") ? { reviewAskedAt: new Date() } : {}),
      ...(form.get("hide") ? { reviewHidden: true } : {}),
    };
    await db.shopState.upsert({ where: { shop }, create: { shop, ...data }, update: data });
    return { ok: true, message: "" };
  }

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
    return { ok: true, message: activate ? "Popup published" : "Popup paused" };
  }

  return { ok: false, message: "Unknown action" };
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const rate = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");
const targetLabel = (v: string) => TARGETS.find((t) => t.value === v)?.label ?? v;
const EMBED_HINT_KEY = "gd_embed_hint_dismissed";

export default function Index() {
  const { popups, plan, billing, apiKey, showPlans, review, sales, lastSeen, guideHidden } = useLoaderData<typeof loader>();
  // Revenue in the store's currency; plan limits stay in USD.
  const money = (n: number) =>
    sales.currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: sales.currency, maximumFractionDigits: 0 }).format(n)
      : usd(n);
  const revenueNow = sales.currency ? sales.amount : sales.usd;
  const seenDaysAgo = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) / 86_400_000 : null;
  // Setup guide until everything is done or the merchant hides it.
  const [guideOff, setGuideOff] = useState(guideHidden);
  const first = popups[0];
  const colors = { primary: first?.primaryColor ?? DEFAULT_PRIMARY, accent: first?.accentColor ?? DEFAULT_ACCENT };
  const allDone = popups.length > 0 && popups.some((p) => p.active) && lastSeen !== null &&
    popups.some((p) => p.primaryColor !== DEFAULT_PRIMARY || p.accentColor !== DEFAULT_ACCENT);
  const showGuide = !guideOff && !allDone;
  const totals = popups.reduce(
    (t, p) => ({ view: t.view + p.counts.view, submit: t.submit + p.counts.submit, win: t.win + p.counts.win }),
    { view: 0, submit: 0, win: 0 },
  );
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

  // Shopify's own review modal, shown a moment after the page opens. Shopify
  // rate-limits it; codes that may pass later (app just installed, mobile app,
  // another modal open) leave it to be tried on the next visit.
  const reviewFetcher = useFetcher();
  const [reviewBanner, setReviewBanner] = useState(review.banner);
  const saveReview = (data: Record<string, string>) =>
    reviewFetcher.submit({ intent: "review", ...data }, { method: "POST" });
  useEffect(() => {
    if (!review.ask) return;
    const timer = setTimeout(async () => {
      try {
        const res = await shopify.reviews.request();
        if (["recently-installed", "mobile-app", "already-open", "open-in-progress"].includes(res.code)) return;
        const reviewed = res.success || res.code === "already-reviewed";
        if (reviewed) setReviewBanner(false);
        saveReview(reviewed ? { done: "1", hide: "1" } : { done: "1" });
      } catch {
        /* older admin without the reviews API: the banner still works */
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.ask]);
  const hideReviewBanner = () => {
    setReviewBanner(false);
    saveReview({ hide: "1" });
  };

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
        <BrandHero
          title="Turn visitors into buyers"
          subtitle="Visitors play a quick game, leave their email and win a discount. Here's how your popups did in the last 30 days."
          stats={[
            { label: "Popup views", value: totals.view.toLocaleString() },
            { label: "Emails collected", value: totals.submit.toLocaleString() },
            { label: "Wins", value: totals.win.toLocaleString() },
            { label: "Revenue from popup", value: money(revenueNow) },
          ]}
          footer={
            showPlans && <>
              Plan: <b>{PLAN_LABELS[plan]}</b> ·{" "}
              {Number.isFinite(billing.cap)
                ? `${usd(billing.revenueUsd)} of ${usd(billing.cap)} included (plan limits in USD)`
                : "unlimited popup revenue"}{" "}
              · <RemixLink to="/app/plans">See plans</RemixLink>
            </>
          }
        />
        {showGuide && (
          <SetupGuide
            onHide={() => {
              setGuideOff(true);
              fetcher.submit({ intent: "guide", id: "" }, { method: "POST" });
            }}
            steps={[
              {
                title: "Create your popup",
                text: "Pick a game and the discount visitors can win. It takes about 2 minutes.",
                done: popups.length > 0,
                action: first ? { label: "Open your popup", onAction: () => navigate(`/app/popups/${first.id}`) } : { label: "Create popup", onAction: () => navigate("/app/popups/new") },
                picture: <GameThumb game={(first?.gameType as GameType) ?? "wheel"} primary={colors.primary} accent={colors.accent} />,
              },
              {
                title: "Match your store colors",
                text: "In your popup, open Design and click “Use my store colors”. The popup then looks like part of your store.",
                done: popups.some((p) => p.primaryColor !== DEFAULT_PRIMARY || p.accentColor !== DEFAULT_ACCENT),
                action: { label: "Open Design", onAction: () => navigate(first ? `/app/popups/${first.id}` : "/app/popups/new") },
                picture: <ColorsPicture primary={colors.primary} accent={colors.accent} />,
              },
              {
                title: "Publish it",
                text: "Check it with “Preview on store”, then click Publish. Until then only you can see it.",
                done: popups.some((p) => p.active),
                action: { label: "Open your popup", onAction: () => navigate(first ? `/app/popups/${first.id}` : "/app/popups/new") },
                picture: <PublishPicture />,
              },
              {
                title: "Switch it on in your theme",
                text: "In the theme editor, open App embeds, switch on “Kodra Play popup” and click Save. This step turns green once a visitor has seen the popup.",
                done: lastSeen !== null,
                action: { label: "Open theme editor", url: embedUrl, external: true },
                picture: <EmbedPicture />,
              },
            ]}
          />
        )}
        {billing.overLimit && (
          <Banner
            tone={billing.paused ? "critical" : "warning"}
            title={
              billing.paused
                ? "Your popup is paused"
                : `Kodra Play made you ${money(revenueNow)} in the last 30 days 🎉`
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
        {reviewBanner && (
          <Banner
            title={review.emails ? `Your popup collected ${review.emails} emails 🎉` : "Your popup brought its first order 🎉"}
            tone="success"
            action={{ content: "Leave a review", url: `${LISTING_URL}/reviews`, target: "_blank" }}
            secondaryAction={{ content: "Hide", onAction: hideReviewBanner }}
            onDismiss={hideReviewBanner}
          >
            <p>Is Kodra Play working for you? A short review helps other stores find it and keeps the app improving.</p>
          </Banner>
        )}
        {seenDaysAgo !== null && seenDaysAgo <= 7 && popups.some((p) => p.live) && (
          <InlineStack gap="200" blockAlign="center">
            <Badge tone="success">✓ Live on your store</Badge>
            <Text as="span" variant="bodySm" tone="subdued">
              The popup was last shown to a visitor {ago(seenDaysAgo)}.
            </Text>
          </InlineStack>
        )}
        {seenDaysAgo !== null && seenDaysAgo > 7 && popups.some((p) => p.live) && (
          <Banner
            title={`No visitor has seen the popup for ${Math.floor(seenDaysAgo)} days`}
            tone="warning"
            action={{ content: "Check the theme editor", url: embedUrl, target: "_top" }}
          >
            <p>Make sure “Kodra Play popup” is switched on under App embeds in your current theme (a new theme needs it switched on again).</p>
          </Banner>
        )}
        {seenDaysAgo === null && showEmbedHint && !showGuide && (
          <Banner
            title="Step 1: turn on the popup in your theme"
            tone="info"
            action={{ content: "Open theme editor", url: embedUrl, target: "_top" }}
            secondaryAction={{ content: "Done, hide this", onAction: dismissEmbedHint }}
            onDismiss={dismissEmbedHint}
          >
            <p>Switch on “Kodra Play popup” under App embeds and click Save.</p>
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
                { title: "Orders", alignment: "end" },
                { title: "Revenue", alignment: "end" },
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
                    <InlineStack gap="100" wrap={false}>
                      {p.live ? (
                        <Badge tone="success">Live</Badge>
                      ) : p.active ? (
                        <Badge tone="warning">Over plan limit</Badge>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                      {p.ab && p.active && <Badge tone="info">A/B test</Badge>}
                    </InlineStack>
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
                    <Text as="span" alignment="end" numeric>
                      {p.sales.orders}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" alignment="end" numeric>
                      {money(p.sales.amount)}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {/* stopPropagation: these buttons shouldn't open the editor */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <InlineStack gap="200" align="end" wrap={false}>
                        <Button size="slim" onClick={() => submit("toggle", p.id)}>
                          {p.active ? "Pause" : "Publish"}
                        </Button>
                        <RowMenu
                          onEdit={() => navigate(`/app/popups/${p.id}`)}
                          onDelete={() => setToDelete({ id: p.id, name: p.name })}
                        />
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
            Last 30 days. % under Emails: of the people who saw the popup. % under Wins: of the people who left an email.
            Collected emails are saved as customers in Shopify (tag “gamediscount”), where your email marketing app picks them up.{" "}
            <Link url="shopify:admin/customers" target="_top">Open customers</Link>
          </Text>
        )}
        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
          Kodra Play v{APP_VERSION}
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

/** "…" menu with the rarely used, destructive actions out of the way. */
function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      activator={<Button size="slim" onClick={() => setOpen((o) => !o)} accessibilityLabel="More actions">…</Button>}
    >
      <ActionList
        onActionAnyItem={() => setOpen(false)}
        items={[
          { content: "Edit", onAction: onEdit },
          { content: "Delete", destructive: true, onAction: onDelete },
        ]}
      />
    </Popover>
  );
}

const ago = (days: number) =>
  days < 1 / 24 ? "less than an hour ago" : days < 1 ? `${Math.round(days * 24)} h ago` : `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"} ago`;

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

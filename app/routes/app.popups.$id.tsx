import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Card,
  Checkbox,
  FormLayout,
  InlineGrid,
  InlineStack,
  Layout,
  Link,
  Page,
  Select,
  Tabs,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  DEFAULT_SETTINGS,
  DEFAULT_STRINGS,
  LANGUAGE_LABELS,
  LANGUAGES,
  STRING_KEYS,
  STRING_LABELS,
  TARGETS,
  parseSettings,
  type Language,
  type PopupSettings,
  type StringKey,
  type ValidationErrors,
} from "../lib/popup-defaults";
import {
  getInstallation,
  publishConfig,
  rowToSettings,
  settingsToRow,
} from "../lib/popups.server";
import { getDiscountUsage } from "../lib/analytics.server";
import { PLAN_LIMITS } from "../lib/plans";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getInstallation(admin);

  if (params.id === "new") {
    return { id: null, settings: DEFAULT_SETTINGS, plan, codeExists: true };
  }
  const row = await db.popup.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!row) throw redirect("/app");

  const usage = row.discountCode ? await getDiscountUsage(admin, row.discountCode) : 0;
  return { id: row.id, settings: rowToSettings(row), plan, codeExists: usage !== null };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const { settings, errors } = parseSettings(await request.json());
  if (Object.keys(errors).length) return { errors };

  const isNew = params.id === "new";
  if (!isNew) {
    const existing = await db.popup.findFirst({ where: { id: params.id, shop } });
    if (!existing) throw redirect("/app");
  }

  const { plan } = await getInstallation(admin);
  if (settings.codeMode === "unique" && !PLAN_LIMITS[plan].uniqueCodes) {
    return {
      errors: {
        codeMode: "Unique codes per winner are a Pro feature. Upgrade or use one shared code.",
      } as ValidationErrors,
    };
  }

  if (settings.active) {
    const otherActive = await db.popup.count({
      where: { shop, active: true, ...(isNew ? {} : { NOT: { id: params.id } }) },
    });
    if (otherActive >= PLAN_LIMITS[plan].activePopups) {
      return {
        errors: {
          active:
            "The Free plan allows 1 active popup. Pause the other popup or upgrade to Pro.",
        } as ValidationErrors,
      };
    }
  }

  const data = settingsToRow(settings);
  const row = isNew
    ? await db.popup.create({ data: { ...data, shop } })
    : await db.popup.update({ where: { id: params.id }, data });

  await publishConfig(admin, shop);
  return redirect(`/app?saved=${encodeURIComponent(row.name)}`);
};

const TABS = [
  { id: "general", content: "General" },
  { id: "game", content: "Game" },
  { id: "design", content: "Design" },
  { id: "texts", content: "Texts (advanced)" },
];

export default function PopupEditor() {
  const { id, settings: initial, plan, codeExists } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors: ValidationErrors = actionData?.errors ?? {};
  const submit = useSubmit();
  const nav = useNavigation();

  const [s, setS] = useState<PopupSettings>(initial);
  const [tab, setTab] = useState(0);
  const [lang, setLang] = useState<Language>("en");
  useEffect(() => setS(initial), [initial]);

  const set = <K extends keyof PopupSettings>(key: K) => (value: PopupSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: "delaySec" | "surviveSec" | "vx" | "vy" | "maxAttempts") =>
    (value: string) => setS((prev) => ({ ...prev, [key]: value as unknown as number }));

  const setString = (key: StringKey, value: string) =>
    setS((prev) => ({
      ...prev,
      strings: { ...prev.strings, [lang]: { ...prev.strings[lang], [key]: value } },
    }));

  const save = () =>
    submit(s as unknown as Record<string, string>, { method: "POST", encType: "application/json" });

  const isPro = plan === "pro";
  const saving = nav.state === "submitting";

  return (
    <Page
      backAction={{ url: "/app" }}
      title={id ? s.name : "New popup"}
      titleMetadata={s.active ? <Badge tone="success">Active</Badge> : <Badge>Paused</Badge>}
      primaryAction={{ content: "Save", onAction: save, loading: saving }}
    >
      <TitleBar title={id ? "Edit popup" : "New popup"} />
      <Layout>
        {Object.keys(errors).length > 0 && (
          <Layout.Section>
            <Banner tone="critical" title="Please fix the highlighted fields">
              <ul>
                {Object.values(errors).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card>
            <Tabs tabs={TABS} selected={tab} onSelect={setTab}>
              <Box paddingBlockStart="400">
                {tab === 0 && (
                  <FormLayout>
                    <TextField label="Internal name" value={s.name} onChange={set("name")} autoComplete="off" />
                    <Select
                      label="Discount code type"
                      options={[
                        { label: "One shared code (you create it in Discounts)", value: "static" },
                        { label: `Unique single-use code per winner${isPro ? "" : " (Pro)"}`, value: "unique" },
                      ]}
                      value={s.codeMode}
                      onChange={(v) => set("codeMode")(v as PopupSettings["codeMode"])}
                      error={errors.codeMode}
                      helpText={
                        s.codeMode === "unique"
                          ? "Each winner gets their own code, valid for one order. Shared codes can't leak to coupon sites."
                          : "Every winner sees the same code."
                      }
                    />
                    {s.codeMode === "unique" && !isPro && (
                      <Banner tone="info" action={{ content: "Upgrade to Pro", url: "/app/plans" }}>
                        Unique codes are a Pro feature.
                      </Banner>
                    )}
                    {s.codeMode === "unique" && (
                      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                          <Select
                            label="Discount"
                            options={[
                              { label: "Percentage off order", value: "percentage" },
                              { label: "Fixed amount off order", value: "fixed" },
                            ]}
                            value={s.discountType}
                            onChange={(v) => set("discountType")(v as PopupSettings["discountType"])}
                          />
                          <TextField
                            label={s.discountType === "percentage" ? "Percentage" : "Amount (store currency)"}
                            type="number"
                            min={0}
                            suffix={s.discountType === "percentage" ? "%" : undefined}
                            value={String(s.discountValue)}
                            onChange={(v) => setS((prev) => ({ ...prev, discountValue: v as unknown as number }))}
                            error={errors.discountValue}
                            autoComplete="off"
                          />
                          <TextField
                            label="Code prefix"
                            value={s.codePrefix}
                            onChange={(v) => set("codePrefix")(v.toUpperCase())}
                            error={errors.codePrefix}
                            helpText={`Example: ${s.codePrefix ? `${s.codePrefix}-` : ""}K7M2QX9A`}
                            autoComplete="off"
                          />
                          <TextField
                            label="Code valid for (days)"
                            type="number"
                            min={0}
                            value={String(s.codeExpiryDays)}
                            onChange={(v) => setS((prev) => ({ ...prev, codeExpiryDays: v as unknown as number }))}
                            helpText="0 = never expires. A short window pushes winners to buy now."
                            autoComplete="off"
                          />
                      </InlineGrid>
                    )}
                    <TextField
                      label={s.codeMode === "unique" ? "Fallback shared code (optional)" : "Discount code shown on win"}
                      value={s.discountCode}
                      onChange={(v) => set("discountCode")(v.toUpperCase())}
                      error={errors.discountCode}
                      autoComplete="off"
                      helpText={
                        <>
                          {s.codeMode === "unique"
                            ? "Used only if a unique code can't be created (e.g. Pro lapsed). Create it in "
                            : "Create the code first in "}
                          <Link url="shopify:admin/discounts" target="_top">
                            Discounts
                          </Link>
                          . Codes are only revealed after a win — never in the page source.
                        </>
                      }
                    />
                    {id && initial.discountCode && !codeExists && (
                      <Banner tone="warning">
                        “{initial.discountCode}” doesn’t exist in your Discounts yet — winners will get a code
                        that doesn’t work at checkout.
                      </Banner>
                    )}
                    <Select label="Show on" options={[...TARGETS]} value={s.target} onChange={set("target")} />
                    <Checkbox
                      label="Active"
                      checked={s.active}
                      onChange={set("active")}
                      error={errors.active}
                    />
                    <Checkbox
                      label="Require marketing consent checkbox to play"
                      helpText="Visitors who tick it are subscribed to email marketing. Recommended for GDPR (EU stores)."
                      checked={s.requireConsent}
                      onChange={set("requireConsent")}
                    />
                    <Checkbox
                      label="Auto-apply the code to the visitor’s cart on win"
                      checked={s.autoApply}
                      onChange={set("autoApply")}
                    />
                  </FormLayout>
                )}

                {tab === 1 && (
                  <FormLayout>
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <TextField label="Popup delay (seconds)" type="number" min={0} value={String(s.delaySec)} onChange={setNum("delaySec")} autoComplete="off" />
                      <TextField label="Survive time to win (seconds)" type="number" min={3} value={String(s.surviveSec)} onChange={setNum("surviveSec")} autoComplete="off" />
                    </InlineGrid>
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <TextField label="Ball speed X (vx)" type="number" step={0.1} value={String(s.vx)} onChange={setNum("vx")} error={errors.vx} autoComplete="off" helpText="Pixels per frame at 60 fps." />
                      <TextField label="Ball speed Y (vy)" type="number" step={0.1} value={String(s.vy)} onChange={setNum("vy")} autoComplete="off" helpText="Negative = ball starts moving up." />
                    </InlineGrid>
                    <TextField label="Max attempts" type="number" min={1} value={String(s.maxAttempts)} onChange={setNum("maxAttempts")} autoComplete="off" />
                  </FormLayout>
                )}

                {tab === 2 && (
                  <BlockStack gap="400">
                    {!isPro && (
                      <Banner tone="info" action={{ content: "Upgrade to Pro", url: "/app/plans" }}>
                        Custom colors are a Pro feature. You can pick them now; the storefront uses the
                        default colors until you upgrade.
                      </Banner>
                    )}
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <ColorField label="Primary color (background)" value={s.primaryColor} onChange={set("primaryColor")} error={errors.primaryColor} />
                      <ColorField label="Accent color (buttons, code)" value={s.accentColor} onChange={set("accentColor")} error={errors.accentColor} />
                    </InlineGrid>
                    <Preview settings={s} branding={!isPro} />
                  </BlockStack>
                )}

                {tab === 3 && (
                  <BlockStack gap="400">
                    <Text as="p" tone="subdued">
                      Language is detected from the storefront (&lt;html lang&gt;). Leave a field empty to
                      use the default text shown as placeholder.
                    </Text>
                    <Select
                      label="Language"
                      options={LANGUAGES.map((l) => ({ label: LANGUAGE_LABELS[l], value: l }))}
                      value={lang}
                      onChange={(v) => setLang(v as Language)}
                    />
                    <FormLayout>
                      {STRING_KEYS.map((key) => (
                        <TextField
                          key={`${lang}-${key}`}
                          label={STRING_LABELS[key]}
                          value={s.strings[lang]?.[key] ?? ""}
                          placeholder={DEFAULT_STRINGS[lang][key]}
                          onChange={(v) => setString(key, v)}
                          autoComplete="off"
                        />
                      ))}
                    </FormLayout>
                  </BlockStack>
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <InlineStack gap="200" blockAlign="end" wrap={false}>
      <input
        type="color"
        aria-label={label}
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 44, height: 36, border: "none", padding: 0, background: "none", cursor: "pointer" }}
      />
      <div style={{ flex: 1 }}>
        <TextField label={label} value={value} onChange={onChange} error={error} autoComplete="off" />
      </div>
    </InlineStack>
  );
}

function Preview({ settings: s, branding }: { settings: PopupSettings; branding: boolean }) {
  const t = { ...DEFAULT_STRINGS.en, ...s.strings.en };
  return (
    <BlockStack gap="200">
      <Text as="h3" variant="headingSm">
        Preview
      </Text>
      <div style={{ background: "rgba(17,21,28,0.85)", padding: 24, borderRadius: 12 }}>
        <div
          style={{
            background: `linear-gradient(180deg, ${s.primaryColor}, color-mix(in srgb, ${s.primaryColor} 75%, #000))`,
            color: "#f5eeea",
            borderRadius: 16,
            padding: 28,
            maxWidth: 360,
            margin: "0 auto",
            textAlign: "center",
            fontFamily: "Georgia, serif",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>{t.introTitle}</div>
          <div style={{ color: s.accentColor, fontSize: 14, marginBottom: 20 }}>
            {t.introDesc.replace("{seconds}", String(s.surviveSec))}
          </div>
          <div
            style={{
              background: s.accentColor,
              color: "#11151c",
              fontWeight: 700,
              padding: 12,
              borderRadius: 8,
            }}
          >
            {t.startBtn}
          </div>
          {branding && (
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 14 }}>Powered by GameDiscount</div>
          )}
        </div>
      </div>
    </BlockStack>
  );
}

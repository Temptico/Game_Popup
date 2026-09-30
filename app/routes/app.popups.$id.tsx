import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Banner,
  Button,
  BlockStack,
  Box,
  Card,
  Checkbox,
  DataTable,
  FormLayout,
  InlineGrid,
  InlineStack,
  Layout,
  Link,
  Page,
  RangeSlider,
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
  SIZE_LIMITS,
  abFromSettings,
  applyVariantB,
  type AbVariant,
  LANGUAGE_LABELS,
  LANGUAGES,
  STRING_KEYS,
  STRING_LABELS,
  GAMES,
  TARGETS,
  TRIGGERS,
  FREQUENCIES,
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
import { getAbResults, getDiscountUsage } from "../lib/analytics.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getInstallation(admin);

  if (params.id === "new") {
    return { id: null, settings: DEFAULT_SETTINGS, plan, codeExists: true, abResults: null };
  }
  const row = await db.popup.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!row) throw redirect("/app");

  const [usage, abResults] = await Promise.all([
    row.discountCode ? getDiscountUsage(admin, row.discountCode) : 0,
    row.abStartedAt ? getAbResults(row.id, row.abStartedAt) : null,
  ]);
  return { id: row.id, settings: rowToSettings(row), plan, codeExists: usage !== null, abResults };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  // Plain Remix redirect on purpose: for these fetch requests Shopify's
  // `redirect` helper answers 401 + reauthorize header, which makes the admin
  // reload the iframe without shop/host and shows the login page.
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const { settings, errors } = parseSettings(await request.json());
  if (Object.keys(errors).length) return { errors };

  const isNew = params.id === "new";
  const existing = isNew ? null : await db.popup.findFirst({ where: { id: params.id, shop } });
  if (!isNew && !existing) throw redirect("/app");

  // Switching an A/B test on (re)starts its results.
  const abStart = settings.abEnabled && !existing?.abEnabled ? { abStartedAt: new Date() } : {};
  const data = { ...settingsToRow(settings), ...abStart };
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
  { id: "ab", content: "A/B test" },
];

export default function PopupEditor() {
  const { id, settings: initial, plan, codeExists, abResults } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors: ValidationErrors = actionData?.errors ?? {};
  const submit = useSubmit();
  const nav = useNavigation();
  const navigate = useNavigate();

  const [s, setS] = useState<PopupSettings>(initial);
  const [tab, setTab] = useState(0);
  const [lang, setLang] = useState<Language>("en");
  useEffect(() => setS(initial), [initial]);

  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
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

  const branded = plan === "free";
  const saving = nav.state === "submitting";

  return (
    <Page>
      <TitleBar title={id ? s.name : "New popup"}>
        <button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={() => navigate("/app")}>Cancel</button>
      </TitleBar>
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
                        { label: "Unique single-use code per winner", value: "unique" },
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
                            disabled={s.tiered}
                            helpText={s.tiered ? "Set per attempt below." : undefined}
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
                            disabled={s.urgencyMinutes > 0}
                            helpText={s.urgencyMinutes > 0 ? "Overridden by the urgency countdown below." : "0 = never expires. A short window pushes winners to buy now."}
                            autoComplete="off"
                          />
                      </InlineGrid>
                    )}
                    {s.codeMode === "unique" && (
                      <BlockStack gap="300">
                        <Checkbox
                          label="Reward by attempt: better discount for winning on the first try"
                          checked={s.tiered}
                          onChange={set("tiered")}
                          helpText="Replaces the single value above. Makes replays more exciting."
                        />
                        {s.tiered && (
                          <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                            {(["1st attempt", "2nd attempt", "3rd attempt or later"] as const).map((label, i) => (
                              <TextField
                                key={label}
                                label={`Won on ${label}`}
                                type="number"
                                min={0}
                                suffix={s.discountType === "percentage" ? "%" : undefined}
                                value={String(s.tierValues[i])}
                                onChange={(v) =>
                                  setS((prev) => {
                                    const next = [...prev.tierValues] as PopupSettings["tierValues"];
                                    next[i] = v as unknown as number;
                                    return { ...prev, tierValues: next };
                                  })
                                }
                                error={i === 0 ? errors.tierValues : undefined}
                                autoComplete="off"
                              />
                            ))}
                          </InlineGrid>
                        )}
                        <TextField
                          label="Urgency countdown (minutes)"
                          type="number"
                          min={0}
                          value={String(s.urgencyMinutes)}
                          onChange={(v) => setS((prev) => ({ ...prev, urgencyMinutes: v as unknown as number }))}
                          helpText="0 = off. When set, each winner's code really expires after this many minutes and a live countdown is shown. (A fake countdown would be misleading under EU consumer law, so it's always real.)"
                          autoComplete="off"
                        />
                      </BlockStack>
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
                            ? "Used only if a unique code can't be created (e.g. a temporary Shopify error). Create it in "
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
                    <Select
                      label="Game"
                      options={[...GAMES]}
                      value={s.gameType}
                      onChange={(v) => set("gameType")(v as PopupSettings["gameType"])}
                      error={errors.gameType}
                      helpText={
                        s.gameType === "flipper"
                          ? "Keep the ball in play with two flippers (tap left/right side or arrow keys)."
                          : "Keep the ball bouncing with a paddle (mouse, finger or arrow keys)."
                      }
                    />
                    <Select
                      label="When to show the popup"
                      options={[...TRIGGERS]}
                      value={s.trigger}
                      onChange={(v) => set("trigger")(v as PopupSettings["trigger"])}
                    />
                    <Select
                      label="How often to show it automatically"
                      options={[...FREQUENCIES]}
                      value={s.frequency}
                      onChange={(v) => set("frequency")(v as PopupSettings["frequency"])}
                      helpText="Counted per visitor. After a win the popup never opens by itself again; the floating button stays available."
                    />
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <TextField label="Popup delay (seconds)" type="number" min={0} value={String(s.delaySec)} onChange={setNum("delaySec")} autoComplete="off" disabled={s.trigger === "exit"} helpText={s.trigger === "exit" ? "Used only on mobile." : undefined} />
                      <TextField label="Survive time to win (seconds)" type="number" min={3} value={String(s.surviveSec)} onChange={setNum("surviveSec")} autoComplete="off" />
                    </InlineGrid>
                    {s.gameType === "paddle" && (
                      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                        <TextField label="Ball speed X (vx)" type="number" step={0.1} value={String(s.vx)} onChange={setNum("vx")} error={errors.vx} autoComplete="off" helpText="Pixels per frame at 60 fps." />
                        <TextField label="Ball speed Y (vy)" type="number" step={0.1} value={String(s.vy)} onChange={setNum("vy")} autoComplete="off" helpText="Negative = ball starts moving up." />
                      </InlineGrid>
                    )}
                    <TextField label="Max attempts" type="number" min={1} value={String(s.maxAttempts)} onChange={setNum("maxAttempts")} autoComplete="off" />
                    <Checkbox
                      label="Show a floating “Play for a discount” button after the popup is closed"
                      helpText="Visitors who close the popup too early can come back to it. After a win it reminds them of their code."
                      checked={s.teaser}
                      onChange={set("teaser")}
                    />
                  </FormLayout>
                )}

                {tab === 2 && (
                  <BlockStack gap="400">
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <ColorField label="Primary color (background)" value={s.primaryColor} onChange={set("primaryColor")} error={errors.primaryColor} />
                      <ColorField label="Accent color (buttons, code)" value={s.accentColor} onChange={set("accentColor")} error={errors.accentColor} />
                    </InlineGrid>
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <RangeSlider
                        label="Popup size on desktop"
                        min={SIZE_LIMITS.desktop.min}
                        max={SIZE_LIMITS.desktop.max}
                        step={5}
                        value={s.sizeDesktop}
                        onChange={(v) => { set("sizeDesktop")(Number(v)); setDevice("desktop"); }}
                        output
                        suffix={<Text as="span" variant="bodyMd">{s.sizeDesktop}%</Text>}
                        helpText={`${SIZE_LIMITS.desktop.min}–${SIZE_LIMITS.desktop.max}% of the standard size`}
                      />
                      <RangeSlider
                        label="Popup size on phones"
                        min={SIZE_LIMITS.mobile.min}
                        max={SIZE_LIMITS.mobile.max}
                        step={5}
                        value={s.sizeMobile}
                        onChange={(v) => { set("sizeMobile")(Number(v)); setDevice("phone"); }}
                        output
                        suffix={<Text as="span" variant="bodyMd">{s.sizeMobile}%</Text>}
                        helpText={`${SIZE_LIMITS.mobile.min}–${SIZE_LIMITS.mobile.max}% of the standard size`}
                      />
                    </InlineGrid>
                    <InlineStack gap="200">
                      <Button pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop preview</Button>
                      <Button pressed={device === "phone"} onClick={() => setDevice("phone")}>Phone preview</Button>
                    </InlineStack>
                    <Preview settings={s} branding={branded} device={device} />
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

                {tab === 4 && (
                  <AbTab
                    s={s}
                    setS={setS}
                    results={abResults}
                    lang={lang}
                    setLang={setLang}
                    saving={saving}
                    onSaveNow={(next) =>
                      submit(next as unknown as Record<string, string>, { method: "POST", encType: "application/json" })
                    }
                  />
                )}
              </Box>
            </Tabs>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <InlineStack align="end" gap="200">
            <Button onClick={() => navigate("/app")}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Save
            </Button>
          </InlineStack>
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

function Preview({ settings: s, branding, device }: { settings: PopupSettings; branding: boolean; device: "desktop" | "phone" }) {
  const t = { ...DEFAULT_STRINGS.en, ...s.strings.en };
  const phone = device === "phone";
  const scale = (phone ? s.sizeMobile : s.sizeDesktop) / 100;
  return (
    <BlockStack gap="200">
      <Text as="h3" variant="headingSm">
        Preview
      </Text>
      {/* Same geometry as the storefront: standard card 420px (desktop) or the screen width (phone), scaled. */}
      <div
        style={{
          background: "rgba(17,21,28,0.85)",
          padding: phone ? "40px 16px" : "40px 24px",
          borderRadius: phone ? 28 : 12,
          width: phone ? 360 : "100%",
          maxWidth: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
            width: "100%",
            maxWidth: `min(${phone ? "100%" : "420px"}, ${100 / Math.max(scale, 1)}%)`,
            background: `linear-gradient(180deg, ${s.primaryColor}, color-mix(in srgb, ${s.primaryColor} 75%, #000))`,
            color: "#f5eeea",
            borderRadius: 16,
            padding: 28,
            boxSizing: "border-box",
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
            <div title="Enigma Play icon (free plan)" style={{ fontSize: 16, opacity: 0.55, marginTop: 14 }}>🎮</div>
          )}
        </div>
      </div>
    </BlockStack>
  );
}

type AbResults = NonNullable<ReturnType<typeof useLoaderData<typeof loader>>["abResults"]>;

function AbTab({
  s,
  setS,
  results,
  lang,
  setLang,
  saving,
  onSaveNow,
}: {
  s: PopupSettings;
  setS: React.Dispatch<React.SetStateAction<PopupSettings>>;
  results: AbResults | null;
  lang: Language;
  setLang: (l: Language) => void;
  saving: boolean;
  onSaveNow: (next: PopupSettings) => void;
}) {
  const b = s.ab;
  const setB = <K extends keyof AbVariant>(key: K, value: AbVariant[K]) =>
    setS((prev) => ({ ...prev, ab: { ...prev.ab, [key]: value } }));
  const setBString = (key: "introTitle" | "introDesc", value: string) =>
    setS((prev) => ({
      ...prev,
      ab: { ...prev.ab, strings: { ...prev.ab.strings, [lang]: { ...prev.ab.strings[lang], [key]: value } } },
    }));
  const aText = { ...DEFAULT_STRINGS[lang], ...s.strings[lang] };
  const unit = s.discountType === "percentage" ? "%" : "";

  return (
    <BlockStack gap="400">
      <Checkbox
        label="Run an A/B test: half of the visitors see variant B"
        helpText="Each visitor always sees the same variant. Variant A is the popup as set up in the other tabs."
        checked={s.abEnabled}
        onChange={(on) =>
          setS((prev) => ({ ...prev, abEnabled: on, ab: on && !prev.abEnabled ? { ...abFromSettings(prev), strings: prev.ab.strings } : prev.ab }))
        }
      />

      {s.abEnabled && (
        <Card background="bg-surface-secondary">
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">Variant B: change what you want to test</Text>
            <Text as="p" tone="subdued">
              Change one thing at a time to learn what works (for example only the discount). Saving restarts nothing;
              switching the test off and on again starts new results.
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
              <Select label="Game" options={GAMES.map((g) => ({ ...g }))} value={b.gameType}
                onChange={(v) => setB("gameType", v as AbVariant["gameType"])} />
              <Select label="When it opens" options={TRIGGERS.map((t) => ({ ...t }))} value={b.trigger}
                onChange={(v) => setB("trigger", v as AbVariant["trigger"])} />
              <TextField label="Delay (seconds)" type="number" autoComplete="off" value={String(b.delaySec)}
                onChange={(v) => setB("delaySec", Number(v))} />
            </InlineGrid>

            {s.codeMode === "unique" && !s.tiered && (
              <TextField label={`Discount for B (A: ${s.discountValue}${unit})`} type="number" autoComplete="off"
                suffix={unit} value={String(b.discountValue)} onChange={(v) => setB("discountValue", Number(v))} />
            )}
            {s.codeMode === "unique" && s.tiered && (
              <InlineGrid columns={3} gap="400">
                {(["1st", "2nd", "3rd+"] as const).map((label, i) => (
                  <TextField key={label} label={`B: won on ${label} attempt (A: ${s.tierValues[i]}${unit})`} type="number"
                    autoComplete="off" suffix={unit} value={String(b.tierValues[i])}
                    onChange={(v) => {
                      const next = [...b.tierValues] as AbVariant["tierValues"];
                      next[i] = Number(v);
                      setB("tierValues", next);
                    }} />
                ))}
              </InlineGrid>
            )}
            {s.codeMode === "static" && (
              <TextField label="Discount code for B (optional)" autoComplete="off" value={b.discountCode}
                onChange={(v) => setB("discountCode", v.toUpperCase())}
                helpText={`Create a second code in Discounts to test a different discount (A uses ${s.discountCode || "its code"}). Empty = same code as A; orders then can't be split by variant.`} />
            )}

            <Select label="Texts for language"
              options={LANGUAGES.map((l) => ({ label: LANGUAGE_LABELS[l], value: l }))}
              value={lang} onChange={(v) => setLang(v as Language)}
              helpText="Set B's texts for every language your store uses. Empty = same text as A." />
            <TextField label="Headline for B" autoComplete="off" value={b.strings[lang]?.introTitle ?? ""}
              placeholder={aText.introTitle} onChange={(v) => setBString("introTitle", v)} />
            <TextField label="Description for B" autoComplete="off" value={b.strings[lang]?.introDesc ?? ""}
              placeholder={aText.introDesc} onChange={(v) => setBString("introDesc", v)} />
          </BlockStack>
        </Card>
      )}

      {results && <AbReport results={results} running={s.abEnabled} saving={saving}
        onKeepA={() => onSaveNow({ ...s, abEnabled: false })}
        onUseB={() => onSaveNow(applyVariantB(s))} />}
    </BlockStack>
  );
}

function AbReport({ results: r, running, saving, onKeepA, onUseB }: {
  results: AbResults; running: boolean; saving: boolean; onKeepA: () => void; onUseB: () => void;
}) {
  const pct = (x: number, n: number) => (n ? `${((x / n) * 100).toFixed(1)}%` : "–");
  const money = (n: number) =>
    r.currency
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: r.currency, maximumFractionDigits: 0 }).format(n)
      : Math.round(n).toLocaleString();
  const row = (label: string, a: typeof r.a) => [
    label,
    a.views.toLocaleString(),
    `${a.submits.toLocaleString()} (${pct(a.submits, a.views)})`,
    `${a.wins.toLocaleString()} (${pct(a.wins, a.submits)})`,
    a.orders.toLocaleString(),
    money(a.revenue),
    a.views ? money((a.revenue / a.views) * 1000) : "–",
  ];
  const conf = Math.round(r.confidence * 100);
  const winner = r.leader === "b" ? "B" : "A";
  const verdict = !r.enoughData
    ? { tone: "info" as const, title: "Not enough data yet",
        text: "Each variant needs at least 100 views and together 20 sign-ups before the result means anything. Keep the test running." }
    : r.confidence >= 0.95 && r.leader
      ? { tone: "success" as const, title: `Variant ${winner} wins (${conf}% confidence)`,
          text: `${winner} collects more emails per view, and the difference is very unlikely to be chance.` }
      : { tone: "warning" as const, title: `No clear winner yet (${conf}% confidence)`,
          text: "The difference could still be chance. Keep the test running until confidence reaches 95%." };

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">
          Results since {new Date(r.startedAt).toLocaleDateString()}{running ? "" : " (test stopped)"}
        </Text>
        <Banner tone={verdict.tone} title={verdict.title}><p>{verdict.text}</p></Banner>
        <DataTable
          columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "numeric", "numeric"]}
          headings={["Variant", "Views", "Emails", "Wins", "Orders", "Revenue", "Revenue / 1,000 views"]}
          rows={[row("A", r.a), row("B", r.b)]}
        />
        <Text as="p" tone="subdued" variant="bodySm">
          The winner is decided by emails per view. Orders and revenue are shown for context: they need far more traffic to compare reliably.
        </Text>
        {running && (
          <InlineStack gap="200">
            <Button onClick={onKeepA} loading={saving}>Stop test and keep A</Button>
            <Button variant="primary" onClick={onUseB} loading={saving}>Stop test and use B</Button>
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}

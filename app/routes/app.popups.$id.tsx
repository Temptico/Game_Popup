import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useFetcher, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import {
  Badge,
  Banner,
  Button,
  ButtonGroup,
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
import { SaveBar, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  DEFAULT_SETTINGS,
  DEFAULT_STRINGS,
  SIZE_LIMITS,
  BALL_SPEEDS,
  NAME_FIELDS,
  ballSpeedOf,
  DIFFICULTIES,
  abFromSettings,
  applyVariantB,
  type AbVariant,
  LANGUAGE_LABELS,
  LANGUAGES,
  STRING_LABELS,
  GAMES,
  GAME_TEXTS,
  SKILL_GAMES,
  textFieldsFor,
  type GameType,
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
import { previewFeatures } from "../lib/billing.server";
import type { BrandColorsResult } from "../lib/brand-colors.server";
import { GamePicker, GameThumb } from "../components/GamePicker";
import { WheelEditor } from "../components/WheelEditor";

const ALL_GAMES = GAMES.map((g) => g.value);
const EMAIL_TIMING = [
  { label: "Before the game (default)", value: "before" },
  { label: "After a win, to unlock the code", value: "after" },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getInstallation(admin);

  if (params.id === "new") {
    return { id: null, settings: DEFAULT_SETTINGS, plan, codeExists: true, abResults: null, preview: previewFeatures(), shop: session.shop };
  }
  const row = await db.popup.findFirst({ where: { id: params.id, shop: session.shop } });
  if (!row) throw redirect("/app");

  const [usage, abResults] = await Promise.all([
    row.discountCode ? getDiscountUsage(admin, row.discountCode) : 0,
    row.abStartedAt ? getAbResults(row.id, row.abStartedAt) : null,
  ]);
  return { id: row.id, settings: rowToSettings(row), plan, codeExists: usage !== null, abResults, preview: previewFeatures(), shop: session.shop };
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
  // A new draft opens in the editor, where it can be previewed on the store.
  if (isNew && !row.active) return redirect(`/app/popups/${row.id}`);
  return redirect(`/app?saved=${encodeURIComponent(row.name)}`);
};

// The second tab follows the game: settings and rewards for skill games, the
// wheel's rewards, or just the discount for the form-only popup.
const tabsFor = (game: GameType) => [
  { id: "general", content: "General" },
  {
    id: "game",
    content: SKILL_GAMES.includes(game) ? "Game & rewards" : game === "wheel" ? "Wheel & rewards" : "Reward",
  },
  { id: "design", content: "Design" },
  { id: "texts", content: "Texts" },
  { id: "ab", content: "A/B test" },
];

// New popup, step by step: each step shows one of the editor's sections (tab index).
const WIZARD_STEPS: { title: string; section?: number }[] = [
  { title: "Choose a game" },
  { title: "Set the discount", section: 1 },
  { title: "Match your store", section: 2 },
  { title: "When and where it shows", section: 0 },
  { title: "Check and publish" },
];

export default function PopupEditor() {
  const { id, settings: initial, plan, codeExists, abResults, preview, shop } = useLoaderData<typeof loader>();
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

  // "Use my store colors": fills both color fields from the shop's theme.
  const shopify = useAppBridge();
  const brand = useFetcher<BrandColorsResult>();
  useEffect(() => {
    const r = brand.data;
    if (!r || brand.state !== "idle") return;
    if (r.ok) {
      setS((prev) => ({ ...prev, primaryColor: r.primaryColor, accentColor: r.accentColor }));
      shopify.toast.show(r.source === "brand" ? "Colors taken from your brand settings" : "Colors taken from your theme. Adjust if needed.");
    } else {
      shopify.toast.show(
        r.reason === "password"
          ? "Your store is password protected, so its colors can't be read. Set them by hand."
          : "Couldn't find your store's colors. Set them by hand.",
        { isError: true },
      );
    }
  }, [brand.data, brand.state, shopify]);
  const set = <K extends keyof PopupSettings>(key: K) => (value: PopupSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: "delaySec" | "surviveSec" | "vx" | "vy" | "maxAttempts") =>
    (value: string) => setS((prev) => ({ ...prev, [key]: value as unknown as number }));

  const setString = (key: StringKey, value: string) =>
    setS((prev) => ({
      ...prev,
      strings: { ...prev.strings, [lang]: { ...prev.strings[lang], [key]: value } },
    }));

  const save = (over: Partial<PopupSettings> = {}) =>
    submit({ ...s, ...over } as unknown as Record<string, string>, { method: "POST", encType: "application/json" });
  // New popups are set up step by step; saved ones are edited in tabs with the save bar.
  const wizard = !id;
  const [step, setStep] = useState(0);
  const at = (section: number) => (wizard ? WIZARD_STEPS[step].section === section : tab === section);
  const dirty = !wizard && JSON.stringify(s) !== JSON.stringify(initial);
  const previewUrl = `https://${shop}/?gd_preview=${id}`;

  const branded = plan === "free";
  const saving = nav.state === "submitting";
  const skill = SKILL_GAMES.includes(s.gameType);
  const unit = s.discountType === "percentage" ? "%" : "";

  const sections = (
    <>
            {at(0) && (
              <FormLayout>
                <TextField label="Name (only you see it)" value={s.name} onChange={set("name")} autoComplete="off" />
                <Select label="Show it on" options={[...TARGETS]} value={s.target} onChange={set("target")} />
                <Select
                  label="When it opens"
                  options={[...TRIGGERS]}
                  value={s.trigger}
                  onChange={(v) => set("trigger")(v as PopupSettings["trigger"])}
                />
                <Select
                  label="How often it opens by itself"
                  options={[...FREQUENCIES]}
                  value={s.frequency}
                  onChange={(v) => set("frequency")(v as PopupSettings["frequency"])}
                  helpText="Per visitor. After someone wins, it doesn't open by itself again."
                />
                <TextField label="Wait before it opens (seconds)" type="number" min={0} value={String(s.delaySec)} onChange={setNum("delaySec")} autoComplete="off" disabled={s.trigger === "exit"} helpText={s.trigger === "exit" ? "Used only on mobile." : undefined} />
                <Checkbox
                  label="Don't show it to people who already have something in the cart"
                  helpText="They're about to buy anyway, so the popup would only interrupt them (and give away a discount)."
                  checked={s.noCart}
                  onChange={set("noCart")}
                />
                <Checkbox
                  label={s.gameType === "none" ? "Show a floating “Get a discount” button after the popup is closed" : "Show a floating “Play for a discount” button after the popup is closed"}
                  helpText="A small button in the corner, so visitors can come back to the game. After a win it shows their code."
                  checked={s.teaser}
                  onChange={set("teaser")}
                />
                {preview && (
                  <Select
                    label="Name field"
                    options={[...NAME_FIELDS]}
                    value={s.nameField}
                    onChange={(v) => set("nameField")(v as PopupSettings["nameField"])}
                    helpText="Fewer fields = more sign-ups. Hidden: visitors only enter their email."
                  />
                )}
                <Checkbox
                  label={s.gameType === "none" ? "Require marketing consent checkbox to get the code" : "Require marketing consent checkbox to play"}
                  helpText="Emails are saved as customers in Shopify. People who tick the box can get your marketing emails. Recommended in the EU."
                  checked={s.requireConsent}
                  onChange={set("requireConsent")}
                />
                <Checkbox
                  label="Double opt-in: people confirm by email (recommended in Germany and Austria)"
                  helpText="Also turn on Shopify Settings → Notifications → Customer marketing confirmation. Visitors still get their code right away."
                  checked={s.doubleOptIn}
                  disabled={!s.requireConsent}
                  onChange={set("doubleOptIn")}
                />
                <Checkbox
                  label="Add the code to the cart automatically"
                  checked={s.autoApply}
                  onChange={set("autoApply")}
                />
              </FormLayout>
            )}

            {at(1) && (
              <BlockStack gap="500">
                {skill && (
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingSm">Game</Text>
                    <FormLayout>
                      {s.gameType === "pong" && (
                        <Select
                          label="Computer level"
                          options={[...DIFFICULTIES]}
                          value={s.difficulty}
                          onChange={(v) => set("difficulty")(v as PopupSettings["difficulty"])}
                          helpText="Medium: most people win within a few tries. Hard: fewer winners."
                        />
                      )}
                      {s.gameType !== "pong" && (
                        <TextField label="Seconds to survive to win" type="number" min={3} value={String(s.surviveSec)} onChange={setNum("surviveSec")} autoComplete="off" />
                      )}
                      {s.gameType === "paddle" && (
                        <Select
                          label="Ball speed"
                          options={[
                            ...BALL_SPEEDS.map(({ label, value }) => ({ label, value })),
                            ...(ballSpeedOf(Number(s.vx), Number(s.vy)) === "custom"
                              ? [{ label: `Custom (${s.vx} / ${s.vy})`, value: "custom" }]
                              : []),
                          ]}
                          value={ballSpeedOf(Number(s.vx), Number(s.vy))}
                          onChange={(v) => {
                            const p = BALL_SPEEDS.find((b) => b.value === v);
                            if (p) setS((prev) => ({ ...prev, vx: p.vx, vy: p.vy }));
                          }}
                          helpText="Slower ball = more winners."
                        />
                      )}
                      <TextField label="Tries per visitor" type="number" min={1} value={String(s.maxAttempts)} onChange={setNum("maxAttempts")} autoComplete="off" />
                      <Select
                        label="When to ask for the email"
                        options={EMAIL_TIMING}
                        value={s.emailAfter ? "after" : "before"}
                        onChange={(v) => set("emailAfter")(v === "after")}
                        helpText="After a win: winners want their code, but people who lose leave no email. Try both with an A/B test."
                      />
                    </FormLayout>
                  </BlockStack>
                )}

                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">{s.gameType === "wheel" ? "Rewards on the wheel" : "Discount"}</Text>
                  <FormLayout>
                    <Select
                      label="Discount code"
                      options={[
                        { label: "The same code for everyone", value: "static" },
                        { label: "A new code for each winner (recommended)", value: "unique" },
                      ]}
                      value={s.codeMode}
                      onChange={(v) => set("codeMode")(v as PopupSettings["codeMode"])}
                      error={errors.codeMode}
                      helpText={
                        s.codeMode === "unique"
                          ? "Each winner gets their own code that works once. It can't be shared on coupon sites."
                          : "Every winner gets the same code. You create it in Discounts."
                      }
                    />
                    {s.gameType === "wheel" && s.codeMode !== "unique" && (
                      <Banner tone="warning">
                        The wheel gives each winner their own code. Choose “A new code for each winner”.
                      </Banner>
                    )}
                    {s.codeMode === "unique" && (
                      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                        <Select
                          label="Discount type"
                          options={[
                            { label: "% off the order", value: "percentage" },
                            { label: "Amount off the order", value: "fixed" },
                          ]}
                          value={s.discountType}
                          onChange={(v) => set("discountType")(v as PopupSettings["discountType"])}
                        />
                        {s.gameType !== "wheel" && (
                          <TextField
                            label={s.discountType === "percentage" ? "Discount (%)" : "Discount (amount)"}
                            type="number"
                            min={0}
                            suffix={unit || undefined}
                            value={String(s.discountValue)}
                            onChange={(v) => setS((prev) => ({ ...prev, discountValue: v as unknown as number }))}
                            error={errors.discountValue}
                            disabled={skill && s.tiered}
                            helpText={skill && s.tiered ? "Set per try below." : undefined}
                            autoComplete="off"
                          />
                        )}
                      </InlineGrid>
                    )}
                    {s.codeMode === "unique" && (
                      <Checkbox
                        label="Show the discount in the title, e.g. “Win up to 20% off”"
                        helpText="More people play when they know what they can win."
                        checked={s.showValue}
                        onChange={set("showValue")}
                      />
                    )}
                    {s.codeMode === "unique" && s.gameType === "wheel" && (
                      <WheelEditor
                        segments={s.wheelSegments}
                        onChange={set("wheelSegments")}
                        unit={unit}
                        primary={s.primaryColor}
                        accent={s.accentColor}
                        error={errors.wheelSegments}
                      />
                    )}
                    {s.codeMode === "unique" && skill && (
                      <BlockStack gap="300">
                        {/* Kept for popups that already use it; not offered to new ones. */}
                        {initial.tiered && (
                          <Checkbox
                            label="Bigger discount for winning on the first try"
                            checked={s.tiered}
                            onChange={set("tiered")}
                          />
                        )}
                        {s.tiered && (
                          <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                            {["Won on 1st attempt", "Won on 2nd attempt", "Won on 3rd attempt or later"].map((label, i) => (
                              <TextField
                                key={label}
                                label={label}
                                type="number"
                                min={0}
                                suffix={unit || undefined}
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
                        <Checkbox
                          label="Give a small discount to players who lose"
                          helpText="Everyone who leaves their email gets a code. Winners still get the bigger discount."
                          checked={s.consolation}
                          onChange={set("consolation")}
                        />
                        {s.consolation && (
                          <TextField
                            label="Discount for players who lose"
                            type="number"
                            min={0}
                            suffix={unit || undefined}
                            value={String(s.consolationValue)}
                            onChange={(v) => setS((prev) => ({ ...prev, consolationValue: v as unknown as number }))}
                            error={errors.consolationValue}
                            autoComplete="off"
                          />
                        )}
                      </BlockStack>
                    )}
                    {s.codeMode === "unique" && (
                      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                        <TextField
                          label="Code starts with"
                          value={s.codePrefix}
                          onChange={(v) => set("codePrefix")(v.toUpperCase())}
                          error={errors.codePrefix}
                          helpText={`Example: ${s.codePrefix ? `${s.codePrefix}-` : ""}K7M2QX9A`}
                          autoComplete="off"
                        />
                        <TextField
                          label="Code works for (days)"
                          type="number"
                          min={0}
                          value={String(s.codeExpiryDays)}
                          onChange={(v) => setS((prev) => ({ ...prev, codeExpiryDays: v as unknown as number }))}
                          disabled={s.urgencyMinutes > 0}
                          helpText={s.urgencyMinutes > 0 ? "The countdown below is used instead." : "0 = no end date. A short time gets people to buy sooner."}
                          autoComplete="off"
                        />
                      </InlineGrid>
                    )}
                    {s.codeMode === "unique" && (
                      <TextField
                        label="Countdown (minutes)"
                        type="number"
                        min={0}
                        value={String(s.urgencyMinutes)}
                        onChange={(v) => setS((prev) => ({ ...prev, urgencyMinutes: v as unknown as number }))}
                        helpText="0 = off. The code stops working after this many minutes, and winners see a timer."
                        autoComplete="off"
                      />
                    )}
                    <TextField
                      label={s.codeMode === "unique" ? "Backup code (optional)" : "Your discount code"}
                      value={s.discountCode}
                      onChange={(v) => set("discountCode")(v.toUpperCase())}
                      error={errors.discountCode}
                      autoComplete="off"
                      helpText={
                        <>
                          {s.codeMode === "unique"
                            ? "Only used if a new code can't be made (rare). Create it in "
                            : "Create it first in "}
                          <Link url="shopify:admin/discounts" target="_top">
                            Discounts
                          </Link>
                          . Visitors only see it after they win.
                        </>
                      }
                    />
                    {id && initial.discountCode && !codeExists && (
                      <Banner tone="warning">
                        “{initial.discountCode}” doesn’t exist in your Discounts yet — winners will get a code
                        that doesn’t work at checkout.
                      </Banner>
                    )}
                  </FormLayout>
                </BlockStack>
              </BlockStack>
            )}

            {at(2) && (
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Button onClick={() => brand.load("/app/brand-colors")} loading={brand.state !== "idle"}>
                    Use my store colors
                  </Button>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Reads your theme and fills both colors. You can still adjust them.
                  </Text>
                </InlineStack>
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                  <ColorField label="Background color" value={s.primaryColor} onChange={set("primaryColor")} error={errors.primaryColor} />
                  <ColorField label="Button color" value={s.accentColor} onChange={set("accentColor")} error={errors.accentColor} />
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

            {at(3) && (
              <BlockStack gap="400">
                <Banner tone="info" title="The popup speaks your customer's language">
                  <p>
                    If your store has several languages, each visitor sees the popup in the language they shop in.
                    All texts are already translated into 10 languages. Change a text only if you want your own
                    wording; empty fields keep the text shown in grey.
                  </p>
                </Banner>
                <Select
                  label="Language"
                  options={LANGUAGES.map((l) => ({ label: LANGUAGE_LABELS[l], value: l }))}
                  value={lang}
                  onChange={(v) => setLang(v as Language)}
                />
                <FormLayout>
                  {textFieldsFor(s.gameType).map(({ key, source }) => (
                    <TextField
                      key={`${lang}-${key}`}
                      label={STRING_LABELS[key]}
                      value={s.strings[lang]?.[key] ?? ""}
                      placeholder={DEFAULT_STRINGS[lang][source]}
                      onChange={(v) => setString(key, v)}
                      autoComplete="off"
                    />
                  ))}
                </FormLayout>
              </BlockStack>
            )}

            {at(4) && (
              <AbTab
                s={s}
                setS={setS}
                results={abResults}
                lang={lang}
                setLang={setLang}
                saving={saving}
                preview={preview}
                onSaveNow={(next) =>
                  submit(next as unknown as Record<string, string>, { method: "POST", encType: "application/json" })
                }
              />
            )}
    </>
  );

  return (
    <Page>
      <TitleBar title={id ? s.name : "New popup"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>Popups</button>
      </TitleBar>
      {!wizard && (
        <SaveBar id="popup-save-bar" open={dirty}>
          <button variant="primary" onClick={() => save()} {...(saving ? { loading: "" } : {})}></button>
          <button onClick={() => setS(initial)}></button>
        </SaveBar>
      )}
      <Layout>
        {Object.keys(errors).length > 0 && (
          <Layout.Section>
            <Banner tone="critical" title="Please fix these first">
              <ul>
                {Object.values(errors).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Banner>
          </Layout.Section>
        )}
        {!wizard && (
          <Layout.Section>
            <Card>
              <InlineStack align="space-between" blockAlign="center" gap="300">
                <InlineStack gap="200" blockAlign="center">
                  {initial.active ? <Badge tone="success">Live</Badge> : <Badge>Draft</Badge>}
                  <Text as="span" tone="subdued">
                    {initial.active ? "Visitors on your store see this popup." : "Not shown to visitors yet. Preview it, then publish."}
                  </Text>
                </InlineStack>
                <InlineStack gap="200">
                  <Button url={previewUrl} target="_blank">Preview on store</Button>
                  <Button variant={initial.active ? "secondary" : "primary"} loading={saving} onClick={() => save({ active: !initial.active })}>
                    {initial.active ? "Pause" : "Publish"}
                  </Button>
                </InlineStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        )}
        {wizard && (
          <Layout.Section>
            <Steps steps={WIZARD_STEPS} current={step} onSelect={setStep} />
          </Layout.Section>
        )}
        {(!wizard || step === 0) && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">{wizard ? "Choose a game" : "Game"}</Text>
                <GamePicker
                  value={s.gameType}
                  onChange={set("gameType")}
                  games={ALL_GAMES}
                  primary={s.primaryColor}
                  accent={s.accentColor}
                />
                {errors.gameType && <Text as="p" tone="critical">{errors.gameType}</Text>}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
        {(!wizard || step > 0) && (
          <Layout.Section>
            <Card>
              {!wizard ? (
                <Tabs tabs={tabsFor(s.gameType)} selected={tab} onSelect={setTab}>
                  <Box paddingBlockStart="400">{sections}</Box>
                </Tabs>
              ) : step === WIZARD_STEPS.length - 1 ? (
                <Summary settings={s} branding={branded} />
              ) : (
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">{WIZARD_STEPS[step].title}</Text>
                  {sections}
                </BlockStack>
              )}
            </Card>
          </Layout.Section>
        )}
        {wizard && (
          <Layout.Section>
            <InlineStack align="space-between">
              <Button onClick={() => (step === 0 ? navigate("/app") : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</Button>
              {step < WIZARD_STEPS.length - 1 ? (
                <Button variant="primary" onClick={() => setStep(step + 1)}>Next</Button>
              ) : (
                <InlineStack gap="200">
                  <Button onClick={() => save({ active: false })} loading={saving}>Save as draft</Button>
                  <Button variant="primary" onClick={() => save({ active: true })} loading={saving}>Publish</Button>
                </InlineStack>
              )}
            </InlineStack>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}

/** The wizard's progress: numbered steps, earlier ones clickable. */
function Steps({ steps, current, onSelect }: { steps: { title: string }[]; current: number; onSelect: (i: number) => void }) {
  return (
    <InlineStack gap="200" wrap>
      {steps.map((st, i) => (
        <button
          key={st.title}
          type="button"
          onClick={() => onSelect(i)}
          disabled={i > current}
          aria-current={i === current ? "step" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px 6px 6px",
            borderRadius: 999,
            border: "1px solid var(--p-color-border)",
            background: i === current ? "var(--p-color-bg-fill-brand)" : "var(--p-color-bg-surface)",
            color: i === current ? "var(--p-color-text-brand-on-bg-fill)" : "inherit",
            cursor: i > current ? "default" : "pointer",
            opacity: i > current ? 0.6 : 1,
            font: "inherit",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              background: i < current ? "var(--p-color-bg-fill-success)" : "rgba(0,0,0,0.08)",
              color: i < current ? "#fff" : "inherit",
            }}
          >
            {i < current ? "✓" : i + 1}
          </span>
          <span style={{ fontWeight: i === current ? 600 : 400 }}>{st.title}</span>
        </button>
      ))}
    </InlineStack>
  );
}

/** Last wizard step: what the popup will do, before saving it. */
function Summary({ settings: s, branding }: { settings: PopupSettings; branding: boolean }) {
  const unit = s.discountType === "percentage" ? "%" : "";
  const discount =
    s.codeMode !== "unique"
      ? `Shared code ${s.discountCode || "(not set)"}`
      : s.gameType === "wheel"
        ? s.wheelSegments.map((x) => `${x.value}${unit} (${x.chance}% chance)`).join(", ")
        : `${s.discountValue}${unit} off, a new code for every winner`;
  const rows: [string, string][] = [
    ["Game", GAMES.find((g) => g.value === s.gameType)?.label ?? s.gameType],
    ["Discount", discount],
    ["Shows on", TARGETS.find((t) => t.value === s.target)?.label ?? s.target],
    ["Opens", TRIGGERS.find((t) => t.value === s.trigger)?.label ?? s.trigger],
  ];
  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingMd">Check and publish</Text>
      <BlockStack gap="150">
        {rows.map(([k, v]) => (
          <InlineStack key={k} gap="200" wrap={false}>
            <div style={{ width: 110, flex: "none" }}>
              <Text as="span" tone="subdued">{k}</Text>
            </div>
            <Text as="span">{v}</Text>
          </InlineStack>
        ))}
      </BlockStack>
      <Preview settings={s} branding={branding} device="desktop" />
      <Text as="p" tone="subdued">
        Publish to show it to visitors now, or save it as a draft and preview it on your store first.
      </Text>
    </BlockStack>
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
  const own = DEFAULT_STRINGS.en;
  const unit = s.discountType === "percentage" ? "%" : "";
  const values =
    s.gameType === "wheel" ? s.wheelSegments.map((x) => Number(x.value)) : s.tiered && SKILL_GAMES.includes(s.gameType) ? s.tierValues.map(Number) : [Number(s.discountValue)];
  const best = `${Math.max(...values)}${unit}`;
  const named =
    s.showValue && s.codeMode === "unique"
      ? { introTitle: (s.gameType === "none" ? own.noneTitleValue : new Set(values).size > 1 ? own.titleUpTo : own.titleWin).replace("{value}", best) }
      : {};
  const t = {
    ...own,
    ...Object.fromEntries(Object.entries(GAME_TEXTS[s.gameType]).map(([key, src]) => [key, own[src]])),
    ...named,
    ...s.strings.en,
  };
  const phone = device === "phone";
  const scale = (phone ? s.sizeMobile : s.sizeDesktop) / 100;
  const [screen, setScreen] = useState<"intro" | "form" | "game" | "win">("intro");
  const btn = { background: s.accentColor, color: "#11151c", fontWeight: 700, padding: 12, borderRadius: 8 };
  const input = { background: "#fff", color: "#6d7175", borderRadius: 8, padding: "10px 12px", textAlign: "left" as const, fontSize: 14, marginBottom: 8, fontFamily: "sans-serif" };
  const nameShown = s.nameField !== "hidden";
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          Preview
        </Text>
        <ButtonGroup variant="segmented">
          {(
            [
              ["intro", "Start"],
              ["form", "Email form"],
              ...(s.gameType === "none" ? [] : [["game", "Game"]]),
              ["win", "Code"],
            ] as [typeof screen, string][]
          ).map(([k, label]) => (
            <Button key={k} pressed={screen === k} onClick={() => setScreen(k)} size="slim">
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </InlineStack>
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
          {screen === "intro" && (
            <>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{t.introTitle}</div>
              <div style={{ color: s.accentColor, fontSize: 14, marginBottom: 20 }}>
                {t.introDesc.replace("{seconds}", String(s.surviveSec))}
              </div>
              <div style={btn}>{t.startBtn}</div>
            </>
          )}
          {screen === "form" && (
            <>
              <div style={{ fontSize: 17, marginBottom: 14 }}>{s.emailAfter && SKILL_GAMES.includes(s.gameType) ? t.formWinTitle : t.formTitle}</div>
              {nameShown && <div style={input}>{t.namePlaceholder}</div>}
              <div style={input}>{t.emailPlaceholder}</div>
              {s.requireConsent && (
                <div style={{ fontSize: 12, textAlign: "left", margin: "4px 0 12px", fontFamily: "sans-serif" }}>☐ {t.consentLabel}</div>
              )}
              <div style={btn}>{s.emailAfter && SKILL_GAMES.includes(s.gameType) ? t.noneSubmit : t.formSubmit}</div>
            </>
          )}
          {screen === "game" && (
            <>
              <GameThumb game={s.gameType} primary={s.primaryColor} accent={s.accentColor} />
              <div style={{ fontSize: 14, marginTop: 10 }}>{t.playing}</div>
            </>
          )}
          {screen === "win" && (
            <>
              <div style={{ color: s.accentColor, fontSize: 14, marginBottom: 6 }}>{t.rewardIntro.replace(/,? ?\{name\}/, nameShown ? ", Ana" : "")}</div>
              {s.codeMode === "unique" && <div style={{ fontSize: 18, marginBottom: 6 }}>{t.rewardValue.replace("{value}", best)}</div>}
              <div style={{ border: `2px dashed ${s.accentColor}`, borderRadius: 8, padding: 10, fontFamily: "monospace", fontSize: 20, letterSpacing: 2, marginBottom: 12 }}>
                {s.codeMode === "unique" ? `${s.codePrefix ? `${s.codePrefix}-` : ""}K7M2QX9A` : s.discountCode || "YOURCODE"}
              </div>
              <div style={btn}>{t.copyBtn}</div>
            </>
          )}
          {branding && (
            <div title="Kodra Play icon (free plan)" style={{ fontSize: 16, opacity: 0.55, marginTop: 14 }}>🎮</div>
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
  preview,
  onSaveNow,
}: {
  s: PopupSettings;
  setS: React.Dispatch<React.SetStateAction<PopupSettings>>;
  results: AbResults | null;
  lang: Language;
  setLang: (l: Language) => void;
  saving: boolean;
  preview: boolean;
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
  // Placeholders: what each variant shows when its text is left empty.
  const textOf = (game: GameType, key: "introTitle" | "introDesc") =>
    s.strings[lang]?.[key] ?? DEFAULT_STRINGS[lang][GAME_TEXTS[game][key] ?? key];
  const unit = s.discountType === "percentage" ? "%" : "";
  const bSkill = SKILL_GAMES.includes(b.gameType);
  const aDiscount =
    s.gameType === "wheel"
      ? "the wheel's rewards"
      : s.tiered && SKILL_GAMES.includes(s.gameType)
        ? `${s.tierValues.join(" / ")}${unit} by attempt`
        : `${s.discountValue}${unit}`;
  const timed = (g: GameType) => g === "paddle" || g === "flipper";
  const needsLevel = b.gameType === "pong" && s.gameType !== "pong";
  const needsTime = timed(b.gameType) && !timed(s.gameType);
  const needsAttempts = bSkill && !SKILL_GAMES.includes(s.gameType);

  return (
    <BlockStack gap="400">
      <Checkbox
        label="A/B test: half of the visitors see version B"
        helpText="Each visitor always sees the same version. Version A is your popup as it is now."
        checked={s.abEnabled}
        onChange={(on) =>
          setS((prev) => ({ ...prev, abEnabled: on, ab: on && !prev.abEnabled ? { ...abFromSettings(prev), strings: prev.ab.strings } : prev.ab }))
        }
      />

      {s.abEnabled && (
        <Card background="bg-surface-secondary">
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">Version B: change what you want to test</Text>
            <Text as="p" tone="subdued">
              Change one thing at a time, for example only the discount. Turning the test off and on again starts new results.
            </Text>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">Game for B (A: {GAMES.find((g) => g.value === s.gameType)?.label})</Text>
              <GamePicker value={b.gameType} onChange={(g) => setB("gameType", g)} games={ALL_GAMES}
                primary={s.primaryColor} accent={s.accentColor} compact />
            </BlockStack>
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <Select label="When it opens" options={TRIGGERS.map((t) => ({ ...t }))} value={b.trigger}
                onChange={(v) => setB("trigger", v as AbVariant["trigger"])} />
              <TextField label="Delay (seconds)" type="number" autoComplete="off" value={String(b.delaySec)}
                onChange={(v) => setB("delaySec", Number(v))} />
            </InlineGrid>
            {preview && (
              <Select label={`Name field (A: ${NAME_FIELDS.find((f) => f.value === s.nameField)?.label})`} options={[...NAME_FIELDS]}
                value={b.nameField} onChange={(v) => setB("nameField", v as AbVariant["nameField"])} />
            )}

            {bSkill && (
              <Select label={`When B asks for the email (A: ${SKILL_GAMES.includes(s.gameType) && s.emailAfter ? "after a win" : "before the game"})`}
                options={EMAIL_TIMING} value={b.emailAfter ? "after" : "before"} onChange={(v) => setB("emailAfter", v === "after")} />
            )}
            {/* B's game settings that A's game doesn't show (they are shared with A). */}
            {(needsLevel || needsTime || needsAttempts) && (
              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                {needsLevel && (
                  <Select label="Computer level (Pong)" options={[...DIFFICULTIES]} value={s.difficulty}
                    onChange={(v) => setS((prev) => ({ ...prev, difficulty: v as PopupSettings["difficulty"] }))} />
                )}
                {needsTime && (
                  <TextField label="Seconds to survive to win" type="number" min={3} autoComplete="off" value={String(s.surviveSec)}
                    onChange={(v) => setS((prev) => ({ ...prev, surviveSec: v as unknown as number }))} />
                )}
                {needsAttempts && (
                  <TextField label="Tries per visitor" type="number" min={1} autoComplete="off" value={String(s.maxAttempts)}
                    onChange={(v) => setS((prev) => ({ ...prev, maxAttempts: v as unknown as number }))} />
                )}
              </InlineGrid>
            )}
            {s.codeMode === "unique" && b.gameType === "wheel" && (
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">Rewards on B&apos;s wheel</Text>
                <WheelEditor segments={b.wheelSegments} onChange={(next) => setB("wheelSegments", next)} unit={unit}
                  primary={s.primaryColor} accent={s.accentColor} />
              </BlockStack>
            )}
            {s.codeMode === "static" && b.gameType === "wheel" && (
              <Banner tone="warning">The spin wheel needs unique codes (Game tab → Discount code type).</Banner>
            )}
            {s.codeMode === "unique" && b.gameType !== "wheel" && !(bSkill && s.tiered) && (
              <TextField label={`Discount for B (A: ${aDiscount})`} type="number" autoComplete="off"
                suffix={unit} value={String(b.discountValue)} onChange={(v) => setB("discountValue", Number(v))} />
            )}
            {s.codeMode === "unique" && bSkill && s.tiered && (
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
              helpText="Empty = same text as A." />
            <TextField label="Title for B" autoComplete="off" value={b.strings[lang]?.introTitle ?? ""}
              placeholder={textOf(b.gameType, "introTitle")} onChange={(v) => setBString("introTitle", v)} />
            <TextField label="Text under the title for B" autoComplete="off" value={b.strings[lang]?.introDesc ?? ""}
              placeholder={textOf(b.gameType, "introDesc").replace("{seconds}", String(s.surviveSec))} onChange={(v) => setBString("introDesc", v)} />
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

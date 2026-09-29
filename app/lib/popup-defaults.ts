// Shared between the admin UI and the server. The storefront receives fully
// resolved strings through the published metafield (see publishConfig).

export const LANGUAGES = ["en", "sl", "hr", "ro"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  sl: "Slovenščina",
  hr: "Hrvatski",
  ro: "Română",
};

export const STRING_KEYS = [
  "introTitle",
  "introDesc",
  "startBtn",
  "formTitle",
  "namePlaceholder",
  "emailPlaceholder",
  "consentLabel",
  "formSubmit",
  "nameError",
  "emailError",
  "consentError",
  "playing",
  "fail",
  "retriesLeft",
  "noAttempts",
  "rewardIntro",
  "rewardTeaser",
  "copyBtn",
  "copied",
  "closeBtn",
  "teaser",
  "rewardValue",
  "expiresIn",
  "validUntil",
  "flipperHelp",
] as const;
export type StringKey = (typeof STRING_KEYS)[number];
export type Strings = Record<StringKey, string>;
export type CustomStrings = Partial<Record<Language, Partial<Strings>>>;

export const STRING_LABELS: Record<StringKey, string> = {
  introTitle: "Intro title",
  introDesc: "Intro description ({seconds} = survive time)",
  startBtn: "Start button",
  formTitle: "Form title",
  namePlaceholder: "Name placeholder",
  emailPlaceholder: "Email placeholder",
  consentLabel: "Marketing consent label",
  formSubmit: "Form submit button",
  nameError: "Missing name error",
  emailError: "Invalid email error",
  consentError: "Missing consent error",
  playing: "Status while playing",
  fail: "Ball dropped message",
  retriesLeft: "Retry button ({n} = attempts left)",
  noAttempts: "No attempts left",
  rewardIntro: "Reward intro ({name} = visitor name)",
  rewardTeaser: "Reward teaser",
  copyBtn: "Copy button",
  copied: "Copied confirmation",
  closeBtn: "Close button",
  teaser: "Floating button to reopen the game",
  rewardValue: "Won value ({value} = e.g. 15%)",
  expiresIn: "Countdown ({time} = mm:ss)",
  validUntil: "Expiry date ({date})",
  flipperHelp: "Flipper instructions",
};

export const DEFAULT_STRINGS: Record<Language, Strings> = {
  sl: {
    introTitle: "Igraj za skrivnostni popust",
    introDesc: "Preživi {seconds} sekund in odkleni skrivnostni popust.",
    startBtn: "Začni",
    formTitle: "Vnesite podatke za igro",
    namePlaceholder: "Vaše ime",
    emailPlaceholder: "tvoj@email.com",
    consentLabel: "Strinjam se s prejemanjem e-novic in ponudb.",
    formSubmit: "Igraj!",
    nameError: "Vnesite ime.",
    emailError: "Vnesite veljaven email.",
    consentError: "Za sodelovanje potrdite soglasje.",
    playing: "Ne izpusti žogice!",
    fail: "Žogica je padla!",
    retriesLeft: "Poskusi znova ({n} poskusi ostanejo)",
    noAttempts: "Zmanjkalo ti je poskusov.",
    rewardIntro: "Bravo, {name}! Tvoja skrivnostna koda:",
    rewardTeaser: "Dodaj v košarico in odkrij koliko prihraniš! 🎁",
    copyBtn: "Kopiraj kodo",
    copied: "Kopirano!",
    closeBtn: "Zapri",
    teaser: "🎁 Igraj za popust",
    rewardValue: "Osvojil si {value} popusta!",
    expiresIn: "Koda poteče čez {time}",
    validUntil: "Koda velja do {date}",
    flipperHelp: "Tapni levo ali desno za loparčka",
  },
  hr: {
    introTitle: "Igraj za tajni popust",
    introDesc: "Preživi {seconds} sekundi i otključaj tajni popust.",
    startBtn: "Započni",
    formTitle: "Unesite podatke za igru",
    namePlaceholder: "Vaše ime",
    emailPlaceholder: "tvoj@email.com",
    consentLabel: "Slažem se s primanjem newslettera i ponuda.",
    formSubmit: "Igraj!",
    nameError: "Unesite ime.",
    emailError: "Unesite ispravan email.",
    consentError: "Za sudjelovanje potvrdite suglasnost.",
    playing: "Ne ispusti lopticu!",
    fail: "Loptica je pala!",
    retriesLeft: "Pokušaj ponovo ({n} pokušaja ostalo)",
    noAttempts: "Nemaš više pokušaja.",
    rewardIntro: "Bravo, {name}! Tvoj tajni kod:",
    rewardTeaser: "Dodaj u košaricu i otkrij koliko štediš! 🎁",
    copyBtn: "Kopiraj kod",
    copied: "Kopirano!",
    closeBtn: "Zatvori",
    teaser: "🎁 Igraj za popust",
    rewardValue: "Osvojio si {value} popusta!",
    expiresIn: "Kod istječe za {time}",
    validUntil: "Kod vrijedi do {date}",
    flipperHelp: "Dodirni lijevo ili desno za lopatice",
  },
  ro: {
    introTitle: "Joacă pentru reducere misterioasă",
    introDesc: "Supraviețuiește {seconds} secunde și deblochează reducerea.",
    startBtn: "Începe",
    formTitle: "Introduceți datele pentru joc",
    namePlaceholder: "Numele dvs.",
    emailPlaceholder: "email@tau.com",
    consentLabel: "Sunt de acord să primesc newsletter și oferte.",
    formSubmit: "Joacă!",
    nameError: "Introduceți numele.",
    emailError: "Introduceți un email valid.",
    consentError: "Confirmați acordul pentru a participa.",
    playing: "Nu scăpa mingea!",
    fail: "Mingea a căzut!",
    retriesLeft: "Încearcă din nou ({n} încercări rămase)",
    noAttempts: "Nu mai ai încercări.",
    rewardIntro: "Bravo, {name}! Codul tău:",
    rewardTeaser: "Adaugă în coș și descoperă cât economisești! 🎁",
    copyBtn: "Copiază codul",
    copied: "Copiat!",
    closeBtn: "Închide",
    teaser: "🎁 Joacă pentru reducere",
    rewardValue: "Ai câștigat {value} reducere!",
    expiresIn: "Codul expiră în {time}",
    validUntil: "Codul este valabil până la {date}",
    flipperHelp: "Atinge stânga sau dreapta pentru palete",
  },
  en: {
    introTitle: "Play for a mystery discount",
    introDesc: "Survive {seconds} seconds and unlock a mystery discount.",
    startBtn: "Start",
    formTitle: "Enter your details to play",
    namePlaceholder: "Your name",
    emailPlaceholder: "your@email.com",
    consentLabel: "I agree to receive news and offers by email.",
    formSubmit: "Play!",
    nameError: "Please enter your name.",
    emailError: "Please enter a valid email.",
    consentError: "Please confirm consent to play.",
    playing: "Don't drop the ball!",
    fail: "Ball dropped!",
    retriesLeft: "Try again ({n} attempts left)",
    noAttempts: "No more attempts.",
    rewardIntro: "Well done, {name}! Your mystery code:",
    rewardTeaser: "Add to cart and discover how much you save! 🎁",
    copyBtn: "Copy code",
    copied: "Copied!",
    closeBtn: "Close",
    teaser: "🎁 Play for a discount",
    rewardValue: "You won {value} off!",
    expiresIn: "Code expires in {time}",
    validUntil: "Code valid until {date}",
    flipperHelp: "Tap left or right to flip",
  },
};

export const TARGETS = [
  { label: "All pages", value: "all" },
  { label: "Home page", value: "index" },
  { label: "Product pages", value: "product" },
  { label: "Collection pages", value: "collection" },
  { label: "Cart page", value: "cart" },
  { label: "Blog & article pages", value: "blog" },
  { label: "Content pages", value: "page" },
] as const;

export const GAMES = [
  { label: "Paddle & ball", value: "paddle" },
  { label: "Flipper (Pro)", value: "flipper" },
] as const;

export const TRIGGERS = [
  { label: "Exit intent or delay – whichever comes first (recommended)", value: "both" },
  { label: "After the delay", value: "delay" },
  { label: "On exit intent only (desktop; mobile falls back to delay)", value: "exit" },
] as const;

export const DEFAULT_PRIMARY = "#830522";
export const DEFAULT_ACCENT = "#d9caa0";

export interface PopupSettings {
  name: string;
  active: boolean;
  discountCode: string;
  delaySec: number;
  surviveSec: number;
  vx: number;
  vy: number;
  maxAttempts: number;
  primaryColor: string;
  accentColor: string;
  target: string;
  requireConsent: boolean;
  autoApply: boolean;
  codeMode: "static" | "unique";
  discountType: "percentage" | "fixed";
  discountValue: number;
  codePrefix: string;
  codeExpiryDays: number;
  gameType: "paddle" | "flipper";
  trigger: "both" | "delay" | "exit";
  teaser: boolean;
  tiered: boolean;
  // Best → worst: won on 1st, 2nd, 3rd+ attempt
  tierValues: [number, number, number];
  // >0: unique codes expire this many minutes after winning (shown as a countdown)
  urgencyMinutes: number;
  strings: CustomStrings;
}

export const DEFAULT_SETTINGS: PopupSettings = {
  name: "Mystery discount game",
  active: true,
  discountCode: "",
  delaySec: 15,
  surviveSec: 15,
  vx: 4.5,
  vy: -5.0,
  maxAttempts: 3,
  primaryColor: DEFAULT_PRIMARY,
  accentColor: DEFAULT_ACCENT,
  target: "all",
  requireConsent: true,
  autoApply: true,
  codeMode: "static",
  discountType: "percentage",
  discountValue: 10,
  codePrefix: "WIN",
  codeExpiryDays: 7,
  gameType: "paddle",
  trigger: "both",
  teaser: true,
  tiered: false,
  tierValues: [15, 10, 5],
  urgencyMinutes: 0,
  strings: {},
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const CODE = /^[A-Za-z0-9_-]{1,255}$/;

function num(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export type ValidationErrors = Partial<Record<keyof PopupSettings, string>>;

/** Coerce untrusted input into valid settings; returns field errors for anything the merchant must fix. */
export function parseSettings(input: Record<string, unknown>): {
  settings: PopupSettings;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};
  const d = DEFAULT_SETTINGS;

  const name = String(input.name ?? "").trim().slice(0, 80) || d.name;
  const codeMode = input.codeMode === "unique" ? "unique" : "static";
  const discountCode = String(input.discountCode ?? "").trim();
  // In unique mode the shared code is optional (fallback if Pro lapses).
  if ((codeMode === "static" || discountCode) && !CODE.test(discountCode)) {
    errors.discountCode =
      "Enter the discount code exactly as created in Shopify (letters, numbers, - and _).";
  }

  const discountType = input.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = num(input.discountValue, 0, 0, 1_000_000);
  if (
    codeMode === "unique" &&
    (discountValue <= 0 || (discountType === "percentage" && discountValue > 100))
  ) {
    errors.discountValue =
      discountType === "percentage"
        ? "Enter a percentage between 1 and 100."
        : "Enter an amount greater than 0.";
  }
  const codePrefix = String(input.codePrefix ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{0,12}$/.test(codePrefix)) {
    errors.codePrefix = "Prefix: up to 12 letters, numbers or dashes.";
  }

  const tiered = codeMode === "unique" && (input.tiered === true || input.tiered === "true");
  const rawTiers = Array.isArray(input.tierValues) ? input.tierValues : d.tierValues;
  const tierValues = [0, 1, 2].map((i) => num(rawTiers[i], d.tierValues[i], 0, 1_000_000)) as [
    number,
    number,
    number,
  ];
  if (
    tiered &&
    tierValues.some((v) => v <= 0 || (discountType === "percentage" && v > 100))
  ) {
    errors.tierValues = "Each tier needs a value greater than 0 (percentages up to 100).";
  }

  const primaryColor = String(input.primaryColor ?? d.primaryColor);
  const accentColor = String(input.accentColor ?? d.accentColor);
  if (!HEX.test(primaryColor)) errors.primaryColor = "Use a hex color like #830522.";
  if (!HEX.test(accentColor)) errors.accentColor = "Use a hex color like #d9caa0.";

  const target = TARGETS.some((t) => t.value === input.target)
    ? String(input.target)
    : d.target;

  const vx = num(input.vx, d.vx, -15, 15);
  const vy = num(input.vy, d.vy, -15, 15);
  if (Math.abs(vx) < 0.5 || Math.abs(vy) < 0.5) {
    errors.vx = "Each ball speed component must be at least 0.5 away from 0.";
  }

  const strings: CustomStrings = {};
  const rawStrings = (input.strings ?? {}) as Record<string, unknown>;
  for (const lang of LANGUAGES) {
    const src = (rawStrings[lang] ?? {}) as Record<string, unknown>;
    const out: Partial<Strings> = {};
    for (const key of STRING_KEYS) {
      const val = typeof src[key] === "string" ? (src[key] as string).trim() : "";
      if (val) out[key] = val.slice(0, 300);
    }
    if (Object.keys(out).length) strings[lang] = out;
  }

  return {
    errors,
    settings: {
      name,
      active: input.active === true || input.active === "true",
      discountCode,
      delaySec: Math.round(num(input.delaySec, d.delaySec, 0, 600)),
      surviveSec: Math.round(num(input.surviveSec, d.surviveSec, 3, 120)),
      vx,
      vy,
      maxAttempts: Math.round(num(input.maxAttempts, d.maxAttempts, 1, 20)),
      primaryColor,
      accentColor,
      target,
      requireConsent: input.requireConsent !== false && input.requireConsent !== "false",
      autoApply: input.autoApply !== false && input.autoApply !== "false",
      codeMode,
      discountType,
      discountValue,
      codePrefix,
      codeExpiryDays: Math.round(num(input.codeExpiryDays, d.codeExpiryDays, 0, 365)),
      gameType: input.gameType === "flipper" ? "flipper" : "paddle",
      trigger: input.trigger === "delay" || input.trigger === "exit" ? input.trigger : "both",
      teaser: input.teaser !== false && input.teaser !== "false",
      tiered,
      tierValues,
      urgencyMinutes: Math.round(num(input.urgencyMinutes, 0, 0, 1440)),
      strings,
    },
  };
}

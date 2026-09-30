// Shared between the admin UI and the server. The storefront receives fully
// resolved strings through the published metafield (see publishConfig).

export const LANGUAGES = ["en", "de", "fr", "es", "it", "nl", "pl", "sl", "hr", "ro"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
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
  de: {
    introTitle: "Spiel um einen geheimen Rabatt",
    introDesc: "Halte {seconds} Sekunden durch und schalte einen geheimen Rabatt frei.",
    startBtn: "Los geht's",
    formTitle: "Gib deine Daten ein, um zu spielen",
    namePlaceholder: "Dein Name",
    emailPlaceholder: "deine@email.de",
    consentLabel: "Ich möchte Neuigkeiten und Angebote per E-Mail erhalten.",
    formSubmit: "Spielen!",
    nameError: "Bitte gib deinen Namen ein.",
    emailError: "Bitte gib eine gültige E-Mail-Adresse ein.",
    consentError: "Bitte bestätige die Einwilligung, um zu spielen.",
    playing: "Lass den Ball nicht fallen!",
    fail: "Ball verloren!",
    retriesLeft: "Nochmal versuchen (noch {n} Versuche)",
    noAttempts: "Keine Versuche mehr.",
    rewardIntro: "Super, {name}! Dein geheimer Code:",
    rewardTeaser: "Leg etwas in den Warenkorb und sieh, wie viel du sparst! 🎁",
    copyBtn: "Code kopieren",
    copied: "Kopiert!",
    closeBtn: "Schließen",
    teaser: "🎁 Spiel um Rabatt",
    rewardValue: "Du hast {value} Rabatt gewonnen!",
    expiresIn: "Code läuft ab in {time}",
    validUntil: "Code gültig bis {date}",
    flipperHelp: "Tippe links oder rechts, um die Flipper zu bewegen",
  },
  fr: {
    introTitle: "Jouez pour une remise mystère",
    introDesc: "Tenez {seconds} secondes et débloquez une remise mystère.",
    startBtn: "Commencer",
    formTitle: "Entrez vos coordonnées pour jouer",
    namePlaceholder: "Votre prénom",
    emailPlaceholder: "votre@email.fr",
    consentLabel: "J'accepte de recevoir des actualités et des offres par e-mail.",
    formSubmit: "Jouer\u00a0!",
    nameError: "Veuillez saisir votre prénom.",
    emailError: "Veuillez saisir un e-mail valide.",
    consentError: "Veuillez confirmer votre consentement pour jouer.",
    playing: "Ne laissez pas tomber la balle\u00a0!",
    fail: "Balle perdue\u00a0!",
    retriesLeft: "Réessayer ({n} essais restants)",
    noAttempts: "Plus d'essais disponibles.",
    rewardIntro: "Bravo, {name}\u00a0! Votre code mystère\u00a0:",
    rewardTeaser: "Ajoutez au panier et découvrez combien vous économisez\u00a0! 🎁",
    copyBtn: "Copier le code",
    copied: "Copié\u00a0!",
    closeBtn: "Fermer",
    teaser: "🎁 Jouez pour une remise",
    rewardValue: "Vous avez gagné {value} de remise\u00a0!",
    expiresIn: "Le code expire dans {time}",
    validUntil: "Code valable jusqu'au {date}",
    flipperHelp: "Touchez à gauche ou à droite pour actionner les flippers",
  },
  es: {
    introTitle: "Juega por un descuento sorpresa",
    introDesc: "Aguanta {seconds} segundos y desbloquea un descuento sorpresa.",
    startBtn: "Empezar",
    formTitle: "Introduce tus datos para jugar",
    namePlaceholder: "Tu nombre",
    emailPlaceholder: "tu@email.com",
    consentLabel: "Acepto recibir novedades y ofertas por email.",
    formSubmit: "¡Jugar!",
    nameError: "Introduce tu nombre.",
    emailError: "Introduce un email válido.",
    consentError: "Confirma tu consentimiento para jugar.",
    playing: "¡No dejes caer la pelota!",
    fail: "¡Se cayó la pelota!",
    retriesLeft: "Inténtalo de nuevo (quedan {n} intentos)",
    noAttempts: "No te quedan intentos.",
    rewardIntro: "¡Bien hecho, {name}! Tu código sorpresa:",
    rewardTeaser: "¡Añade al carrito y descubre cuánto ahorras! 🎁",
    copyBtn: "Copiar código",
    copied: "¡Copiado!",
    closeBtn: "Cerrar",
    teaser: "🎁 Juega por un descuento",
    rewardValue: "¡Has ganado un {value} de descuento!",
    expiresIn: "El código caduca en {time}",
    validUntil: "Código válido hasta el {date}",
    flipperHelp: "Toca a la izquierda o a la derecha para mover las palas",
  },
  it: {
    introTitle: "Gioca per uno sconto misterioso",
    introDesc: "Resisti {seconds} secondi e sblocca uno sconto misterioso.",
    startBtn: "Inizia",
    formTitle: "Inserisci i tuoi dati per giocare",
    namePlaceholder: "Il tuo nome",
    emailPlaceholder: "tua@email.it",
    consentLabel: "Accetto di ricevere novità e offerte via email.",
    formSubmit: "Gioca!",
    nameError: "Inserisci il tuo nome.",
    emailError: "Inserisci un'email valida.",
    consentError: "Conferma il consenso per giocare.",
    playing: "Non far cadere la pallina!",
    fail: "La pallina è caduta!",
    retriesLeft: "Riprova (tentativi rimasti: {n})",
    noAttempts: "Non hai più tentativi.",
    rewardIntro: "Complimenti, {name}! Il tuo codice misterioso:",
    rewardTeaser: "Aggiungi al carrello e scopri quanto risparmi! 🎁",
    copyBtn: "Copia codice",
    copied: "Copiato!",
    closeBtn: "Chiudi",
    teaser: "🎁 Gioca per uno sconto",
    rewardValue: "Hai vinto {value} di sconto!",
    expiresIn: "Il codice scade tra {time}",
    validUntil: "Codice valido fino al {date}",
    flipperHelp: "Tocca a sinistra o a destra per azionare le palette",
  },
  nl: {
    introTitle: "Speel voor een geheime korting",
    introDesc: "Hou het {seconds} seconden vol en ontgrendel een geheime korting.",
    startBtn: "Start",
    formTitle: "Vul je gegevens in om te spelen",
    namePlaceholder: "Je naam",
    emailPlaceholder: "jouw@email.nl",
    consentLabel: "Ik ontvang graag nieuws en aanbiedingen per e-mail.",
    formSubmit: "Spelen!",
    nameError: "Vul je naam in.",
    emailError: "Vul een geldig e-mailadres in.",
    consentError: "Bevestig je toestemming om te spelen.",
    playing: "Laat de bal niet vallen!",
    fail: "Bal gevallen!",
    retriesLeft: "Probeer opnieuw (nog {n} pogingen)",
    noAttempts: "Geen pogingen meer.",
    rewardIntro: "Goed gedaan, {name}! Je geheime code:",
    rewardTeaser: "Voeg toe aan je winkelwagen en ontdek hoeveel je bespaart! 🎁",
    copyBtn: "Kopieer code",
    copied: "Gekopieerd!",
    closeBtn: "Sluiten",
    teaser: "🎁 Speel voor korting",
    rewardValue: "Je hebt {value} korting gewonnen!",
    expiresIn: "Code verloopt over {time}",
    validUntil: "Code geldig tot {date}",
    flipperHelp: "Tik links of rechts om de flippers te bewegen",
  },
  pl: {
    introTitle: "Zagraj o tajemniczy rabat",
    introDesc: "Przetrwaj {seconds} sekund i odblokuj tajemniczy rabat.",
    startBtn: "Start",
    formTitle: "Podaj dane, aby zagrać",
    namePlaceholder: "Twoje imię",
    emailPlaceholder: "twoj@email.pl",
    consentLabel: "Zgadzam się na otrzymywanie nowości i ofert e-mailem.",
    formSubmit: "Graj!",
    nameError: "Podaj swoje imię.",
    emailError: "Podaj prawidłowy adres e-mail.",
    consentError: "Potwierdź zgodę, aby zagrać.",
    playing: "Nie upuść piłki!",
    fail: "Piłka spadła!",
    retriesLeft: "Spróbuj ponownie (pozostałe próby: {n})",
    noAttempts: "Nie masz więcej prób.",
    rewardIntro: "Brawo, {name}! Twój tajemniczy kod:",
    rewardTeaser: "Dodaj do koszyka i sprawdź, ile oszczędzasz! 🎁",
    copyBtn: "Kopiuj kod",
    copied: "Skopiowano!",
    closeBtn: "Zamknij",
    teaser: "🎁 Zagraj o rabat",
    rewardValue: "Twoja wygrana: {value} rabatu!",
    expiresIn: "Kod wygasa za {time}",
    validUntil: "Kod ważny do {date}",
    flipperHelp: "Dotknij lewej lub prawej strony, aby poruszyć łapkami",
  },
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
  { label: "Flipper", value: "flipper" },
] as const;

export const TRIGGERS = [
  { label: "Exit intent or delay – whichever comes first (recommended)", value: "both" },
  { label: "After the delay", value: "delay" },
  { label: "On exit intent only (desktop; mobile falls back to delay)", value: "exit" },
] as const;

export const FREQUENCIES = [
  { label: "Once per visit (session) – recommended", value: "session" },
  { label: "Once per day", value: "day" },
  { label: "Once per week", value: "week" },
  { label: "On every page until closed", value: "always" },
] as const;

export const DEFAULT_PRIMARY = "#830522";
export const DEFAULT_ACCENT = "#d9caa0";

/** What variant B of an A/B test changes; everything else is the same as A. */
export interface AbVariant {
  gameType: "paddle" | "flipper";
  trigger: "both" | "delay" | "exit";
  delaySec: number;
  // Unique codes: B's discount (single value, or per attempt when tiered)
  discountValue: number;
  tierValues: [number, number, number];
  // Shared-code mode: B's code (empty = same code as A)
  discountCode: string;
  // Headline/description per language (empty = same as A)
  strings: Partial<Record<Language, { introTitle?: string; introDesc?: string }>>;
}

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
  // Popup size in % of the default (limits in SIZE_LIMITS)
  sizeDesktop: number;
  sizeMobile: number;
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
  // How often the popup may open by itself; the floating button always works.
  frequency: "session" | "day" | "week" | "always";
  teaser: boolean;
  tiered: boolean;
  // Best → worst: won on 1st, 2nd, 3rd+ attempt
  tierValues: [number, number, number];
  // >0: unique codes expire this many minutes after winning (shown as a countdown)
  urgencyMinutes: number;
  strings: CustomStrings;
  abEnabled: boolean;
  ab: AbVariant;
}

/** Starting point for variant B: a copy of A with the other game. */
export function abFromSettings(s: PopupSettings): AbVariant {
  return {
    gameType: s.gameType === "paddle" ? "flipper" : "paddle",
    trigger: s.trigger,
    delaySec: s.delaySec,
    discountValue: s.discountValue,
    tierValues: [...s.tierValues],
    discountCode: s.discountCode,
    strings: {},
  };
}

/** Settings after adopting variant B as the popup (ends the test). */
export function applyVariantB(s: PopupSettings): PopupSettings {
  const b = s.ab;
  const strings: CustomStrings = { ...s.strings };
  for (const [lang, over] of Object.entries(b.strings) as [Language, AbVariant["strings"][Language]][]) {
    const clean = Object.fromEntries(Object.entries(over ?? {}).filter(([, v]) => v));
    if (Object.keys(clean).length) strings[lang] = { ...strings[lang], ...clean };
  }
  return {
    ...s,
    gameType: b.gameType,
    trigger: b.trigger,
    delaySec: b.delaySec,
    discountValue: b.discountValue,
    tierValues: [...b.tierValues],
    discountCode: b.discountCode || s.discountCode,
    strings,
    abEnabled: false,
  };
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
  sizeDesktop: 100,
  sizeMobile: 100,
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
  frequency: "session",
  teaser: true,
  tiered: false,
  tierValues: [15, 10, 5],
  urgencyMinutes: 0,
  strings: {},
  abEnabled: false,
  ab: {
    gameType: "flipper",
    trigger: "both",
    delaySec: 15,
    discountValue: 10,
    tierValues: [15, 10, 5],
    discountCode: "",
    strings: {},
  },
};

export function parseAbJson(raw: string) {
  try {
    return parseAbVariant(JSON.parse(raw || "{}"));
  } catch {
    return parseAbVariant({});
  }
}

/** Parses a stored/submitted variant B, falling back to the defaults field by field. */
export function parseAbVariant(input: unknown, fallback: AbVariant = DEFAULT_SETTINGS.ab): AbVariant {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const tiers = Array.isArray(o.tierValues) ? o.tierValues : fallback.tierValues;
  const strings: AbVariant["strings"] = {};
  const rawStrings = (o.strings && typeof o.strings === "object" ? o.strings : {}) as Record<string, unknown>;
  for (const lang of LANGUAGES) {
    const src = (rawStrings[lang] ?? {}) as Record<string, unknown>;
    const out: { introTitle?: string; introDesc?: string } = {};
    for (const key of ["introTitle", "introDesc"] as const) {
      const val = typeof src[key] === "string" ? (src[key] as string).trim().slice(0, 300) : "";
      if (val) out[key] = val;
    }
    if (Object.keys(out).length) strings[lang] = out;
  }
  return {
    gameType: o.gameType === "paddle" || o.gameType === "flipper" ? o.gameType : fallback.gameType,
    trigger: o.trigger === "delay" || o.trigger === "exit" || o.trigger === "both" ? o.trigger : fallback.trigger,
    delaySec: Math.round(num(o.delaySec, fallback.delaySec, 0, 600)),
    discountValue: num(o.discountValue, fallback.discountValue, 0.01, 100000),
    tierValues: [0, 1, 2].map((i) => num(tiers[i], fallback.tierValues[i], 0.01, 100000)) as [number, number, number],
    discountCode: String(o.discountCode ?? "").trim().slice(0, 255),
    strings,
  };
}

// Min/max popup size in % of the default. Phones get less headroom: the
// popup already spans the screen width there.
export const SIZE_LIMITS = {
  desktop: { min: 70, max: 140 },
  mobile: { min: 70, max: 120 },
} as const;

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

  const abEnabled = input.abEnabled === true || input.abEnabled === "true";
  const ab = parseAbVariant(input.ab);
  if (abEnabled) {
    const pct = (v: number) => discountType === "percentage" && v > 100;
    if (codeMode === "unique" && (pct(ab.discountValue) || ab.tierValues.some(pct))) {
      errors.ab = "Variant B: percentages must be between 1 and 100.";
    } else if (ab.discountCode && !CODE.test(ab.discountCode)) {
      errors.ab = "Variant B: enter the discount code exactly as created in Shopify (letters, numbers, - and _).";
    }
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
      sizeDesktop: Math.round(num(input.sizeDesktop, d.sizeDesktop, SIZE_LIMITS.desktop.min, SIZE_LIMITS.desktop.max)),
      sizeMobile: Math.round(num(input.sizeMobile, d.sizeMobile, SIZE_LIMITS.mobile.min, SIZE_LIMITS.mobile.max)),
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
      frequency: FREQUENCIES.some((f) => f.value === input.frequency)
        ? (input.frequency as PopupSettings["frequency"])
        : "session",
      teaser: input.teaser !== false && input.teaser !== "false",
      tiered,
      tierValues,
      urgencyMinutes: Math.round(num(input.urgencyMinutes, 0, 0, 1440)),
      strings,
      abEnabled,
      ab,
    },
  };
}

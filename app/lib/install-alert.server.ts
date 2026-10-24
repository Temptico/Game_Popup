/**
 * Install alert: emails the app owner when a shop installs, reinstalls or
 * uninstalls the app, with the shop's details and a ready-to-send personal
 * onboarding email in the merchant's language. The owner sends that email
 * by hand; merchants never get an automatic email from here.
 *
 * Off unless RESEND_API_KEY and INSTALL_ALERT_EMAIL are set.
 */
import db from "../db.server";
import { previewFeatures } from "./billing.server";

interface AdminApi {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}

interface ShopInfo {
  name?: string;
  email?: string;
  contactEmail?: string;
  primaryDomain?: { url?: string };
  billingAddress?: { countryCodeV2?: string };
  plan?: { displayName?: string };
  currencyCode?: string;
}

const enabled = () => !!process.env.RESEND_API_KEY && !!process.env.INSTALL_ALERT_EMAIL && previewFeatures();

async function send(subject: string, text: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL || "Enigma Play <apps@enigma101.com>",
        to: process.env.INSTALL_ALERT_EMAIL,
        subject,
        text,
      }),
    });
    if (!res.ok) console.error(`[install] alert failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error(`[install] alert failed: ${(e as Error).name}`);
  }
}

const LANG_BY_COUNTRY: Record<string, Lang> = { DE: "de", AT: "de", CH: "de", SI: "sl", HR: "hr" };
type Lang = "en" | "de" | "sl" | "hr";

/** The personal onboarding email: free setup offer, no review ask. Exported for tests. */
export function onboardingDraft(lang: Lang, storeName: string): { subject: string; body: string } {
  const drafts: Record<Lang, { subject: string; body: string }> = {
    en: {
      subject: `Your Enigma Play popup for ${storeName}`,
      body: `Hi,

thanks for installing Enigma Play on ${storeName}. I'm Primož, I built the app.

If you like, I'll set up your first game popup for you for free: your colors, the discount, when it shows up, and a quick test on your store. Just reply with the discount you want to give (for example 10% off) and I'll take care of the rest.

If something doesn't work or isn't clear, reply to this email and I'll help.

Primož
Enigma Play`,
    },
    de: {
      subject: `Ihr Enigma Play Popup für ${storeName}`,
      body: `Hallo,

danke, dass Sie Enigma Play in ${storeName} installiert haben. Ich bin Primož und habe die App entwickelt.

Wenn Sie möchten, richte ich Ihr erstes Spiel-Popup kostenlos für Sie ein: Ihre Farben, den Rabatt, wann es erscheint, und einen kurzen Test in Ihrem Shop. Antworten Sie einfach mit dem Rabatt, den Sie geben möchten (zum Beispiel 10 %), und ich kümmere mich um den Rest.

Wenn etwas nicht funktioniert oder unklar ist, antworten Sie auf diese E-Mail und ich helfe Ihnen.

Primož
Enigma Play`,
    },
    sl: {
      subject: `Vaš Enigma Play popup za ${storeName}`,
      body: `Pozdravljeni,

hvala, ker ste namestili Enigma Play v ${storeName}. Sem Primož in sem razvil aplikacijo.

Če želite, vam prvi popup z igro brezplačno nastavim sam: vaše barve, popust, kdaj se prikaže, in kratek test v vaši trgovini. Samo odgovorite, kakšen popust želite dati (na primer 10 %), za ostalo poskrbim jaz.

Če kaj ne deluje ali ni jasno, odgovorite na ta email in vam pomagam.

Primož
Enigma Play`,
    },
    hr: {
      subject: `Vaš Enigma Play popup za ${storeName}`,
      body: `Pozdrav,

hvala što ste instalirali Enigma Play u ${storeName}. Ja sam Primož i razvio sam aplikaciju.

Ako želite, besplatno ću vam sam postaviti prvi popup s igrom: vaše boje, popust, kada se prikazuje, i kratki test u vašoj trgovini. Samo odgovorite koji popust želite dati (na primjer 10 %), a za ostalo ću se pobrinuti ja.

Ako nešto ne radi ili nije jasno, odgovorite na ovaj email i pomoći ću vam.

Primož
Enigma Play`,
    },
  };
  return drafts[lang];
}

async function shopInfo(admin: AdminApi): Promise<ShopInfo> {
  try {
    const res = await admin.graphql(`#graphql
      query GameDiscountInstallInfo {
        shop { name email contactEmail primaryDomain { url } billingAddress { countryCodeV2 } plan { displayName } currencyCode }
      }`);
    return ((await res.json()) as { data?: { shop?: ShopInfo } }).data?.shop ?? {};
  } catch (e) {
    console.warn(`[install] shop info failed: ${(e as Error).message}`);
    return {};
  }
}

/** Runs after every auth; alerts only on a first install or a reinstall. */
export async function alertOnInstall(shop: string, admin: AdminApi) {
  const state = await db.shopState.findUnique({ where: { shop } });
  const reinstall = !!state?.installedAt && !!state.uninstalledAt && state.uninstalledAt > state.installedAt;
  if (state?.installedAt && !reinstall) return;
  await db.shopState.upsert({ where: { shop }, create: { shop, installedAt: new Date() }, update: { installedAt: new Date() } });
  console.log(`[install] ${reinstall ? "reinstall" : "install"}: ${shop}`);
  if (!enabled()) return;

  const info = await shopInfo(admin);
  const name = info.name || shop;
  const country = info.billingAddress?.countryCodeV2 ?? "";
  const merchantEmail = info.contactEmail || info.email || "";
  const draft = onboardingDraft(LANG_BY_COUNTRY[country] ?? "en", name);
  const text = `${reinstall ? "Reinstalled" : "New install"}: ${name}

Store:    ${info.primaryDomain?.url ?? `https://${shop}`}
Admin:    https://${shop}/admin
Email:    ${merchantEmail || "-"}
Country:  ${country || "-"}
Plan:     ${info.plan?.displayName ?? "-"}
Currency: ${info.currencyCode ?? "-"}

---- Email to send (from your own inbox, to ${merchantEmail || "the store email"}) ----

Subject: ${draft.subject}

${draft.body}
`;
  await send(`${reinstall ? "Reinstall" : "New install"}: ${name} (${country || "?"})`, text);
}

export async function alertOnUninstall(shop: string) {
  const state = await db.shopState.findUnique({ where: { shop } });
  // Shopify may deliver the webhook more than once.
  if (state?.uninstalledAt && (!state.installedAt || state.uninstalledAt > state.installedAt)) return;
  await db.shopState.upsert({ where: { shop }, create: { shop, uninstalledAt: new Date() }, update: { uninstalledAt: new Date() } });
  console.log(`[install] uninstall: ${shop}`);
  if (!enabled()) return;
  const days = state?.installedAt ? Math.round((Date.now() - state.installedAt.getTime()) / 86_400_000) : null;
  await send(`Uninstalled: ${shop}`, `${shop} uninstalled Enigma Play${days !== null ? ` after ${days} day(s)` : ""}.\n\nAdmin: https://${shop}/admin`);
}

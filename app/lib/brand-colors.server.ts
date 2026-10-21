/**
 * "Use my store colors": reads the shop's storefront and picks popup colors
 * that match its theme. Needs no extra access scopes: it reads the public
 * home page like a visitor would.
 *
 * Sources, best first:
 *  1. Shopify brand colors (Settings → Brand), printed by our app embed.
 *  2. Theme CSS variables (button / accent / primary colors of Online Store 2.0 themes).
 *  3. <meta name="theme-color">.
 *  4. The most used saturated color in the page's inline styles.
 *
 * The popup shows light text on the primary color and dark text on the
 * accent color, so primary is darkened and accent lightened until both read well.
 */

type RGB = [number, number, number];

export type BrandColorsResult =
  | { ok: true; primaryColor: string; accentColor: string; source: string }
  | { ok: false; reason: "password" | "unreachable" | "not_found" };

const LIGHT_TEXT: RGB = [245, 238, 234]; // popup text on the primary color (#f5eeea)
const DARK_TEXT: RGB = [17, 21, 28]; // button text on the accent color (#11151c)

function parseColor(raw: string): RGB | null {
  const v = raw.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})\b/);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
  }
  // "rgb(255 0 0 / 1)", "rgb(255, 0, 0)" or the bare "255, 0, 0" Dawn uses
  m = v.match(/^(?:rgba?\()?\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
  if (m) {
    const c = [m[1], m[2], m[3]].map(Number);
    if (c.every((n) => n <= 255)) return c as RGB;
  }
  return null;
}

const hex = (c: RGB) => "#" + c.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");

function luminance([r, g, b]: RGB) {
  const ch = (n: number) => {
    const s = n / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrast(a: RGB, b: RGB) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** 0 = gray, 1 = fully saturated. */
function saturation([r, g, b]: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

/** Darken (towards black) or lighten (towards white) until `text` reads on it. */
function readable(c: RGB, text: RGB, towards: RGB, min = 4.5): RGB {
  let out = c;
  for (let t = 0; t <= 1 && contrast(out, text) < min; t += 0.05) out = mix(c, towards, t);
  return out;
}

const isNearWhite = (c: RGB) => luminance(c) > 0.85;
const isGray = (c: RGB) => saturation(c) < 0.15;

/** Candidate brand colors found in the page, best first. Exported for tests. */
export function colorsFromHtml(html: string): { colors: RGB[]; source: string } {
  const embed = html.match(/<script[^>]+id="gd-brand"[^>]*>([^<]*)<\/script>/);
  if (embed) {
    const found = embed[1]
      .split(",")
      .map(parseColor)
      .filter((c): c is RGB => !!c && !isNearWhite(c));
    if (found.length) return { colors: found, source: "brand" };
  }

  const vars = [
    "color-button",
    "color-base-accent-1",
    "color-btn-primary",
    "color-primary",
    "color-accent",
    "color-base-accent-2",
    "colorBtnPrimary",
    "color-foreground",
    "color-base-text",
  ];
  const theme: RGB[] = [];
  for (const name of vars) {
    const m = html.match(new RegExp(`--${name}\\s*:\\s*([^;}"]{3,40})`));
    const c = m && parseColor(m[1]);
    if (c && !isNearWhite(c)) theme.push(c);
  }
  // Colored values first; grays (e.g. Dawn's default #121212 buttons) only as a fallback.
  if (theme.length) return { colors: [...theme.filter((c) => !isGray(c)), ...theme.filter(isGray)], source: "theme" };

  const meta = html.match(/<meta[^>]+name="theme-color"[^>]+content="([^"]+)"/i);
  const metaColor = meta && parseColor(meta[1]);
  if (metaColor && !isNearWhite(metaColor)) return { colors: [metaColor], source: "theme" };

  const counts = new Map<string, number>();
  for (const style of html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []) {
    for (const m of style.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const c = parseColor(m[0])!;
      if (isNearWhite(c) || isGray(c)) continue;
      counts.set(m[0].toLowerCase(), (counts.get(m[0].toLowerCase()) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { colors: top.map(([h]) => parseColor(h)!), source: "page" };
}

/** Popup colors from candidate brand colors. Exported for tests. */
export function popupColors(colors: RGB[]): { primaryColor: string; accentColor: string } | null {
  if (!colors.length) return null;
  const brand = colors[0];
  // Light brand colors (yellow, gold, pastels) turn muddy when darkened: they
  // become the accent instead, on a near-black tinted with the same hue.
  if (luminance(brand) > 0.35) {
    const dark = colors.slice(1).find((c) => contrast(c, LIGHT_TEXT) >= 4.5);
    const primary = readable(dark ?? mix(brand, [0, 0, 0], 0.82), LIGHT_TEXT, [0, 0, 0]);
    return { primaryColor: hex(primary), accentColor: hex(readable(brand, DARK_TEXT, [255, 255, 255])) };
  }
  const primary = readable(brand, LIGHT_TEXT, [0, 0, 0]);
  // A second colorful candidate that is clearly different makes a better accent than a tint.
  const second = colors.slice(1).find((c) => !isGray(c) && contrast(c, brand) > 1.6);
  let accent = readable(second ?? mix(brand, [255, 255, 255], isGray(brand) ? 0.85 : 0.55), DARK_TEXT, [255, 255, 255]);
  if (contrast(accent, primary) < 3) accent = readable(mix(accent, [255, 255, 255], 0.5), DARK_TEXT, [255, 255, 255]);
  return { primaryColor: hex(primary), accentColor: hex(accent) };
}

export async function fetchStoreColors(shop: string): Promise<BrandColorsResult> {
  let res: Response;
  try {
    res = await fetch(`https://${shop}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "EnigmaPlay-ColorMatch/1.0 (+https://apps.shopify.com/game-discount)" },
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (new URL(res.url).pathname.startsWith("/password")) return { ok: false, reason: "password" };
  if (!res.ok) return { ok: false, reason: "unreachable" };
  const html = (await res.text()).slice(0, 3_000_000);
  const { colors, source } = colorsFromHtml(html);
  const picked = popupColors(colors);
  return picked ? { ok: true, ...picked, source } : { ok: false, reason: "not_found" };
}

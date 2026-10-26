import { BlockStack, InlineGrid, Text } from "@shopify/polaris";
import type { GameType } from "../lib/popup-defaults";

// What each game card says; the drawing below shows the game in the popup's colors.
const CARDS: { value: GameType; name: string; desc: string }[] = [
  { value: "paddle", name: "Paddle & ball", desc: "Keep the ball bouncing until the time runs out." },
  { value: "flipper", name: "Flipper", desc: "Pinball with two flippers. Tap left or right." },
  { value: "pong", name: "Pong", desc: "Beat the computer: first to 3 goals." },
  { value: "wheel", name: "Spin wheel", desc: "One spin. You set the rewards and their chances." },
  { value: "none", name: "Form only", desc: "No game: the code comes right after sign-up." },
];

/** Game choice as a row of picture cards. */
export function GamePicker({
  value,
  onChange,
  games,
  primary,
  accent,
  compact = false,
}: {
  value: GameType;
  onChange: (g: GameType) => void;
  games: GameType[];
  primary: string;
  accent: string;
  compact?: boolean;
}) {
  const cards = CARDS.filter((c) => games.includes(c.value));
  return (
    <div role="radiogroup" aria-label="Game">
      <InlineGrid columns={{ xs: 2, sm: 3, md: cards.length }} gap="300">
        {cards.map((c) => {
          const selected = c.value === value;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(c.value)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                padding: compact ? 6 : 8,
                borderRadius: 12,
                background: selected ? "var(--p-color-bg-surface-selected)" : "var(--p-color-bg-surface)",
                border: selected ? "2px solid var(--p-color-border-emphasis)" : "1px solid var(--p-color-border)",
                margin: selected ? 0 : 1,
                font: "inherit",
                color: "inherit",
              }}
            >
              <BlockStack gap="150">
                <GameThumb game={c.value} primary={primary} accent={accent} />
                <Text as="span" variant="headingSm">
                  {c.name}
                </Text>
                {!compact && (
                  <Text as="span" variant="bodySm" tone="subdued">
                    {c.desc}
                  </Text>
                )}
              </BlockStack>
            </button>
          );
        })}
      </InlineGrid>
    </div>
  );
}

/** A small drawing of the game as it looks in the popup (same colors as the storefront games). */
export function GameThumb({ game, primary, accent }: { game: GameType; primary: string; accent: string }) {
  const ink = "#11151c";
  const light = "#f5eeea";
  const board = (fill: string) => <rect x="12" y="10" width="136" height="80" rx="6" fill={fill} />;
  let inner: JSX.Element;
  switch (game) {
    case "paddle":
      inner = (
        <>
          {board(light)}
          <rect x="18" y="15" width="22" height="9" rx="4.5" fill={ink} />
          <circle cx="96" cy="44" r="5" fill={ink} />
          <rect x="62" y="78" width="36" height="6" rx="3" fill={primary} />
        </>
      );
      break;
    case "flipper":
      inner = (
        <>
          {board("#1b2230")}
          <line x1="12" y1="62" x2="56" y2="80" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          <line x1="148" y1="62" x2="104" y2="80" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          {[
            [56, 34],
            [104, 34],
            [80, 52],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill={primary} stroke={accent} strokeWidth="2" />
          ))}
          <line x1="58" y1="80" x2="74" y2="86" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <line x1="102" y1="80" x2="86" y2="86" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <circle cx="92" cy="24" r="4.5" fill={light} />
        </>
      );
      break;
    case "pong":
      inner = (
        <>
          {board(ink)}
          <line x1="80" y1="14" x2="80" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="5 5" />
          <rect x="20" y="34" width="5" height="24" rx="2.5" fill={accent} />
          <rect x="135" y="46" width="5" height="24" rx="2.5" fill="rgba(232,236,241,0.75)" />
          <rect x="58" y="44" width="7" height="7" fill="#fff" />
          <text x="66" y="28" fontSize="12" fontWeight="700" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">1</text>
          <text x="88" y="28" fontSize="12" fontWeight="700" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">0</text>
        </>
      );
      break;
    case "wheel": {
      const n = 6;
      const r = 38;
      const cx = 80;
      const cy = 51;
      inner = (
        <>
          {Array.from({ length: n }, (_, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n;
            const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n;
            const p = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
            return <path key={i} d={`M${cx} ${cy} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`} fill={i % 2 ? accent : primary} />;
          })}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="7" fill="#fff" />
          <path d={`M${cx - 6} 8 L${cx + 6} 8 L${cx} 19 Z`} fill="#fff" stroke={ink} strokeWidth="1" />
        </>
      );
      break;
    }
    default:
      inner = (
        <>
          <rect x="30" y="16" width="100" height="8" rx="4" fill="rgba(255,255,255,0.85)" />
          <rect x="30" y="32" width="100" height="14" rx="4" fill="#fff" />
          <rect x="30" y="50" width="100" height="14" rx="4" fill="#fff" />
          <rect x="30" y="70" width="100" height="16" rx="4" fill={accent} />
        </>
      );
  }
  return (
    <svg viewBox="0 0 160 100" width="100%" role="img" aria-hidden="true" style={{ display: "block", borderRadius: 8 }}>
      <defs>
        <linearGradient id={`gd-thumb-${game}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={primary} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" rx="8" fill={`url(#gd-thumb-${game})`} />
      <rect width="160" height="100" rx="8" fill="rgba(0,0,0,0.12)" />
      {inner}
    </svg>
  );
}

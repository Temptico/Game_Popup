import { Badge, BlockStack, Button, InlineGrid, InlineStack, Text, TextField } from "@shopify/polaris";
import { WHEEL_MAX_SEGMENTS, type WheelSegment } from "../lib/popup-defaults";

/** Spin wheel rewards: discount + chance per row, the chances' total and a live wheel. */
export function WheelEditor({
  segments,
  onChange,
  unit,
  primary,
  accent,
  error,
}: {
  segments: WheelSegment[];
  onChange: (next: WheelSegment[]) => void;
  unit: string;
  primary: string;
  accent: string;
  error?: string;
}) {
  const total = segments.reduce((t, x) => t + (Number(x.chance) || 0), 0);
  const update = (i: number, key: keyof WheelSegment, v: string) =>
    onChange(segments.map((x, j) => (j === i ? { ...x, [key]: v as unknown as number } : x)));
  const remove = (i: number) => onChange(segments.filter((_, j) => j !== i));
  const add = () => {
    const left = Math.max(0, 100 - total);
    onChange([...segments, { value: 0, chance: left }]);
  };

  return (
    <InlineGrid columns={{ xs: 1, md: ["twoThirds", "oneThird"] }} gap="400">
      <BlockStack gap="300">
        {segments.map((x, i) => (
          <InlineStack key={i} gap="200" blockAlign="end" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label={i === 0 ? "Reward" : `Reward ${i + 1}`}
                labelHidden={i > 0}
                type="number"
                min={0}
                suffix={unit || undefined}
                value={String(x.value)}
                onChange={(v) => update(i, "value", v)}
                autoComplete="off"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextField
                label={i === 0 ? "Chance" : `Chance ${i + 1}`}
                labelHidden={i > 0}
                type="number"
                min={1}
                max={100}
                suffix="%"
                value={String(x.chance)}
                onChange={(v) => update(i, "chance", v)}
                autoComplete="off"
              />
            </div>
            <Button onClick={() => remove(i)} disabled={segments.length <= 1} accessibilityLabel={`Remove reward ${i + 1}`}>
              Remove
            </Button>
          </InlineStack>
        ))}
        <InlineStack gap="300" blockAlign="center">
          <Button onClick={add} disabled={segments.length >= WHEEL_MAX_SEGMENTS}>
            Add reward
          </Button>
          <Badge tone={total === 100 ? "success" : "critical"}>{`Total: ${total}%`}</Badge>
          {total !== 100 && (
            <Text as="span" variant="bodySm" tone="critical">
              The chances must add up to 100%.
            </Text>
          )}
        </InlineStack>
        {error && (
          <Text as="p" tone="critical">
            {error}
          </Text>
        )}
        <Text as="p" variant="bodySm" tone="subdued">
          Each visitor spins once. The wheel shows only these discounts and lands on one using your chances.
        </Text>
      </BlockStack>
      <WheelPreview labels={segments.map((x) => `${x.value}${unit === "%" ? "%" : ""}`)} primary={primary} accent={accent} />
    </InlineGrid>
  );
}

/** The wheel as the storefront draws it: each reward repeated to an even number of at least 6 segments. */
function WheelPreview({ labels, primary, accent }: { labels: string[]; primary: string; accent: string }) {
  const order: number[] = [];
  while (labels.length && (order.length < 6 || order.length % 2)) order.push(...labels.map((_, i) => i));
  const n = order.length || 6;
  const r = 90;
  const c = 100;
  const seg = (Math.PI * 2) / n;
  const p = (a: number, rad = r) => `${c + rad * Math.cos(a)} ${c + rad * Math.sin(a)}`;
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 240, display: "block", margin: "0 auto" }} role="img" aria-label="Wheel preview">
      {order.map((li, i) => {
        const a0 = -Math.PI / 2 - seg / 2 + i * seg;
        const mid = a0 + seg / 2;
        const dark = i % 2 === 0;
        const tx = c + r * 0.66 * Math.cos(mid);
        const ty = c + r * 0.66 * Math.sin(mid);
        return (
          <g key={i}>
            <path d={`M${c} ${c} L${p(a0)} A${r} ${r} 0 0 1 ${p(a0 + seg)} Z`} fill={dark ? primary : accent} />
            <text
              x={tx}
              y={ty}
              fill={dark ? "#f5eeea" : "#11151c"}
              fontSize={n > 8 ? 10 : 13}
              fontWeight="700"
              fontFamily="sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${(mid * 180) / Math.PI + 90} ${tx} ${ty})`}
            >
              {labels[li]}
            </text>
          </g>
        );
      })}
      <circle cx={c} cy={c} r={r} fill="none" stroke="#fff" strokeWidth="3" />
      <circle cx={c} cy={c} r="15" fill="#fff" />
      <circle cx={c} cy={c} r="9" fill={primary} />
      <path d={`M${c - 9} 4 L${c + 9} 4 L${c} 20 Z`} fill="#fff" stroke="#11151c" strokeWidth="1.5" />
    </svg>
  );
}

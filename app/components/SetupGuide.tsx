import { useState } from "react";
import { Badge, BlockStack, Box, Button, Card, InlineStack, ProgressBar, Text } from "@shopify/polaris";
import { GameThumb } from "./GamePicker";

export interface GuideStep {
  title: string;
  text: string;
  done: boolean;
  action: { label: string; onAction?: () => void; url?: string; external?: boolean };
  picture: JSX.Element;
}

/** First-run checklist on the dashboard: one step open at a time, ticks set from real data. */
export function SetupGuide({ steps, onHide }: { steps: GuideStep[]; onHide: () => void }) {
  const done = steps.filter((x) => x.done).length;
  const [open, setOpen] = useState(Math.max(0, steps.findIndex((x) => !x.done)));
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="start">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Get your popup running
            </Text>
            <Text as="p" tone="subdued">
              {done} of {steps.length} done. About 5 minutes.
            </Text>
          </BlockStack>
          <Button variant="plain" onClick={onHide}>
            Hide guide
          </Button>
        </InlineStack>
        <ProgressBar progress={(done / steps.length) * 100} size="small" tone="success" />
        <BlockStack gap="100">
          {steps.map((x, i) => (
            <Box key={x.title} padding="200" borderRadius="200" background={open === i ? "bg-surface-secondary" : undefined}>
              <BlockStack gap="300">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      flex: "none",
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#fff",
                      background: x.done ? "var(--p-color-bg-fill-success)" : "transparent",
                      border: x.done ? "none" : "1.5px dashed var(--p-color-border-secondary)",
                    }}
                  >
                    {x.done ? "✓" : ""}
                  </span>
                  <Text as="span" fontWeight={open === i ? "semibold" : "regular"}>
                    {x.title}
                  </Text>
                  {x.done && <Badge tone="success">Done</Badge>}
                </button>
                {open === i && (
                  <InlineStack gap="400" wrap={false} blockAlign="center">
                    <BlockStack gap="300">
                      <Text as="p">{x.text}</Text>
                      <InlineStack>
                        <Button
                          variant={x.done ? "secondary" : "primary"}
                          onClick={x.action.onAction}
                          url={x.action.url}
                          target={x.action.external ? "_top" : undefined}
                        >
                          {x.action.label}
                        </Button>
                      </InlineStack>
                    </BlockStack>
                    <div style={{ width: 200, flex: "none" }}>{x.picture}</div>
                  </InlineStack>
                )}
              </BlockStack>
            </Box>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

// Small drawings for the steps, in the popup's colors.
export function ColorsPicture({ primary, accent }: { primary: string; accent: string }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" role="img" aria-hidden="true">
      <rect width="200" height="120" rx="10" fill="#f1f2f4" />
      <rect x="40" y="18" width="120" height="84" rx="10" fill={primary} />
      <rect x="58" y="34" width="84" height="8" rx="4" fill="rgba(255,255,255,0.85)" />
      <rect x="66" y="50" width="68" height="6" rx="3" fill={accent} />
      <rect x="58" y="70" width="84" height="16" rx="5" fill={accent} />
      <circle cx="26" cy="36" r="10" fill={primary} stroke="#fff" strokeWidth="2" />
      <circle cx="26" cy="62" r="10" fill={accent} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function PublishPicture() {
  return (
    <svg viewBox="0 0 200 120" width="100%" role="img" aria-hidden="true">
      <rect width="200" height="120" rx="10" fill="#f1f2f4" />
      <rect x="16" y="22" width="168" height="76" rx="10" fill="#fff" stroke="#e3e3e3" />
      <rect x="28" y="36" width="44" height="16" rx="8" fill="#e3e3e3" />
      <text x="50" y="47.5" fontSize="9" textAnchor="middle" fontFamily="sans-serif" fill="#616161">Draft</text>
      <rect x="28" y="62" width="70" height="7" rx="3.5" fill="#e3e3e3" />
      <rect x="118" y="56" width="54" height="24" rx="8" fill="#303030" />
      <text x="145" y="71.5" fontSize="10" textAnchor="middle" fontFamily="sans-serif" fontWeight="700" fill="#fff">Publish</text>
    </svg>
  );
}

/** The theme editor's App embeds panel with our switch turned on. */
export function EmbedPicture() {
  return (
    <svg viewBox="0 0 200 120" width="100%" role="img" aria-hidden="true">
      <rect width="200" height="120" rx="10" fill="#f1f2f4" />
      <rect x="14" y="12" width="172" height="96" rx="8" fill="#fff" stroke="#e3e3e3" />
      <text x="26" y="32" fontSize="10" fontFamily="sans-serif" fontWeight="700" fill="#303030">App embeds</text>
      <rect x="22" y="44" width="156" height="26" rx="6" fill="#f6f6f7" />
      <text x="32" y="60.5" fontSize="9" fontFamily="sans-serif" fill="#303030">Kodra Play popup</text>
      <rect x="146" y="50" width="24" height="14" rx="7" fill="#303030" />
      <circle cx="163" cy="57" r="5" fill="#fff" />
      <rect x="128" y="82" width="46" height="18" rx="6" fill="#303030" />
      <text x="151" y="94" fontSize="9" textAnchor="middle" fontFamily="sans-serif" fontWeight="700" fill="#fff">Save</text>
    </svg>
  );
}

export { GameThumb };

import type { ReactNode } from "react";
import { Icon, InlineStack, Text, Tooltip } from "@shopify/polaris";
import { InfoIcon } from "@shopify/polaris-icons";

/**
 * A field label with a small (i): the explanation opens on hover, or on a
 * tap/click (focus), instead of help text under every field.
 */
export function InfoLabel({ children, info }: { children: ReactNode; info: ReactNode }) {
  return (
    <InlineStack gap="100" blockAlign="center" wrap={false}>
      <span>{children}</span>
      <Tooltip content={info} preferredPosition="above" width="wide">
        <span
          role="button"
          tabIndex={0}
          aria-label="More info"
          // Inside a checkbox label a click would toggle the checkbox: only open the tip.
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{ display: "inline-flex", cursor: "help", color: "var(--p-color-icon-secondary)" }}
        >
          <Icon source={InfoIcon} tone="subdued" />
        </span>
      </Tooltip>
    </InlineStack>
  );
}

/** A small heading that splits a long settings form into groups. */
export function FormSection({ children }: { children: ReactNode }) {
  return (
    <div style={{ paddingTop: 8 }}>
      <Text as="h3" variant="headingSm">
        {children}
      </Text>
    </div>
  );
}

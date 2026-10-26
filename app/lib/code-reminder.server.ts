/**
 * Code reminder: each winner's code is saved on their Shopify customer, so the
 * merchant's own email tool (Shopify Flow + Shopify Email, Klaviyo, …) can
 * remind them before it expires. The app sends no email itself.
 *
 * - Metafields (namespace kodra_play): code, value, link (opens the store with
 *   the code applied), expires_at (when the code expires).
 * - Tag "kodra-code" while the code is unused; swapped for "kodra-code-used"
 *   once an order uses it (a Flow condition checks the tag before sending).
 */

interface AdminApi {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}

export const NAMESPACE = "kodra_play";
export const TAG_UNUSED = "kodra-code";
export const TAG_USED = "kodra-code-used";

const FIELDS = [
  { key: "code", name: "Kodra Play code", type: "single_line_text_field", description: "The discount code the customer won." },
  { key: "value", name: "Kodra Play reward", type: "single_line_text_field", description: "What the code is worth, e.g. 15%." },
  { key: "link", name: "Kodra Play link", type: "url", description: "Opens the store with the code already applied." },
  { key: "expires_at", name: "Kodra Play code expires", type: "date_time", description: "When the code stops working." },
] as const;

// Definitions make the fields show up by name in the customer page, Flow and email tools.
const defined = new Set<string>();
async function ensureDefinitions(admin: AdminApi, shop: string) {
  if (defined.has(shop)) return;
  for (const f of FIELDS) {
    const res = await admin.graphql(
      `#graphql
      mutation KodraCodeDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) { userErrors { code message } }
      }`,
      { variables: { definition: { ownerType: "CUSTOMER", namespace: NAMESPACE, key: f.key, name: f.name, type: f.type, description: f.description } } },
    );
    const errors: { code?: string }[] = (await res.json()).data?.metafieldDefinitionCreate?.userErrors ?? [];
    // TAKEN = already defined on an earlier run; anything else is logged, the values are saved anyway.
    if (errors.some((e) => e.code !== "TAKEN")) console.warn(`[reminder] ${shop} definition ${f.key}: ${JSON.stringify(errors)}`);
  }
  defined.add(shop);
}

/** Saves a freshly won code on the customer and tags them as holding an unused code. */
export async function saveCodeOnCustomer(
  admin: AdminApi,
  shop: string,
  customerId: string,
  { code, value, expiresAt }: { code: string; value: string | null; expiresAt: Date | null },
) {
  await ensureDefinitions(admin, shop);
  const metafields = [
    { key: "code", type: "single_line_text_field", value: code },
    { key: "value", type: "single_line_text_field", value: value || code },
    { key: "link", type: "url", value: `https://${shop}/discount/${encodeURIComponent(code)}` },
    ...(expiresAt ? [{ key: "expires_at", type: "date_time", value: expiresAt.toISOString() }] : []),
  ].map((m) => ({ ...m, ownerId: customerId, namespace: NAMESPACE }));
  const res = await admin.graphql(
    `#graphql
    mutation KodraSaveCode($metafields: [MetafieldsSetInput!]!, $id: ID!, $add: [String!]!, $remove: [String!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
      tagsAdd(id: $id, tags: $add) { userErrors { message } }
      tagsRemove(id: $id, tags: $remove) { userErrors { message } }
    }`,
    { variables: { metafields, id: customerId, add: [TAG_UNUSED], remove: [TAG_USED] } },
  );
  const data = (await res.json()).data ?? {};
  const errors = [...(data.metafieldsSet?.userErrors ?? []), ...(data.tagsAdd?.userErrors ?? [])];
  if (errors.length) console.warn(`[reminder] ${shop} save: ${JSON.stringify(errors)}`);
}

/** The code was used in an order: no reminder any more. */
export async function markCodeUsed(admin: AdminApi, shop: string, customerId: string) {
  const res = await admin.graphql(
    `#graphql
    mutation KodraCodeUsed($id: ID!, $add: [String!]!, $remove: [String!]!) {
      tagsRemove(id: $id, tags: $remove) { userErrors { message } }
      tagsAdd(id: $id, tags: $add) { userErrors { message } }
    }`,
    { variables: { id: customerId, add: [TAG_USED], remove: [TAG_UNUSED] } },
  );
  const data = (await res.json()).data ?? {};
  const errors = [...(data.tagsRemove?.userErrors ?? []), ...(data.tagsAdd?.userErrors ?? [])];
  if (errors.length) console.warn(`[reminder] ${shop} used: ${JSON.stringify(errors)}`);
}

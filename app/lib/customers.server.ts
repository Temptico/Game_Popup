interface AdminApi {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}

const TAGS = ["gamediscount"];

function consentInput() {
  return {
    marketingState: "SUBSCRIBED",
    marketingOptInLevel: "SINGLE_OPT_IN",
    consentUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Creates the visitor as a Shopify customer, or tags + (optionally) subscribes
 * an existing one. Uses the Admin GraphQL API so it works on every plan and
 * doesn't depend on the theme's /contact form.
 */
export async function upsertCustomer(
  admin: AdminApi,
  { email, firstName, consent }: { email: string; firstName: string; consent: boolean },
): Promise<{ ok: boolean; created: boolean; error?: string }> {
  const createRes = await admin.graphql(
    `#graphql
    mutation GameDiscountCustomerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        input: {
          email,
          firstName,
          tags: TAGS,
          ...(consent ? { emailMarketingConsent: consentInput() } : {}),
        },
      },
    },
  );
  const createJson = await createRes.json();
  const created = createJson.data?.customerCreate;
  if (created?.customer?.id) return { ok: true, created: true };

  const errors: { field: string[] | null; message: string }[] = created?.userErrors ?? [];
  const taken = errors.some(
    (e) => e.field?.includes("email") && /taken/i.test(e.message),
  );
  if (!taken) {
    return { ok: false, created: false, error: errors.map((e) => e.message).join("; ") };
  }

  // Existing customer: look them up, tag them, and record consent if given.
  // Never downgrade consent and never overwrite their stored name.
  const findRes = await admin.graphql(
    `#graphql
    query GameDiscountCustomerFind($query: String!) {
      customers(first: 1, query: $query) { nodes { id } }
    }`,
    { variables: { query: `email:"${email.replace(/"/g, "")}"` } },
  );
  const findJson = await findRes.json();
  const id: string | undefined = findJson.data?.customers?.nodes?.[0]?.id;
  if (!id) return { ok: false, created: false, error: "Customer lookup failed" };

  await admin.graphql(
    `#graphql
    mutation GameDiscountTag($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) { userErrors { message } }
    }`,
    { variables: { id, tags: TAGS } },
  );

  if (consent) {
    await admin.graphql(
      `#graphql
      mutation GameDiscountConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
        customerEmailMarketingConsentUpdate(input: $input) {
          userErrors { field message }
        }
      }`,
      { variables: { input: { customerId: id, emailMarketingConsent: consentInput() } } },
    );
  }

  return { ok: true, created: false };
}

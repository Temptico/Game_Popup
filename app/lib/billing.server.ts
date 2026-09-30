interface AdminApi {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}

/**
 * Development stores (incl. the ones Shopify's app reviewers use) can only
 * accept test charges, so charges there are always test charges. Live stores
 * get real charges unless BILLING_TEST=true forces test mode everywhere.
 */
export async function shouldUseTestCharges(admin: AdminApi): Promise<boolean> {
  if (process.env.BILLING_TEST === "true") return true;
  const res = await admin.graphql(`#graphql
    query GameDiscountShopPlan { shop { plan { partnerDevelopment } } }`);
  const json = await res.json();
  return json.data?.shop?.plan?.partnerDevelopment === true;
}

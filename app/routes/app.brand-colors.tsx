import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { fetchStoreColors } from "../lib/brand-colors.server";

// "Use my store colors" in the popup editor: popup colors that match the shop's theme.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json(await fetchStoreColors(session.shop));
};

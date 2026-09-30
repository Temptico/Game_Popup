import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";
import { Link, Outlet, useLoaderData, useLocation, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import brandStyles from "../styles/brand.css?url";

import { authenticate } from "../shopify.server";
import { rememberEmbeddedContext } from "../lib/embedded-context";
import { billingEnabled } from "../lib/billing.server";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  // After Polaris so the brand tokens win.
  { rel: "stylesheet", href: brandStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "", billing: billingEnabled() };
};

export default function App() {
  const { apiKey, billing } = useLoaderData<typeof loader>();
  const location = useLocation();
  useEffect(() => {
    rememberEmbeddedContext(location.search, location.pathname);
  }, [location.search, location.pathname]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Popups
        </Link>
        <Link to="/app/analytics">Analytics</Link>
        {billing && <Link to="/app/plans">Plans</Link>}
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";

export default function EmbeddedPage() {
  const app = createApp({
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
    shopOrigin: new URLSearchParams(window.location.search).get("shop"),
    forceRedirect: true,
  });

  // Optional: Redirect inside iframe if needed
  const redirect = Redirect.create(app);
}

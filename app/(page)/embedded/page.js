// import createApp from "@shopify/app-bridge";
// import { Redirect } from "@shopify/app-bridge/actions";

// export default function EmbeddedPage() {
//   const app = createApp({
//     apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
//     shopOrigin: new URLSearchParams(window.location.search).get("shop"),
//     forceRedirect: true,
//   });

//   // Optional: Redirect inside iframe if needed
//   const redirect = Redirect.create(app);
// }
"use client"; // <-- ensures this runs only in the browser

import createApp from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";
import { useEffect } from "react";

export default function EmbeddedPage() {
  useEffect(() => {
    const app = createApp({
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
      shopOrigin: new URLSearchParams(window.location.search).get("shop"),
      forceRedirect: true,
    });

    // Optional: Redirect inside iframe
    const redirect = Redirect.create(app);
    // Example redirect
    // redirect.dispatch(Redirect.Action.APP, "/");
  }, []);

  return <div>Loading embedded page...</div>;
}

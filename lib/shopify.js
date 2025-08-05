// /lib/shopify.js
// import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
// import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

// export const shopify = shopifyApi({
//   apiKey: "af007a7bfe55c54e1fdf9274dc677bad",
//   apiSecretKey: "88b7113c9858014114151fd304f1f649",
//   scopes: [
//     "read_products",
//     "write_products",
//     "read_orders",
//     "write_orders",
//     "read_customers",
//     "write_customers",
//   ],
//   hostName: "my-operator.vercel.app", // <-- make sure NO trailing slash and NO "https://"
//   isEmbeddedApp: false,
//   apiVersion: LATEST_API_VERSION,
//   sessionStorage: new MemorySessionStorage(),
// });

// lib/shopify.js

// lib/shopify.js

import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import nodeAdapter from "@shopify/shopify-api/adapters/node/adapter.js"; // ✅ correct
// ✅ FIXED: use default export

// Set the runtime adapter for Node.js (required)
shopifyApi.adapters.set(nodeAdapter);

// Shopify app configuration
const shopify = shopifyApi({
  apiKey: "af007a7bfe55c54e1fdf9274dc677bad", // ✅ your app API key
  apiSecretKey: "88b7113c9858014114151fd304f1f649", // ✅ your app secret
  scopes: [
    "read_products",
    "write_products",
    "read_orders",
    "write_orders",
    "read_customers",
    "write_customers",
  ],
  hostName: "my-operator.vercel.app", // ✅ your deployed domain or ngrok domain (no https://)
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

export default shopify;

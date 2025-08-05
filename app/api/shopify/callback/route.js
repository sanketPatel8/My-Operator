// import crypto from "crypto";
// import { connectDB } from "@/lib/db";

// const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
// const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const shop = searchParams.get("shop");
//     const code = searchParams.get("code");
//     const hmac = searchParams.get("hmac");

//     console.log("🔁 Callback Params:", { shop, code, hmac });

//     if (!shop || !code || !hmac) {
//       return new Response("❌ Missing parameters", { status: 400 });
//     }

//     // HMAC Verification
//     const params = Object.fromEntries(searchParams);
//     const message = Object.keys(params)
//       .filter((key) => key !== "hmac" && key !== "signature")
//       .sort()
//       .map((key) => `${key}=${params[key]}`)
//       .join("&");

//     const generatedHmac = crypto
//       .createHmac("sha256", SHOPIFY_API_SECRET)
//       .update(message)
//       .digest("hex");

//     const safeCompare = (a, b) =>
//       crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

//     if (!safeCompare(generatedHmac, hmac)) {
//       return new Response("❌ HMAC validation failed", { status: 403 });
//     }

//     // Exchange code for access token
//     const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         client_id: SHOPIFY_API_KEY,
//         client_secret: SHOPIFY_API_SECRET,
//         code,
//       }),
//     });

//     // Debug raw response
//     console.log("📥 Raw token response:", tokenRes.status, tokenRes.statusText);

//     let tokenData;
//     try {
//       tokenData = await tokenRes.json();
//       console.log("🔐 Token Response JSON:", tokenData);
//     } catch (jsonErr) {
//       console.error("❌ Error parsing token JSON:", jsonErr);
//       const errorText = await tokenRes.text();
//       console.error("🔴 Raw token response body:", errorText);
//       return new Response("❌ Failed to parse access token", { status: 500 });
//     }

//     if (!tokenRes.ok || !tokenData.access_token) {
//       return new Response("❌ Failed to retrieve access token", {
//         status: 500,
//       });
//     }

//     const accessToken = tokenData.access_token;

//     // Save to DB
//     const db = await connectDB();

//     const [result] = await db.execute(
//       `INSERT INTO shopify (shop, access_token)
//        VALUES (?, ?)
//        ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
//       [shop, accessToken]
//     );

//     const [rows] = await db.execute("SELECT * FROM shopify WHERE shop = ?", [
//       shop,
//     ]);

//     const insertedShop = rows[0];

//     console.log("✅ Shop saved to DB:", insertedShop);

//     return new Response(
//       JSON.stringify({
//         message: "✅ App installed successfully",
//         data: insertedShop,
//       }),
//       {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );
//   } catch (error) {
//     console.error("❌ Callback Error:", error);
//     return new Response("❌ Internal server error 2", { status: 500 });
//   }
// }

// import crypto from "crypto";

// const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
// const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const shop = searchParams.get("shop");
//     const code = searchParams.get("code");
//     const hmac = searchParams.get("hmac");

//     console.log("🔁 Callback Params:", { shop, code, hmac });

//     if (!shop || !code || !hmac) {
//       return new Response("❌ Missing parameters", { status: 400 });
//     }

//     // HMAC Verification
//     const params = Object.fromEntries(searchParams);
//     const message = Object.keys(params)
//       .filter((key) => key !== "hmac" && key !== "signature")
//       .sort()
//       .map((key) => `${key}=${params[key]}`)
//       .join("&");

//     const generatedHmac = crypto
//       .createHmac("sha256", SHOPIFY_API_SECRET)
//       .update(message)
//       .digest("hex");

//     const safeCompare = (a, b) =>
//       crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

//     if (!safeCompare(generatedHmac, hmac)) {
//       return new Response("❌ HMAC validation failed", { status: 403 });
//     }

//     // Exchange code for access token
//     const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         client_id: SHOPIFY_API_KEY,
//         client_secret: SHOPIFY_API_SECRET,
//         code,
//       }),
//     });

//     console.log("📥 Raw token response:", tokenRes.status, tokenRes.statusText);

//     let tokenData;
//     try {
//       tokenData = await tokenRes.json();
//       console.log("🔐 Token Response JSON:", tokenData);
//     } catch (jsonErr) {
//       console.error("❌ Error parsing token JSON:", jsonErr);
//       const errorText = await tokenRes.text();
//       console.error("🔴 Raw token response body:", errorText);
//       return new Response("❌ Failed to parse access token", { status: 500 });
//     }

//     if (!tokenRes.ok || !tokenData.access_token) {
//       return new Response("❌ Failed to retrieve access token", {
//         status: 500,
//       });
//     }

//     return new Response(
//       JSON.stringify({
//         message: "✅ App installed successfully",
//         shop,
//         access_token: tokenData.access_token,
//       }),
//       {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );
//   } catch (error) {
//     console.error("❌ Callback Error:", error);
//     return new Response("❌ Internal server error", { status: 500 });
//   }
// }

// /api/shopify/callback/route.js

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);
//   const shop = searchParams.get("shop");
//   const code = searchParams.get("code");
//   const state = searchParams.get("state");
//   const hmac = searchParams.get("hmac");

//   if (!shop || !code || !hmac) {
//     return new Response("❌ Missing required parameters", { status: 400 });
//   }

//   const accessTokenRes = await fetch(
//     `https://${shop}/admin/oauth/access_token`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         client_id: process.env.SHOPIFY_API_KEY,
//         client_secret: process.env.SHOPIFY_API_SECRET,
//         code,
//       }),
//     }
//   );

//   const tokenData = await accessTokenRes.json();

//   if (!tokenData.access_token) {
//     return new Response("❌ Failed to get access token", { status: 500 });
//   }

//   // ✅ Optionally log or debug
//   console.log("✅ Access Token:", tokenData.access_token);
//   console.log("✅ Shop:", shop);

//   // ✅ Redirect to frontend with shop info (or any custom page)
//   const redirectUrl = `https://my-operator.vercel.app/api/shopify/install?shop=${shop}`;
//   return Response.redirect(redirectUrl, 302);
// }

import crypto from "crypto";
import { connectDB } from "@/lib/db";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const code = searchParams.get("code");
    const hmac = searchParams.get("hmac");

    if (!shop || !code || !hmac) {
      return new Response("❌ Missing parameters", { status: 400 });
    }

    // HMAC validation
    const params = Object.fromEntries(searchParams);
    const message = Object.keys(params)
      .filter((key) => key !== "hmac" && key !== "signature")
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const generatedHmac = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(message)
      .digest("hex");

    const isValidHmac = crypto.timingSafeEqual(
      Buffer.from(generatedHmac, "utf-8"),
      Buffer.from(hmac, "utf-8")
    );

    if (!isValidHmac) {
      return new Response("❌ Invalid HMAC", { status: 403 });
    }

    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("🔴 Failed to get access token:", tokenData);
      return new Response("❌ Failed to get access token", { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // Save to DB
    const db = await connectDB();
    await db.execute(
      `INSERT INTO shops (shop, access_token)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
      [shop, accessToken]
    );
    db.release();

    // Optional: redirect to frontend with success
    return Response.redirect(
      `https://my-operator.vercel.app/?shop=${shop}`,
      302
    );
  } catch (error) {
    console.error("❌ Callback error:", error);
    return new Response("❌ Internal server error", { status: 500 });
  }
}

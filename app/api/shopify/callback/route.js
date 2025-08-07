// import crypto from "crypto";
// import { connectDB } from "@/lib/db"; // ✅ updated import

// const SHOPIFY_API_KEY = "af007a7bfe55c54e1fdf9274dc677bad";
// const SHOPIFY_API_SECRET = "88b7113c9858014114151fd304f1f649";

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);

//     const shop = searchParams.get("shop");
//     const code = searchParams.get("code");
//     const hmac = searchParams.get("hmac");

//     if (!shop || !code || !hmac) {
//       return new Response("❌ Missing parameters", { status: 400 });
//     }

//     // 🔐 HMAC verification
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

//     // 🔄 Exchange code for access token
//     const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         client_id: SHOPIFY_API_KEY,
//         client_secret: SHOPIFY_API_SECRET,
//         code,
//       }),
//     });

//     const tokenData = await tokenRes.json();

//     if (!tokenRes.ok || !tokenData.access_token) {
//       console.error("Token Error:", tokenData);
//       return new Response("❌ Failed to retrieve access token", {
//         status: 500,
//       });
//     }

//     const accessToken = tokenData.access_token;

//     // ✅ MySQL insert/update
//     const db = await connectDB(); // ⬅️ Connect MySQL
//     const [result] = await db.execute(
//       `INSERT INTO stores (shop, access_token)
//    VALUES (?, ?)
//    ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
//       [shop, accessToken]
//     );

//     // Optional: insertId only applies to fresh inserts (not updates)
//     const insertId = result.insertId;

//     // Always fetch the final inserted/updated row
//     const [rows] = await db.execute(`SELECT * FROM stores WHERE shop = ?`, [
//       shop,
//     ]);

//     const insertedShop = rows[0];

//     console.log("✅ Saved to DB:", shop);

//     return new Response(
//       JSON.stringify({
//         message: `✅ App installed successfully: ${shop}`,
//         data: insertedShop,
//       }),
//       {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );
//   } catch (err) {
//     console.error("Callback error:", err);
//     return new Response("❌ Internal Server Error", { status: 500 });
//   }
// }

import crypto from "crypto";
import { connectDB } from "@/lib/db";

const SHOPIFY_API_KEY = "af007a7bfe55c54e1fdf9274dc677bad";
const SHOPIFY_API_SECRET = "88b7113c9858014114151fd304f1f649";

export async function GET(req) {
  try {
    console.log("✅ Shopify callback triggered");

    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");
    const code = searchParams.get("code");
    const hmac = searchParams.get("hmac");

    if (!shop || !code || !hmac) {
      console.error("❌ Missing required query parameters");
      return new Response("❌ Missing parameters", { status: 400 });
    }

    // 🔐 HMAC verification
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

    const isValidHmac =
      generatedHmac.length === hmac.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedHmac, "utf-8"),
        Buffer.from(hmac, "utf-8")
      );

    if (!isValidHmac) {
      console.error("❌ HMAC validation failed");
      return new Response("❌ Invalid HMAC", { status: 403 });
    }

    // 🔄 Exchange code for access token (optional: only if needed)
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

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("❌ Failed to retrieve access token", tokenData);
      return new Response("❌ Failed to retrieve access token", {
        status: 500,
      });
    }

    const accessToken = tokenData.access_token;

    const db = await connectDB(); // ⬅️ Connect MySQL

    try {
      const [result] = await db.execute(
        `INSERT INTO stores (shop, access_token)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
        [shop, accessToken]
      );

      // Always fetch the final inserted/updated row
      const [rows] = await db.execute(`SELECT * FROM shopify WHERE shop = ?`, [
        shop,
      ]);

      const insertedShop = rows[0];

      return new Response(
        JSON.stringify({
          status: 200,
          message: "✅ App installed successfully",
          dbData: insertedShop,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ DB Insert Result:", result);
    } catch (dbErr) {
      console.error("❌ DB Insert Error:", dbErr);
    }

    console.log("✅ App installed successfully for shop:", shop);
  } catch (err) {
    console.error("❌ Internal Server Error in callback:", err);
    return new Response("❌ Internal Server Error", { status: 500 });
  }
}

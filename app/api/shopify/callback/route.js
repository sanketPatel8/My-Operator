import crypto from "crypto";
import { connectDB } from "@/lib/db"; // ✅ updated import

const SHOPIFY_API_KEY = "af007a7bfe55c54e1fdf9274dc677bad";
const SHOPIFY_API_SECRET = "88b7113c9858014114151fd304f1f649";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const shop = searchParams.get("shop");
    const code = searchParams.get("code");
    const hmac = searchParams.get("hmac");

    if (!shop || !code || !hmac) {
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

    const safeCompare = (a, b) =>
      crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

    if (!safeCompare(generatedHmac, hmac)) {
      return new Response("❌ HMAC validation failed", { status: 403 });
    }

    // 🔄 Exchange code for access token
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
      console.error("Token Error:", tokenData);
      return new Response("❌ Failed to retrieve access token", {
        status: 500,
      });
    }

    const accessToken = tokenData.access_token;

    // ✅ MySQL insert/update
    const db = await connectDB(); // ⬅️ Connect MySQL
    const [result] = await db.execute(
      `INSERT INTO shopify (shop, access_token)
   VALUES (?, ?)
   ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
      [shop, accessToken]
    );

    // Optional: insertId only applies to fresh inserts (not updates)
    const insertId = result.insertId;

    // Always fetch the final inserted/updated row
    const [rows] = await db.execute(`SELECT * FROM shopify WHERE shop = ?`, [
      shop,
    ]);

    const insertedShop = rows[0];

    console.log("✅ Saved to DB:", shop);

    return new Response(
      JSON.stringify({
        message: `✅ App installed successfully: ${shop}`,
        data: insertedShop,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Callback error:", err);
    return new Response("❌ Internal Server Error", { status: 500 });
  }
}

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

    console.log(shop, code, hmac, "shop , code , hmac");

    if (!shop || !code || !hmac) {
      return new Response("❌ Missing parameters", { status: 400 });
    }

    // HMAC Verification
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

    // Exchange code for token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    console.log(tokenData, "tokenData");

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("❌ Token error:", tokenData);
      return new Response("❌ Failed to retrieve access token", {
        status: 500,
      });
    }

    const accessToken = tokenData.access_token;

    // Save to DB
    const db = await connectDB();
    const [result] = await db.execute(
      `INSERT INTO shops (shop, access_token)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
      [shop, accessToken]
    );

    const [rows] = await db.execute("SELECT * FROM shops WHERE shop = ?", [
      shop,
    ]);

    const insertedShop = rows[0];

    console.log("✅ Shop saved:", shop);

    return new Response(
      JSON.stringify({
        message: "✅ App installed successfully",
        data: insertedShop,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Callback Error:", error);
    return new Response("❌ Internal server error", { status: 500 });
  }
}

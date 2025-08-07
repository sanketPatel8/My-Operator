import { connectDB } from "@/lib/db";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

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

    // 🔐 HMAC Verification
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
      console.error("❌ Failed to retrieve access token", tokenData);
      return new Response("❌ Failed to retrieve access token", {
        status: 500,
      });
    }

    const accessToken = tokenData.access_token;

    // ⬇️ Save to MySQL
    const db = await connectDB();
    try {
      await db.execute(
        `INSERT INTO stores (shop, access_token)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), installed_at = NOW()`,
        [shop, accessToken]
      );

      const [rows] = await db.execute(`SELECT * FROM stores WHERE shop = ?`, [
        shop,
      ]);

      console.log("✅ App installed successfully for shop:", shop);

      const redirectUrl = new URL(
        "http://my-operator.vercel.app/ConfigureWhatsApp"
      );
      const decodedToken = atob(accessToken);
      redirectUrl.searchParams.set("shop", shop);
      redirectUrl.searchParams.set("token", decodedToken);

      return Response.redirect(redirectUrl.toString(), 302);

      // return new Response(
      //   JSON.stringify({
      //     message: "✅ App installed successfully",
      //     shopData: rows[0],
      //   }),
      //   {
      //     status: 200,
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //   }
      // );
    } catch (dbErr) {
      console.error("❌ DB Error:", dbErr);
      return new Response("❌ Database error", { status: 500 });
    }
  } catch (err) {
    console.error("❌ Internal Server Error in callback:", err);
    return new Response("❌ Internal Server Error", { status: 500 });
  }
}

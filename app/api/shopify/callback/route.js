// app/api/shopify/callback/route.js
import shopify from "@/lib/shopify";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const result = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: new NextResponse(),
    });

    const { shop, accessToken, scope } = result;

    console.log("✅ Auth Success:");
    console.log({ shop, accessToken, scope });

    return NextResponse.redirect(`https://${shop}/admin/apps`);
  } catch (err) {
    console.error("❌ Auth Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

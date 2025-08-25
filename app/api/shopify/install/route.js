// ✅ File: /app/api/shopify/install/route.js

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);
//   const shop = searchParams.get("shop");

//   if (!shop) {
//     return new Response("Missing shop parameter", { status: 400 });
//   }

//   const clientId = process.env.SHOPIFY_API_KEY;
//   const redirectUri = "https://my-operator.vercel.app/api/shopify/callback";
//   const scopes = "read_products,write_orders,read_customers";
//   const state = "secure123"; // optional security value

//   const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

//   return Response.redirect(installUrl, 302);
// }

// app/api/shopify/install/route.js

import { NextResponse } from "next/server";

import { writeFile } from "fs/promises";

import path from "path";

export async function POST(request) {
  try {
    const raw = await request.text(); // raw JSON body

    const ts = new Date().toISOString().replace(/[:.]/g, "-");

    const filepath = path.join("/tmp", `shopify_install_${ts}.txt`); // /tmp is writable on serverless

    await writeFile(filepath, raw + "\n", { flag: "a" });

    return NextResponse.json({ ok: true, saved_to: filepath });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method Not Allowed" },
    { status: 405 }
  );
}

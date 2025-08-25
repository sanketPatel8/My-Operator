// ✅ File: /app/api/shopify/install/route.js

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const redirectUri = "https://my-operator.vercel.app/api/shopify/callback";
  const scopes = "read_products,write_orders,read_customers";
  const state = "secure123"; // optional security value

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  return Response.redirect(installUrl, 302);
}

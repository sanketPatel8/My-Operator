// /app/api/shopify/install/route.js

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  console.log(shop, "shop");

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const redirectUri = `${process.env.HOST}/api/shopify/callback`;
  const scopes = process.env.SHOPIFY_SCOPES;
  const state = "secure123";

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

  return Response.redirect(installUrl, 302);
}
